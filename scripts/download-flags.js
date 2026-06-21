#!/usr/bin/env node
/**
 * Download flag SVGs from flagcdn.com for all 48 World Cup 2026 teams.
 * Requires Node.js 18+ (native fetch).
 * Output: assets/flags/<country-id>.svg
 *
 * Usage:  node scripts/download-flags.js
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const OUT_DIR   = resolve(ROOT, 'assets/flags');

// country-id → ISO alpha-2 code used by flagcdn.com
const FLAG_CODES = {
  'argentina':          'ar',
  'australia':          'au',
  'austria':            'at',
  'algeria':            'dz',
  'belgium':            'be',
  'bosnia-herzegovina': 'ba',
  'brazil':             'br',
  'canada':             'ca',
  'cape-verde':         'cv',
  'colombia':           'co',
  'croatia':            'hr',
  'curacao':            'cw',
  'czech-republic':     'cz',
  'dr-congo':           'cd',
  'ecuador':            'ec',
  'egypt':              'eg',
  'england':            'gb-eng',
  'france':             'fr',
  'germany':            'de',
  'ghana':              'gh',
  'haiti':              'ht',
  'iran':               'ir',
  'iraq':               'iq',
  'ivory-coast':        'ci',
  'japan':              'jp',
  'jordan':             'jo',
  'mexico':             'mx',
  'morocco':            'ma',
  'netherlands':        'nl',
  'new-zealand':        'nz',
  'norway':             'no',
  'panama':             'pa',
  'paraguay':           'py',
  'portugal':           'pt',
  'qatar':              'qa',
  'saudi-arabia':       'sa',
  'scotland':           'gb-sct',
  'senegal':            'sn',
  'south-africa':       'za',
  'south-korea':        'kr',
  'spain':              'es',
  'sweden':             'se',
  'switzerland':        'ch',
  'tunisia':            'tn',
  'turkey':             'tr',
  'uruguay':            'uy',
  'usa':                'us',
  'uzbekistan':         'uz',
};

async function downloadFlag(id, code) {
  const url  = `https://flagcdn.com/${code}.svg`;
  const dest = resolve(OUT_DIR, `${id}.svg`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  const svg = await res.text();
  writeFileSync(dest, svg, 'utf8');
  return dest;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const entries = Object.entries(FLAG_CODES);
  console.log(`Downloading ${entries.length} flags to ${OUT_DIR} …\n`);

  let ok = 0, fail = 0;
  for (const [id, code] of entries) {
    try {
      await downloadFlag(id, code);
      console.log(`  ✓  ${id}  (${code})`);
      ok++;
    } catch (err) {
      console.error(`  ✗  ${id}  (${code})  — ${err.message}`);
      fail++;
    }
    // brief pause to avoid hammering the CDN
    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`\nDone: ${ok} downloaded, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
