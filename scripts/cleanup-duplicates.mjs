#!/usr/bin/env node

/**
 * Cleanup Duplicate Supabase Entries
 * =====================================
 *
 * Finds duplicate entries in nursing_applications based on phone OR
 * license_number, keeps only the earliest (lowest ID), and deletes the rest.
 * Cascades to survey_responses, user_profiles, pnc_license_data, survey_answers.
 *
 * Usage:
 *   node scripts/cleanup-duplicates.mjs        # Dry run (just reports)
 *   node scripts/cleanup-duplicates.mjs --exec  # Actually deletes
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ecxohbfvpmdgfiylkxpc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('  ✗ SUPABASE_SERVICE_KEY environment variable is required');
  console.error('  Usage: SUPABASE_SERVICE_KEY=... node scripts/cleanup-duplicates.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const DRY_RUN = !process.argv.includes('--exec');

async function main() {
  console.log(`\n  ${DRY_RUN ? '🔍 DRY RUN' : '🗑️  EXECUTING'} — Remove duplicate nursing applications\n`);

  // Fetch all records
  const { data, error } = await supabase
    .from('nursing_applications')
    .select('id, full_name, phone, license_number, created_at')
    .order('id');

  if (error) {
    console.error('  ✗ Failed to fetch records:', error.message);
    process.exit(1);
  }

  // Group duplicates by phone and license
  const byPhone = {};
  const byLicense = {};
  for (const r of data) {
    const p = (r.phone || '').trim();
    const l = (r.license_number || '').trim();
    if (p) {
      byPhone[p] = byPhone[p] || [];
      byPhone[p].push(r);
    }
    if (l) {
      byLicense[l] = byLicense[l] || [];
      byLicense[l].push(r);
    }
  }

  // Collect IDs to keep (lowest ID per group)
  const idsToKeep = new Set();
  const duplicateGroups = [];

  const processGroup = (key, entries, matchType) => {
    if (entries.length <= 1) return;
    const sorted = entries.sort((a, b) => a.id - b.id);
    const keep = sorted[0];
    const remove = sorted.slice(1);
    idsToKeep.add(keep.id);
    duplicateGroups.push({
      key,
      matchType,
      keep,
      remove: remove.map(r => r.id),
      names: [...new Set(entries.map(e => e.full_name))],
    });
  };

  for (const [phone, entries] of Object.entries(byPhone)) {
    processGroup(phone, entries, 'phone');
  }
  for (const [lic, entries] of Object.entries(byLicense)) {
    processGroup(lic, entries, 'license');
  }

  // Merge groups by person (same keep ID may appear in both phone + license groups)
  // Collect all IDs to remove (any group that isn't the kept one)
  const toRemove = new Set();
  const keptIds = new Set();

  for (const group of duplicateGroups) {
    keptIds.add(group.keep.id);
    for (const id of group.remove) {
      toRemove.add(id);
    }
  }

  // Remove kept IDs from toRemove (in case a kept ID appears in another group's remove list)
  for (const id of keptIds) {
    toRemove.delete(id);
  }

  const removeList = [...toRemove].sort((a, b) => a - b);

  console.log(`  Total records: ${data.length}`);
  console.log(`  To remove:     ${removeList.length}`);
  console.log(`  To keep:       ${data.length - removeList.length}\n`);

  if (removeList.length === 0) {
    console.log('  ✅ No duplicates found.\n');
    return;
  }

  // Report groups
  console.log('  ─── Duplicate Groups ───\n');
  for (const group of duplicateGroups) {
    const byMatch = group.matchType === 'phone' ? '📞' : '🪪';
    console.log(`  ${byMatch} ${group.names.join(', ')}`);
    console.log(`     Keep: #${group.keep.id} (${group.keep.created_at?.slice(0, 10) || '?'})`);
    console.log(`     Remove: ${group.remove.length} entries (IDs: ${group.remove.join(', ')})`);
    console.log('');
  }

  console.log(`  IDs to remove: [${removeList.join(', ')}]\n`);

  if (DRY_RUN) {
    console.log('  🔍 Dry run — no changes made.');
    console.log('     Run with --exec to actually delete.\n');
    return;
  }

  // Delete in batches (Supabase `in` filter has limits)
  const BATCH = 20;
  let totalDeleted = 0;

  for (let i = 0; i < removeList.length; i += BATCH) {
    const batch = removeList.slice(i, i + BATCH);
    const { error: delErr, count } = await supabase
      .from('nursing_applications')
      .delete({ count: 'exact' })
      .in('id', batch);

    if (delErr) {
      console.error(`  ✗ Error deleting batch [${batch.join(',')}]: ${delErr.message}`);
    } else {
      totalDeleted += count || batch.length;
      console.log(`  ✓ Deleted batch ${i + 1}-${i + batch.length}: ${count || batch.length} rows`);
    }

    // Small delay between batches
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n  ✅ Total deleted: ${totalDeleted} rows\n`);
}

main().catch(console.error);
