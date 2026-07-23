#!/usr/bin/env node

/**
 * WhatsApp Outreach Automation
 * =============================
 *
 * Reads whatsapp-sent.csv, sends recruitment messages via WhatsApp Web
 * to pending contacts using Playwright.
 *
 * Usage:
 *   node scripts/whatsapp-outreach.mjs          # Live mode
 *   node scripts/whatsapp-outreach.mjs --dry-run # Stats only
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.resolve(PROJECT_ROOT, 'whatsapp-sent.csv');
const WHATSAPP_PROFILE = path.resolve(PROJECT_ROOT, '.whatsapp-profile');

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------
const MESSAGE = `🚨 1000+ NURSES REQUIRED IN 10+ COUNTRIES 🚨

Hiring Countries:
🇬🇧 UK  🇨🇦 Canada  🇦🇺 Australia  🇩🇪 Germany  🇸🇦 Saudi Arabia
🇶🇦 Qatar  🇦🇪 UAE  🇺🇸 USA  🇳🇿 New Zealand  🇮🇪 Ireland  + More

✅ 0 PKR PROCESS FEE
✅ High Salary + Benefits
✅ Visa, Accommodation & Flight Support
✅ Fast Deployment

Apply Now: https://nursingcareinfo.github.io/international_nurses/

WhatsApp your CV and PNC👇

Tag your nurse friends! 💉🌍`;

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Parse a CSV line into fields, respecting double-quote escaping.
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Escape a field for CSV output (wrap in quotes if contains comma, quote, or newline).
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Read all contacts from CSV.
 */
function readContacts() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: CSV file not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const contacts = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const contact = {};
    headers.forEach((h, idx) => {
      contact[h.trim()] = fields[idx] !== undefined ? fields[idx].trim() : '';
    });

    contacts.push(contact);
  }

  return contacts;
}

/**
 * Update a single row in the CSV by matching phone+name+designation.
 */
function updateContactStatus(phone, name, designation, newStatus, newDate, newNotes) {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split('\n');
  const headerLine = lines[0];

  let updated = false;

  const outLines = [headerLine];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    // Cols: phone,name,designation,status,date,notes
    const rowPhone = fields[0] || '';
    const rowName = fields[1] || '';
    const rowDesignation = fields[2] || '';

    if (
      rowPhone === phone &&
      rowName.toLowerCase() === name.toLowerCase() &&
      rowDesignation.toLowerCase() === designation.toLowerCase()
    ) {
      // Update this row
      const newRow = [
        rowPhone,
        rowName,
        rowDesignation,
        newStatus || 'pending',
        newDate || '',
        escapeCSVField(newNotes || ''),
      ].join(',');
      outLines.push(newRow);
      updated = true;
    } else {
      // Preserve original
      outLines.push(line);
    }
  }

  if (updated) {
    fs.writeFileSync(CSV_PATH, outLines.join('\n') + '\n', 'utf8');
  } else {
    console.warn(`  ⚠  Could not find row to update: ${phone} / ${name} / ${designation}`);
  }
}

/**
 * Print a summary of contacts grouped by status and designation.
 */
function printStats(contacts) {
  const total = contacts.length;
  const byStatus = {};
  const pendingByDesig = {};

  for (const c of contacts) {
    const st = c.status || 'unknown';
    byStatus[st] = (byStatus[st] || 0) + 1;
    if (st === 'pending') {
      const d = c.designation || 'Unknown';
      pendingByDesig[d] = (pendingByDesig[d] || 0) + 1;
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       WhatsApp Outreach —  STATS         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  Total contacts:    ${total}`);
  console.log('');

  // Breakdown by status
  const statusOrder = ['pending', 'sent', 'invalid', 'failed', 'no-phone', 'no-whatsapp'];
  for (const st of statusOrder) {
    if (byStatus[st]) {
      console.log(`  ${st.padEnd(15)} ${String(byStatus[st]).padStart(4)}`);
    }
  }
  // Any other statuses
  for (const [st, count] of Object.entries(byStatus)) {
    if (!statusOrder.includes(st)) {
      console.log(`  ${st.padEnd(15)} ${String(count).padStart(4)}`);
    }
  }

  console.log('');
  console.log('  ─── Pending by Designation ───');
  console.log('');

  const desigOrder = ['BSN', 'R/N', 'Mid Wife'];
  for (const d of desigOrder) {
    if (pendingByDesig[d]) {
      console.log(`  ${d.padEnd(12)} ${String(pendingByDesig[d]).padStart(4)}`);
    }
  }
  // Any other designations
  for (const [d, count] of Object.entries(pendingByDesig)) {
    if (!desigOrder.includes(d)) {
      console.log(`  ${d.padEnd(12)} ${String(count).padStart(4)}`);
    }
  }

  console.log('');
  console.log(`  Pending total:     ${String(byStatus['pending'] || 0).padStart(4)}`);
  console.log(`  Already sent/invalid/no-phone/no-whatsapp: ${String(((byStatus['sent'] || 0) + (byStatus['invalid'] || 0) + (byStatus['no-phone'] || 0) + (byStatus['no-whatsapp'] || 0) + (byStatus['failed'] || 0))).padStart(4)}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// WhatsApp Web sender
// ---------------------------------------------------------------------------

/**
 * Wait for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a random integer between min and max (inclusive).
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if WhatsApp Web is logged in by looking for the chat list.
 * Returns true if logged in, false if QR code is still visible.
 */
async function isLoggedIn(page) {
  try {
    // Look for the chat list pane (main side panel)
    await page.waitForSelector('#pane-side', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for QR code scan (up to 120 seconds).
 */
async function waitForQRScan(page) {
  console.log('  ⚠  Please scan the QR code to log in to WhatsApp Web');
  console.log('      Waiting up to 120 seconds...');

  for (let i = 0; i < 120; i++) {
    const loggedIn = await isLoggedIn(page);
    if (loggedIn) {
      console.log('  ✓ QR code scanned — logged in!');
      return true;
    }
    await sleep(1000);
  }

  // Final check
  if (await isLoggedIn(page)) {
    console.log('  ✓ Logged in!');
    return true;
  }

  console.error('  ✗ QR code was not scanned within 120 seconds. Exiting.');
  return false;
}

/**
 * Handle the "Use here" dialog on WhatsApp Web.
 * This dialog appears when WhatsApp Web session is active on another device.
 * Returns true if the dialog was handled.
 */
async function handleUseHereDialog(page) {
  try {
    // Look for any element containing "Use here" text (case-insensitive)
    const useHere = await page.locator('text=/use here/i').first();
    if (await useHere.isVisible({ timeout: 3000 })) {
      console.log('  ⚠  "Use here" dialog detected — clicking it...');
      await useHere.click();
      console.log('  ✓ Clicked "Use here" — waiting for navigation...');
      await sleep(5000);
      return true;
    }
  } catch {
    // No dialog found
  }
  return false;
}

/**
 * Check if the page shows an "invalid phone number" error.
 * Uses specific WhatsApp error text, not just the word "invalid".
 */
async function isInvalidNumber(page) {
  const body = await page.textContent('body').catch(() => '');
  // WhatsApp shows these exact phrases for invalid/unregistered numbers
  return /phone number shared via url is invalid|isn't on WhatsApp|is not on WhatsApp|this phone number is invalid/i.test(body);
}

/**
 * Check if there's a rate-limit indication from WhatsApp.
 */
async function isRateLimited(page) {
  const body = await page.textContent('body').catch(() => '');
  return /try again later|too many attempts|too many messages/i.test(body);
}

/**
 * Send a WhatsApp message to a single contact.
 * Returns the new status for the contact.
 */
async function sendMessage(page, contact) {
  const { phone, name, designation } = contact;
  const sendUrl = `https://web.whatsapp.com/send/?phone=${phone}&text&type=phone_number&app_absent=0`;

  // Check if still logged in
  const stillLoggedIn = await isLoggedIn(page);
  if (!stillLoggedIn) {
    console.log('  ⚠  WhatsApp session lost — waiting for re-login...');
    const reLoggedIn = await waitForQRScan(page);
    if (!reLoggedIn) {
      console.error(`  ✗ Could not re-establish WhatsApp session for ${name}`);
      return { status: 'failed', notes: 'session lost' };
    }
    console.log('  ✓ Session restored — continuing...');
  }

  console.log(`  → Navigating to chat: ${name} (${phone})`);

  try {
    await page.goto(sendUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (err) {
    console.error(`  ✗ Navigation timeout for ${name}`);
    return { status: 'failed', notes: 'navigation timeout' };
  }

  // Short wait for page to settle
  await sleep(3000);

  // Handle "Use here" dialog if it appears
  const handledUseHere = await handleUseHereDialog(page);
  if (handledUseHere) {
    // Re-navigate after clicking "Use here"
    console.log('  → Re-navigating after "Use here"...');
    try {
      await page.goto(sendUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(5000);
    } catch {
      console.error(`  ✗ Re-navigation timeout for ${name}`);
      return { status: 'failed', notes: 'navigation timeout after use here' };
    }
  }

  // Wait for message input box (try FIRST, before checking invalid)
  let inputBox;
  try {
    inputBox = await page.waitForSelector('div[contenteditable="true"][data-tab="10"]', {
      timeout: 25000,
    });
  } catch {
    // Input not found — check if number is invalid
    if (await isInvalidNumber(page)) {
      console.log(`  ✗ Invalid phone number for ${name} (${phone})`);
      return { status: 'invalid', notes: 'invalid phone number' };
    }
    // Check for rate limiting
    if (await isRateLimited(page)) {
      console.log(`  ⚠  Rate limited while processing ${name}!`);
      return { status: 'failed', notes: 'rate limited' };
    }
    // Log diagnostic info
    const pageUrl = page.url();
    const pageTitle = await page.title().catch(() => 'unknown');
    const bodySnippet = (await page.textContent('body').catch(() => '')).slice(0, 200);
    console.error(`  ✗ Could not find message input for ${name}`);
    console.error(`    URL: ${pageUrl} | Title: ${pageTitle}`);
    console.error(`    Body snippet: ${bodySnippet.replace(/\n/g, ' ').slice(0, 150)}`);
    return { status: 'failed', notes: 'message input not found' };
  }

  // Check for rate limit before typing
  if (await isRateLimited(page)) {
    console.log(`  ⚠  Rate limited while processing ${name}!`);
    return { status: 'failed', notes: 'rate limited' };
  }

  // Type the message
  try {
    await inputBox.fill(MESSAGE);
    console.log(`  ✓ Typed message for ${name}`);
  } catch (err) {
    console.error(`  ✗ Failed to type message for ${name}: ${err.message}`);
    return { status: 'failed', notes: `type error: ${err.message}` };
  }

  // Press Enter to send
  try {
    await page.keyboard.press('Enter');
    console.log(`  ✓ Pressed Enter for ${name}`);
  } catch (err) {
    console.error(`  ✗ Failed to press Enter for ${name}: ${err.message}`);
    return { status: 'failed', notes: `send error: ${err.message}` };
  }

  // Wait for send confirmation
  await sleep(3000);

  // Check for rate limit after sending
  if (await isRateLimited(page)) {
    console.log(`  ⚠  Rate limited after sending to ${name}!`);
    return { status: 'failed', notes: 'rate limited after send' };
  }

  console.log(`  ✓ Message sent to ${name}`);
  return { status: 'sent', notes: '' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let currentContactBeingProcessed = null;
let browser = null;
let processingPaused = false;

/**
 * Graceful shutdown handler.
 */
async function handleShutdown(signal) {
  console.log(`\n\n  ⚠  Received ${signal}. Shutting down gracefully...`);

  if (currentContactBeingProcessed) {
    const { phone, name, designation } = currentContactBeingProcessed;
    console.log(`  → Marking current contact as failed: ${name} (${phone})`);
    updateContactStatus(phone, name, designation, 'failed', new Date().toISOString().slice(0, 10), 'interrupted');
    console.log('  ✓ CSV updated');
  }

  if (browser) {
    try {
      await browser.close();
      console.log('  ✓ Browser closed');
    } catch {
      // Ignore close errors
    }
  }

  console.log('  ✓ Shutdown complete. Goodbye!');
  process.exit(0);
}

// Register signal handlers
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     WhatsApp Outreach Automation          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // ── Read CSV ──────────────────────────────────────────────────────
  const allContacts = readContacts();
  console.log(`  CSV loaded: ${allContacts.length} total contacts\n`);

  // ── Dry-run mode ──────────────────────────────────────────────────
  if (isDryRun) {
    printStats(allContacts);
    console.log('  Dry-run complete. No messages sent.\n');
    return;
  }

  // ── Filter pending contacts ───────────────────────────────────────
  const pendingContacts = allContacts.filter(c => c.status === 'pending');
  const pendingCount = pendingContacts.length;

  printStats(allContacts);
  console.log('');

  if (pendingCount === 0) {
    console.log('  ✓ All contacts processed! Nothing to send.\n');
    return;
  }

  // ── User confirmation ─────────────────────────────────────────────
  console.log(`  About to send messages to ${pendingCount} pending contacts.`);
  console.log('  This will open WhatsApp Web. You may need to scan the QR code.');
  console.log('');

  const rli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise(resolve => {
    rli.question('  Continue? (y/N) ', resolve);
  });
  rli.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('  Aborted by user.\n');
    return;
  }

  console.log('');

  // ── Launch browser ────────────────────────────────────────────────
  const cdpUrl = process.env.WHATSAPP_CDP;
  let page;
  if (cdpUrl) {
    console.log(`  Connecting to existing browser via CDP: ${cdpUrl}`);
    const cdpBrowser = await chromium.connectOverCDP(cdpUrl);
    const contexts = cdpBrowser.contexts();
    // Reuse existing page if possible
    const pages = contexts.length > 0 ? contexts[0].pages() : [];
    if (pages.length > 0) {
      page = pages[0];
      console.log('  ✓ Reusing existing page');
    } else {
      page = await cdpBrowser.newPage();
    }
    browser = cdpBrowser;
  } else {
    console.log('  Launching Chromium with persistent profile...');
    console.log(`  Profile: ${WHATSAPP_PROFILE}`);
    console.log('');
    browser = await chromium.launchPersistentContext(WHATSAPP_PROFILE, {
      headless: false,
      args: ['--no-sandbox'],
    });
    page = await browser.newPage();
    page.setDefaultTimeout(30000);
  }

  // ── WhatsApp Web Login ────────────────────────────────────────────
  if (!cdpUrl) {
    console.log('  Opening WhatsApp Web...');
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });

    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      const scanned = await waitForQRScan(page);
      if (!scanned) {
        await browser.close();
        process.exit(1);
      }
    } else {
      console.log('  ✓ Already logged in!\n');
    }
  } else {
    // For CDP, just check if we're on WhatsApp and logged in
    const currentUrl = page.url();
    if (!currentUrl.includes('web.whatsapp.com')) {
      console.log('  Navigating to WhatsApp Web...');
      await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });
    }
    console.log('  ✓ Connected to WhatsApp Web\n');
  }

  // ── Process contacts ──────────────────────────────────────────────
  let sent = 0;
  let failed = 0;
  let invalid = 0;
  let skipped = 0;

  console.log(`  ─── Sending to ${pendingCount} contacts ───\n`);

  for (let i = 0; i < pendingContacts.length; i++) {
    const contact = pendingContacts[i];
    const remaining = pendingContacts.length - i - 1;

    // Check if contact is still pending (might have been updated by another process)
    // Re-read the CSV for this check
    const freshContacts = readContacts();
    const freshMatch = freshContacts.find(
      c =>
        c.phone === contact.phone &&
        c.name.toLowerCase() === contact.name.toLowerCase() &&
        c.designation.toLowerCase() === contact.designation.toLowerCase()
    );
    if (freshMatch && freshMatch.status !== 'pending') {
      console.log(`  − Skipping ${contact.name}: status changed to "${freshMatch.status}"`);
      skipped++;
      continue;
    }

    currentContactBeingProcessed = contact;

    const result = await sendMessage(page, contact);
    const today = new Date().toISOString().slice(0, 10);

    updateContactStatus(
      contact.phone,
      contact.name,
      contact.designation,
      result.status,
      today,
      result.notes
    );

    if (result.status === 'sent') {
      sent++;
      console.log(`  ✓ [${i + 1}/${pendingCount}] Sent to ${contact.name} (${contact.phone}) — ${remaining} remaining\n`);
    } else if (result.status === 'invalid') {
      invalid++;
      console.log(`  ✗ [${i + 1}/${pendingCount}] Invalid: ${contact.name} (${contact.phone}) — ${remaining} remaining\n`);
    } else {
      failed++;
      console.log(`  ✗ [${i + 1}/${pendingCount}] Failed: ${contact.name} (${contact.phone}) — ${remaining} remaining\n`);
    }

    currentContactBeingProcessed = null;

    // Wait random 30-45 seconds before next contact (if not the last one)
    if (remaining > 0) {
      const delay = randomInt(30000, 45000);
      console.log(`  ⏱  Waiting ${Math.round(delay / 1000)}s...`);
      await sleep(delay);
      console.log('');
    }
  }

  // ── Summary ───────────────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║            Session Complete               ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  Total processed:   ${pendingCount}`);
  console.log(`  Sent:              ${sent}`);
  console.log(`  Invalid:           ${invalid}`);
  console.log(`  Failed:            ${failed}`);
  console.log(`  Skipped:           ${skipped}`);
  console.log('');

  // Close browser
  await browser.close();
  console.log('  ✓ Browser closed.\n');
}

main().catch(err => {
  console.error('\n  Fatal error:', err);
  if (browser) {
    browser.close().catch(() => {});
  }
  process.exit(1);
});
