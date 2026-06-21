// Queries Wikipedia pageimages API for hero player photos, writes data/player-photos.json
// Run: node scripts/gather-photos.js
// Idempotent — existing entries are preserved unless overwritten.
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PLAYERS_DIR   = join(ROOT, 'data', 'players');
const OUTPUT_FILE   = join(ROOT, 'data', 'player-photos.json');
const COUNTRIES_FILE = join(ROOT, 'data', 'countries.json');

const WIKI_API  = 'https://en.wikipedia.org/w/api.php';
const BATCH_SIZE = 50;   // Wikipedia allows up to 50 titles per request
// Set to 0 to query all players; set to N to query only top-N by caps per team
const HEROES_PER_TEAM = 0;
const THUMB_SIZE = 200;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Load existing map so script is idempotent
function loadExisting() {
  try {
    const json = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'));
    return (json.data && typeof json.data === 'object') ? json.data : {};
  } catch { return {}; }
}

// Build wiki title from player name — plain name, no disambiguation suffix
function toWikiTitle(name) {
  return name.trim();
}

// Query Wikipedia pageimages API for up to 50 titles at once
async function fetchWikiImages(titles) {
  const params = new URLSearchParams({
    action:     'query',
    prop:       'pageimages',
    pithumbsize: String(THUMB_SIZE),
    pilimit:    'max',
    titles:     titles.join('|'),
    format:     'json',
    origin:     '*',
  });
  const url = `${WIKI_API}?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'WC2026-app/1.0' } });
  if (!res.ok) throw new Error(`Wikipedia API HTTP ${res.status}`);
  const json = await res.json();
  return json.query?.pages ?? {};
}

// Build result map: title → thumbnail URL or null
function parsePages(pages) {
  const result = {};
  for (const page of Object.values(pages)) {
    const title = page.title;
    if (page.missing || page.ns !== 0) {
      result[title] = null;
    } else {
      result[title] = page.thumbnail?.source ?? null;
    }
  }
  return result;
}

// Some pages return -1 id (missing). Retry without disambiguation suffix if present.
async function resolveTitle(name) {
  const plain = toWikiTitle(name);
  const pages = await fetchWikiImages([plain]);
  const page  = Object.values(pages)[0];

  if (!page || page.missing) return { title: plain, url: null };
  return { title: plain, url: page.thumbnail?.source ?? null };
}

async function main() {
  console.log('gather-photos: starting…');

  // Load countries to get team IDs
  const countries = JSON.parse(readFileSync(COUNTRIES_FILE, 'utf8')).data;
  const existing  = loadExisting();
  const photoMap  = { ...existing };

  // Collect hero players across all 48 teams
  const heroes = [];
  for (const country of countries) {
    const file = join(PLAYERS_DIR, `${country.id}.json`);
    let players = [];
    try {
      players = JSON.parse(readFileSync(file, 'utf8')).data ?? [];
    } catch {
      console.warn(`  skipping ${country.id} — file not found`);
      continue;
    }
    const selected = HEROES_PER_TEAM > 0
      ? [...players].sort((a, b) => (b.caps ?? 0) - (a.caps ?? 0)).slice(0, HEROES_PER_TEAM)
      : players;
    for (const p of selected) {
      if (photoMap[p.id] !== undefined) continue; // already in map (null = confirmed no photo)
      heroes.push({ id: p.id, name: p.name, team: country.id });
    }
  }

  console.log(`gather-photos: ${heroes.length} players to query (${Object.keys(existing).length} already cached)`);

  // Process in batches
  let hits = 0, nulls = 0, warnings = [];
  for (let i = 0; i < heroes.length; i += BATCH_SIZE) {
    const batch = heroes.slice(i, i + BATCH_SIZE);
    const titles = batch.map(h => toWikiTitle(h.name));

    let pages;
    try {
      pages = await fetchWikiImages(titles);
    } catch (err) {
      console.error(`  batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err.message}`);
      await sleep(2000);
      continue;
    }

    const byTitle = parsePages(pages);

    for (const hero of batch) {
      const title = toWikiTitle(hero.name);
      const url   = byTitle[title];

      if (url) {
        // Flag suspicious filenames (generic images, wrong people)
        // URL format: …/200px-Joueur_de_foot.jpg — check the whole path
        const filename = url.toLowerCase();
        const suspicious = filename.includes('joueur') || filename.includes('footballer') ||
          filename.includes('footballeur') || filename.includes('generic') ||
          filename.includes('silhouette') || filename.includes('unknown_person');
        if (suspicious) {
          warnings.push(`  ⚠ ${hero.name} (${hero.team}): suspicious filename — ${filename}`);
        }
        photoMap[hero.id] = url;
        hits++;
      } else {
        // null = looked up, no image found
        photoMap[hero.id] = null;
        nulls++;
      }
    }

    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(heroes.length / BATCH_SIZE)} done — ${hits} hits, ${nulls} nulls so far`);
    if (i + BATCH_SIZE < heroes.length) await sleep(1500); // rate-limit courtesy
  }

  // Write output
  const output = {
    version:     '1.0',
    lastUpdated: new Date().toISOString(),
    data:        photoMap,
  };
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('\ngather-photos: done.');
  console.log(`  Hits:     ${hits}`);
  console.log(`  No image: ${nulls}`);
  console.log(`  Total in map: ${Object.keys(photoMap).length}`);
  if (warnings.length) {
    console.log('\nManual QA required for these entries:');
    warnings.forEach(w => console.log(w));
  }
}

main().catch(console.error);
