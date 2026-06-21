// Queries Wikipedia pageimages API for player photos, writes data/player-photos.json
// Run: node scripts/gather-photos.js
//
// Modes (set constants below):
//   RETRY_NULLS = false  — normal mode: query new players (undefined in map)
//   RETRY_NULLS = true   — Pass 1 retry: use Search API to resolve null entries
//                          Only writes null→URL updates; never overwrites URL or re-writes null.
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT          = join(__dirname, '..');
const PLAYERS_DIR   = join(ROOT, 'data', 'players');
const OUTPUT_FILE   = join(ROOT, 'data', 'player-photos.json');
const COUNTRIES_FILE = join(ROOT, 'data', 'countries.json');

const WIKI_API  = 'https://en.wikipedia.org/w/api.php';
const BATCH_SIZE     = 50;    // Wikipedia allows up to 50 titles per request
const THUMB_SIZE     = 200;
// Set to 0 to query all players; set to N to query only top-N by caps per team
const HEROES_PER_TEAM = 0;
// Pass 1: retry existing null entries via Wikipedia Search API instead of exact-title lookup
const RETRY_NULLS    = true;
const SEARCH_DELAY_MS  = 2000; // ms between individual search API calls
const BATCH_DELAY_MS   = 2000; // ms between pageimages batch calls
const RETRY_WAIT_MS    = 90_000; // ms to wait after a 429 before retrying
const MAX_RETRIES      = 3;    // max retries per failed request

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Existing map (idempotent) ────────────────────────────────

function loadExisting() {
  try {
    const json = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'));
    return (json.data && typeof json.data === 'object') ? json.data : {};
  } catch { return {}; }
}

// ─── Rate-limited fetch with retry on 429 ────────────────────

async function fetchWithRetry(url, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'WC2026-app/1.0 (jcameronmcd@gmail.com)' } });
    if (res.status === 429) {
      const wait = RETRY_WAIT_MS * attempt;
      console.log(`  429 on ${label} (attempt ${attempt}/${MAX_RETRIES}) — waiting ${wait/1000}s…`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${label}`);
    return res;
  }
  throw new Error(`Max retries exceeded for ${label}`);
}

// ─── Wikipedia pageimages API (batch, up to 50 titles) ───────

async function fetchWikiImages(titles) {
  const params = new URLSearchParams({
    action:      'query',
    prop:        'pageimages',
    pithumbsize: String(THUMB_SIZE),
    pilimit:     'max',
    titles:      titles.join('|'),
    format:      'json',
    origin:      '*',
  });
  const res = await fetchWithRetry(`${WIKI_API}?${params}`, 'pageimages');
  const json = await res.json();
  return json.query?.pages ?? {};
}

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

// ─── Wikipedia Search API (one query at a time) ───────────────
// Returns the best article title for a player name, or null if none found.
// Uses "name footballer" search to disambiguate common names and
// handles diacritic/macron normalisation (Wikipedia search normalises these).

async function searchWikiTitle(name) {
  const params = new URLSearchParams({
    action:      'query',
    list:        'search',
    srsearch:    `${name} footballer`,
    srlimit:     '5',
    srnamespace: '0',
    format:      'json',
    origin:      '*',
  });
  const res = await fetchWithRetry(`${WIKI_API}?${params}`, `search:${name}`);
  const json = await res.json();
  const results = json.query?.search ?? [];
  // Skip explicit disambiguation pages; take first substantive result
  const first = results.find(r =>
    !r.title.toLowerCase().endsWith('(disambiguation)') &&
    !r.title.toLowerCase().startsWith('list of')
  );
  return first?.title ?? null;
}

// ─── Suspicious-image check ───────────────────────────────────

function isSuspicious(url) {
  const f = url.toLowerCase();
  return f.includes('joueur') || f.includes('footballer') ||
         f.includes('footballeur') || f.includes('generic') ||
         f.includes('silhouette') || f.includes('unknown_person') ||
         f.includes('no_image') || f.includes('placeholder');
}

// ─── Normal mode (exact-title lookup for undefined entries) ──

async function runNormalPass(countries, photoMap) {
  const heroes = [];
  for (const country of countries) {
    const file = join(PLAYERS_DIR, `${country.id}.json`);
    let players = [];
    try { players = JSON.parse(readFileSync(file, 'utf8')).data ?? []; }
    catch { console.warn(`  skipping ${country.id} — file not found`); continue; }

    const selected = HEROES_PER_TEAM > 0
      ? [...players].sort((a, b) => (b.caps ?? 0) - (a.caps ?? 0)).slice(0, HEROES_PER_TEAM)
      : players;

    for (const p of selected) {
      if (photoMap[p.id] !== undefined) continue; // already in map
      heroes.push({ id: p.id, name: p.name, team: country.id });
    }
  }

  console.log(`Normal pass: ${heroes.length} players to query (${Object.keys(photoMap).length} cached)`);
  if (!heroes.length) { console.log('  Nothing to do.'); return { hits: 0, nulls: 0 }; }

  let hits = 0, nulls = 0;
  const warnings = [];

  for (let i = 0; i < heroes.length; i += BATCH_SIZE) {
    const batch  = heroes.slice(i, i + BATCH_SIZE);
    const titles = batch.map(h => h.name.trim());

    let pages;
    try { pages = await fetchWikiImages(titles); }
    catch (err) {
      console.error(`  batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err.message}`);
      await sleep(2000); continue;
    }

    const byTitle = parsePages(pages);

    for (const hero of batch) {
      const url = byTitle[hero.name.trim()];
      if (url) {
        if (isSuspicious(url)) warnings.push(`  ⚠ ${hero.name} (${hero.team}): suspicious — ${url}`);
        photoMap[hero.id] = url;
        hits++;
      } else {
        photoMap[hero.id] = null;
        nulls++;
      }
    }

    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(heroes.length / BATCH_SIZE)} done`);
    if (i + BATCH_SIZE < heroes.length) await sleep(BATCH_DELAY_MS);
  }

  if (warnings.length) {
    console.log('\nSuspicious images (manual QA):');
    warnings.forEach(w => console.log(w));
  }

  return { hits, nulls };
}

// ─── Pass 1 retry (Search API for null entries) ───────────────

async function runRetryPass(countries, photoMap) {
  // Build list of players with confirmed-null entries
  const nullHeroes = [];
  const countryNameMap = new Map(countries.map(c => [c.id, c.name]));

  for (const country of countries) {
    const file = join(PLAYERS_DIR, `${country.id}.json`);
    let players = [];
    try { players = JSON.parse(readFileSync(file, 'utf8')).data ?? []; }
    catch { continue; }
    for (const p of players) {
      if (photoMap[p.id] === null) { // Only retry confirmed-null entries
        nullHeroes.push({ id: p.id, name: p.name, team: country.id });
      }
    }
  }

  console.log(`\nPass 1 retry: ${nullHeroes.length} null entries to search`);
  if (!nullHeroes.length) { console.log('  No nulls to retry.'); return 0; }

  // Phase A: Search API — find alternative article titles
  console.log('\nPhase A: searching Wikipedia for alternative article titles…');
  // titleMap: playerId → { foundTitle, hero }
  const titleMap = new Map();
  let searchCount = 0;

  for (let i = 0; i < nullHeroes.length; i++) {
    const hero = nullHeroes[i];
    try {
      const foundTitle = await searchWikiTitle(hero.name);
      if (foundTitle) {
        titleMap.set(hero.id, { foundTitle, hero });
      }
    } catch (err) {
      console.error(`  search error for "${hero.name}": ${err.message}`);
    }

    searchCount++;
    if (searchCount % 50 === 0) {
      console.log(`  searched ${searchCount}/${nullHeroes.length}…`);
    }
    if (i < nullHeroes.length - 1) await sleep(SEARCH_DELAY_MS);
  }

  console.log(`  Found ${titleMap.size} alternative titles for ${nullHeroes.length} null entries`);

  if (titleMap.size === 0) { return 0; }

  // Cool-down to let the rate limiter reset after the search burst
  console.log('\nCooling down 45s before Phase B image fetch…');
  await sleep(45_000);

  // Phase B: Batch pageimages for all found titles
  console.log('Phase B: fetching images for found article titles…');
  const entries    = [...titleMap.entries()];
  // Deduplicate titles (multiple players could theoretically map to the same article)
  const allTitles  = [...new Set(entries.map(([, v]) => v.foundTitle))];
  const imageByTitle = {};

  for (let i = 0; i < allTitles.length; i += BATCH_SIZE) {
    const batch = allTitles.slice(i, i + BATCH_SIZE);
    let pages;
    try { pages = await fetchWikiImages(batch); }
    catch (err) {
      console.error(`  pageimages batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err.message}`);
      await sleep(2000); continue;
    }
    const byTitle = parsePages(pages);
    Object.assign(imageByTitle, byTitle);
    if (i + BATCH_SIZE < allTitles.length) await sleep(BATCH_DELAY_MS);
  }

  // Phase C: Update photoMap — only null→URL, never null→null
  console.log('\nPhase C: updating photo map…');
  let recovered = 0;
  const recovered_list = [];
  const warnings = [];

  for (const [playerId, { foundTitle, hero }] of entries) {
    const url = imageByTitle[foundTitle];
    if (!url) continue; // No image at found title — leave as null for Pass 2

    if (isSuspicious(url)) {
      warnings.push(`  ⚠ ${hero.name} (${hero.team}): suspicious — ${url.toLowerCase()}`);
      continue; // Don't update — leave as null for Pass 2
    }

    photoMap[playerId] = url;
    recovered++;
    recovered_list.push({ name: hero.name, team: hero.team, fromTitle: foundTitle });
  }

  if (warnings.length) {
    console.log('\nSuspicious images skipped (leaving as null for Pass 2):');
    warnings.forEach(w => console.log(w));
  }

  if (recovered_list.length) {
    console.log('\nRecovered players:');
    recovered_list.forEach(r =>
      console.log(`  ✓ ${r.name.padEnd(30)} (${r.team.padEnd(20)}) → "${r.fromTitle}"`)
    );
  }

  return recovered;
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const mode = RETRY_NULLS ? 'Pass 1 (Search API retry)' : 'Normal (exact-title)';
  console.log(`gather-photos: starting in ${mode} mode…\n`);

  const countries = JSON.parse(readFileSync(COUNTRIES_FILE, 'utf8')).data;
  const existing  = loadExisting();
  const photoMap  = { ...existing };

  const nullsBefore = Object.values(photoMap).filter(v => v === null).length;
  const hitsBefore  = Object.values(photoMap).filter(v => v !== null).length;
  const totalBefore = Object.keys(photoMap).length;

  console.log(`Starting state: ${hitsBefore} hits, ${nullsBefore} nulls (${totalBefore} total in map)`);

  if (RETRY_NULLS) {
    const recovered = await runRetryPass(countries, photoMap);
    const nullsAfter = Object.values(photoMap).filter(v => v === null).length;
    const hitsAfter  = Object.values(photoMap).filter(v => v !== null).length;
    const allPlayers = countries.reduce((n, c) => {
      try { return n + (JSON.parse(readFileSync(join(PLAYERS_DIR, `${c.id}.json`), 'utf8')).data?.length ?? 0); }
      catch { return n; }
    }, 0);

    // Per-team breakdown — iterate squad files directly (avoids ID-prefix ambiguity)
    const teamStats = {};
    for (const country of countries) {
      let players = [];
      try { players = JSON.parse(readFileSync(join(PLAYERS_DIR, `${country.id}.json`), 'utf8')).data ?? []; }
      catch { /* skip */ }
      let before = 0, after = 0;
      for (const p of players) {
        if (existing[p.id] !== null && existing[p.id] !== undefined) before++;
        if (photoMap[p.id] !== null && photoMap[p.id] !== undefined) after++;
      }
      teamStats[country.id] = { name: country.name, before, after, total: players.length };
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('PASS 1 RESULTS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Original coverage : ${hitsBefore}/${allPlayers} (${(hitsBefore/allPlayers*100).toFixed(1)}%)`);
    console.log(`New coverage      : ${hitsAfter}/${allPlayers} (${(hitsAfter/allPlayers*100).toFixed(1)}%)`);
    console.log(`Players recovered : ${recovered}`);
    console.log(`Remaining nulls   : ${nullsAfter}`);

    const gainers = Object.entries(teamStats)
      .map(([, s]) => ({ name: s.name, gain: s.after - s.before, after: s.after, total: s.total }))
      .filter(s => s.gain > 0)
      .sort((a, b) => b.gain - a.gain);

    if (gainers.length) {
      console.log('\nTeams with biggest gains:');
      gainers.forEach(s => console.log(`  ${s.name.padEnd(26)} +${s.gain} (now ${s.after}/${s.total})`));
    }

    // Remaining nulls by team
    const remaining = Object.entries(teamStats)
      .map(([, s]) => ({ name: s.name, nulls: s.total - s.after }))
      .filter(s => s.nulls > 0)
      .sort((a, b) => b.nulls - a.nulls);

    console.log('\nRemaining nulls by team:');
    remaining.forEach(s => console.log(`  ${s.name.padEnd(26)} ${s.nulls} remaining`));
    console.log('═══════════════════════════════════════════════════════\n');

  } else {
    const { hits, nulls } = await runNormalPass(countries, photoMap);
    console.log(`\ngather-photos: done. Hits: ${hits}, No image: ${nulls}`);
    console.log(`Total in map: ${Object.keys(photoMap).length}`);
  }

  // Write output (always)
  writeFileSync(OUTPUT_FILE, JSON.stringify({
    version:     '1.0',
    lastUpdated: new Date().toISOString(),
    data:        photoMap,
  }, null, 2), 'utf8');

  console.log('player-photos.json updated.');
}

main().catch(console.error);
