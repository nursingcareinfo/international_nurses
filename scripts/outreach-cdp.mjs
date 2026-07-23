#!/usr/bin/env node
/**
 * Wrapper: connects whatsapp-outreach.mjs to existing Chromium via CDP.
 * Uses the already-logged-in WhatsApp session on ws://127.0.0.1:9222.
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAIN_SCRIPT = path.join(__dirname, 'whatsapp-outreach.mjs');

// We need to modify the script's browser launch to use connectOverCDP.
// Strategy: set an env var that the main script can check, OR
// just spawn a small adapter.

// Actually, the simplest approach: connect to the existing browser,
// then run a simplified version of the send loop inline.
// But that duplicates logic. Better: pass the WS endpoint as an env var.

// Set env var to tell main script to use CDP instead of launching new browser
process.env.WHATSAPP_CDP = 'ws://127.0.0.1:9222';

// Spawn the main script with the env var
const child = spawn('node', [MAIN_SCRIPT, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, WHATSAPP_CDP: 'ws://127.0.0.1:9222' },
  cwd: path.join(__dirname, '..'),
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
