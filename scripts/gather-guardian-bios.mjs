/**
 * Fetches player bio descriptions from The Guardian's WC 2026 player guide.
 * Updates the `bio` field in data/players/{team}.json for matched players.
 *
 * Run: node scripts/gather-guardian-bios.mjs
 *
 * The Guardian interactive blocks standard fetch requests. This script tries
 * several strategies in order:
 *   1. Fetch the interactive page with browser-like headers and look for
 *      embedded JSON in <script id="__NEXT_DATA__"> or window.__config__.
 *   2. Try known CDN JSON endpoints used by Guardian interactives.
 *   3. If all fetch strategies fail, look for a locally-saved data/guardian-raw.json
 *      file that the user can create by copying the page's __NEXT_DATA__ from DevTools.
 *
 * If guardian-raw.json is not found and all fetches fail, the script exits with
 * instructions for the manual fallback.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

function readJson(rel)       { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function writeJson(rel, obj) { writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

// ── Fetch strategies ──────────────────────────────────────────────────────────

const GUARDIAN_URL = 'https://www.theguardian.com/football/ng-interactive/2026/jun/04/world-cup-2026-complete-player-guide';

// Known CDN patterns for Guardian ng-interactive articles.
const CDN_URLS = [
  'https://interactive.guim.co.uk/atoms/2026/06/world-cup-2026-players/data/data.json',
  'https://interactive.guim.co.uk/atoms/2026/06/world-cup-2026-complete-player-guide/data/data.json',
  'https://interactive.guim.co.uk/docsdata/world-cup-2026-players.json',
];

const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.5',
};

async function tryFetchPage() {
  try {
    const res = await fetch(GUARDIAN_URL, { headers: BROWSER_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();

    // Look for embedded JSON in __NEXT_DATA__ script tag
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(\{.+?\})<\/script>/s);
    if (nextDataMatch) {
      try {
        return { source: '__NEXT_DATA__', data: JSON.parse(nextDataMatch[1]) };
      } catch { /* fall through */ }
    }

    // Look for window.__config__ or similar
    const configMatch = html.match(/window\.__(?:config|data)__\s*=\s*(\{.+?\});/s);
    if (configMatch) {
      try {
        return { source: 'window.__config__', data: JSON.parse(configMatch[1]) };
      } catch { /* fall through */ }
    }

    return null;
  } catch { return null; }
}

async function tryFetchCDN() {
  for (const url of CDN_URLS) {
    try {
      const res = await fetch(url, { headers: BROWSER_HEADERS });
      if (res.ok) {
        const data = await res.json();
        return { source: url, data };
      }
    } catch { /* try next */ }
  }
  return null;
}

// ── Player extraction ─────────────────────────────────────────────────────────

// Guardian interactives use various JSON shapes. Walk common paths to find
// an array of player objects.
function findPlayerArray(obj, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(obj)) {
    // Check if this looks like a player array (objects with name + some text field)
    if (obj.length > 10 && obj[0] && typeof obj[0].name === 'string') return obj;
    for (const item of obj) {
      const found = findPlayerArray(item, depth + 1);
      if (found) return found;
    }
  }
  if (obj && typeof obj === 'object') {
    for (const val of Object.values(obj)) {
      const found = findPlayerArray(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Extract a bio description from a Guardian player object.
// Common field names observed in Guardian interactives.
function extractBio(player) {
  const candidates = [
    player.description, player.bio, player.text, player.summary,
    player.blurb, player.copy, player.body, player.profile,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim().length > 20) return c.trim();
  }
  return null;
}

// Extract the player's name from a Guardian player object.
function extractName(player) {
  return player.name || player.playerName || player.fullName || null;
}

// ── Name matching ─────────────────────────────────────────────────────────────

// Normalise a name for fuzzy matching: lowercase, strip accents, strip punctuation.
function normaliseName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build a map of normalised name → { player, teamFile } for all existing players.
function buildPlayerIndex(countries) {
  const index = new Map();
  for (const country of countries) {
    const filePath = resolve(ROOT, `data/players/${country.id}.json`);
    if (!existsSync(filePath)) continue;

    let players;
    try {
      players = JSON.parse(readFileSync(filePath, 'utf8')).data ?? [];
    } catch { continue; }

    for (const player of players) {
      if (!player.name) continue;
      const norm = normaliseName(player.name);
      index.set(norm, { player, filePath, country });
      // Also index surname only (handles "Mbappé" matching "Kylian Mbappé")
      const parts = norm.split(' ');
      if (parts.length > 1) {
        const surname = parts[parts.length - 1];
        if (!index.has(surname)) index.set(surname, { player, filePath, country });
      }
    }
  }
  return index;
}

// ── Write bios ────────────────────────────────────────────────────────────────

function writeBiosToFiles(matches) {
  // Group matches by file path
  const byFile = new Map();
  for (const { filePath, player, bio } of matches) {
    if (!byFile.has(filePath)) byFile.set(filePath, []);
    byFile.get(filePath).push({ player, bio });
  }

  for (const [filePath, updates] of byFile) {
    const fileData = JSON.parse(readFileSync(filePath, 'utf8'));
    for (const { player: matchedPlayer, bio } of updates) {
      const p = fileData.data?.find(p => p.id === matchedPlayer.id);
      if (p) p.bio = bio;
    }
    writeFileSync(filePath, JSON.stringify(fileData, null, 2) + '\n', 'utf8');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const countries = readJson('data/countries.json').data;

  // Attempt to load data in priority order
  let result = null;
  const localRawPath = resolve(ROOT, 'data/guardian-raw.json');

  if (existsSync(localRawPath)) {
    console.log('Using local data/guardian-raw.json');
    result = { source: 'guardian-raw.json', data: readJson('data/guardian-raw.json') };
  } else {
    console.log('Attempting CDN fetch...');
    result = await tryFetchCDN();
    if (!result) {
      console.log('CDN fetch failed. Attempting page fetch...');
      result = await tryFetchPage();
    }
  }

  if (!result) {
    console.log('\n' + '═'.repeat(60));
    console.log('  MANUAL FALLBACK REQUIRED');
    console.log('═'.repeat(60));
    console.log('  All automated fetch strategies failed.');
    console.log('  To proceed manually:');
    console.log('  1. Open this URL in a browser:');
    console.log(`     ${GUARDIAN_URL}`);
    console.log('  2. Open DevTools → Application → Frame → localhost');
    console.log('     or press F12 → Console and run:');
    console.log('     copy(JSON.stringify(window.__NEXT_DATA__ || window.__data__))');
    console.log('  3. Paste the copied JSON into: data/guardian-raw.json');
    console.log('  4. Re-run this script.');
    console.log('═'.repeat(60));
    process.exit(1);
  }

  console.log(`\nData source: ${result.source}`);

  // Try to find the player array in the fetched data
  const playerArray = findPlayerArray(result.data);
  if (!playerArray) {
    console.log('\nCould not find a player array in the fetched data.');
    console.log('Raw data structure (top-level keys):');
    console.log('  ' + Object.keys(result.data).join(', '));
    console.log('\nSaving raw data to data/guardian-raw.json for inspection.');
    writeJson('data/guardian-raw.json', result.data);
    console.log('Inspect the file and update the findPlayerArray() function in this script.');
    process.exit(1);
  }

  console.log(`Found ${playerArray.length} player entries`);
  console.log(`Sample player keys: ${Object.keys(playerArray[0]).join(', ')}`);

  // Build player index from existing data
  const playerIndex = buildPlayerIndex(countries);

  const matched   = [];
  const unmatched = [];

  for (const guardianPlayer of playerArray) {
    const name = extractName(guardianPlayer);
    const bio  = extractBio(guardianPlayer);

    if (!name || !bio) continue;

    const norm = normaliseName(name);
    let found  = playerIndex.get(norm);

    // Try partial surname match if exact match fails
    if (!found) {
      const parts = norm.split(' ');
      for (const part of parts) {
        if (part.length < 4) continue; // skip short words
        found = playerIndex.get(part);
        if (found) break;
      }
    }

    if (found) {
      matched.push({ filePath: found.filePath, player: found.player, bio });
    } else {
      unmatched.push(name);
    }
  }

  // Write bios to player files
  if (matched.length > 0) {
    writeBiosToFiles(matched);
    console.log(`\n✓ Wrote bios for ${matched.length} players`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('  GUARDIAN BIO SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  ✓ Matched and written : ${matched.length}`);
  console.log(`  ⚠ Unmatched           : ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('\n  Unmatched Guardian player names:');
    unmatched.slice(0, 30).forEach(n => console.log(`    • ${n}`));
    if (unmatched.length > 30) console.log(`    ... and ${unmatched.length - 30} more`);
    console.log('\n  Add NAME_TO_ID entries or check spelling in the player files.');
  }
  console.log('─'.repeat(60));
}

main().catch(err => {
  console.error('gather-guardian-bios failed:', err);
  process.exit(1);
});
