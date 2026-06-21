// Queries Wikipedia/Wikidata APIs for player + manager photos.
// Run: node scripts/gather-photos.js
//
// Modes (set exactly one to true; rest false):
//   RETRY_NULLS    = true  — Pass 1: Search API retry for null player entries
//   GATHER_MANAGERS = true — Manager mode: photo gathering for all 48 managers
//   WIKIDATA_PASS  = true  — Pass 2: Wikidata P18 fallback for null player entries
//   (all false)            — Normal: exact-title lookup for undefined player entries
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT           = join(__dirname, '..');
const PLAYERS_DIR    = join(ROOT, 'data', 'players');
const OUTPUT_FILE    = join(ROOT, 'data', 'player-photos.json');
const COUNTRIES_FILE = join(ROOT, 'data', 'countries.json');

const WIKI_API      = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API  = 'https://www.wikidata.org/w/api.php';
const BATCH_SIZE    = 50;
const THUMB_SIZE    = 250;
const HEROES_PER_TEAM  = 0;
const RETRY_NULLS      = false;
const GATHER_MANAGERS  = false;
const WIKIDATA_PASS    = false;  // ← Pass 2: Wikidata P18 fallback for null player entries
const SEARCH_DELAY_MS  = 2000;
const BATCH_DELAY_MS   = 2000;
const RETRY_WAIT_MS    = 90_000;
const MAX_RETRIES      = 3;

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
// qualifier: 'footballer' for players, 'football manager' for coaches.

async function searchWikiTitle(name, qualifier = 'footballer') {
  const params = new URLSearchParams({
    action:      'query',
    list:        'search',
    srsearch:    `${name} ${qualifier}`,
    srlimit:     '5',
    srnamespace: '0',
    format:      'json',
    origin:      '*',
  });
  const res = await fetchWithRetry(`${WIKI_API}?${params}`, `search:${name}`);
  const json = await res.json();
  const results = json.query?.search ?? [];
  const first = results.find(r =>
    !r.title.toLowerCase().endsWith('(disambiguation)') &&
    !r.title.toLowerCase().startsWith('list of')
  );
  return first?.title ?? null;
}

// ─── Wikidata P18 image lookup (batch, up to 50 titles) ──────
// Returns { [wikiTitle]: commonsFilePathUrl | null }

function commonsFilePath(filename, width = THUMB_SIZE) {
  const safe = filename.replace(/ /g, '_');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(safe)}?width=${width}`;
}

async function fetchWikidataImages(titles) {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    sites:  'enwiki',
    titles: titles.join('|'),
    props:  'claims|sitelinks',
    format: 'json',
    origin: '*',
  });
  const res = await fetchWithRetry(`${WIKIDATA_API}?${params}`, 'wikidata-batch');
  const json = await res.json();
  const result = {};
  for (const entity of Object.values(json.entities ?? {})) {
    const sitelink = entity.sitelinks?.enwiki?.title;
    if (!sitelink) continue;
    const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    result[sitelink] = filename ? commonsFilePath(filename) : null;
  }
  return result;
}

// ─── Suspicious-image check ───────────────────────────────────
// Rejects generic placeholders, logos, SVG badge thumbnails, and
// club/competition crests that Wikipedia returns for team/org articles.

function isSuspicious(url) {
  const f = url.toLowerCase();
  // Generic placeholders / silhouettes
  if (f.includes('joueur') || f.includes('footballer') ||
      f.includes('footballeur') || f.includes('generic') ||
      f.includes('silhouette') || f.includes('unknown_person') ||
      f.includes('no_image') || f.includes('placeholder')) return true;
  // Logos, crests, badges — these come from club/association/competition articles
  if (f.includes('logo') || f.includes('_crest') || f.includes('_badge') ||
      f.includes('_emblem') || f.includes('_shield') || f.includes('_coat_of_arms') ||
      f.includes('federation') || f.includes('association')) return true;
  // SVG files served as PNG thumbnails — almost always crests/flags/logos
  if (f.endsWith('.svg.png')) return true;
  return false;
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

  // Pre-scan for duplicate URLs — same photo assigned to multiple players is a false positive signal
  const urlToPlayers = new Map();
  for (const [playerId, { foundTitle }] of entries) {
    const url = imageByTitle[foundTitle];
    if (!url || isSuspicious(url)) continue;
    if (!urlToPlayers.has(url)) urlToPlayers.set(url, []);
    urlToPlayers.get(url).push(playerId);
  }
  const duplicateUrls = new Set(
    [...urlToPlayers.entries()].filter(([, ids]) => ids.length > 1).map(([url]) => url)
  );
  if (duplicateUrls.size > 0) {
    console.log(`  ⚠ ${duplicateUrls.size} URL(s) map to multiple players — skipping all to avoid false positives`);
    for (const [url, ids] of urlToPlayers.entries()) {
      if (ids.length > 1) {
        warnings.push(`  ⚠ duplicate URL for ${ids.join(', ')}: ${decodeURIComponent(url.split('/').pop()).slice(0, 60)}`);
      }
    }
  }

  for (const [playerId, { foundTitle, hero }] of entries) {
    const url = imageByTitle[foundTitle];
    if (!url) continue; // No image at found title — leave as null for Pass 2

    if (isSuspicious(url)) {
      warnings.push(`  ⚠ ${hero.name} (${hero.team}): suspicious — ${url.toLowerCase()}`);
      continue; // Don't update — leave as null for Pass 2
    }

    if (duplicateUrls.has(url)) continue; // Ambiguous match — skip

    photoMap[playerId] = url;
    recovered++;
    recovered_list.push({ name: hero.name, team: hero.team, fromTitle: foundTitle });
  }

  if (warnings.length) {
    console.log('\nSuspicious/duplicate images skipped (leaving as null for Pass 2):');
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

// ─── Manager photo pass ───────────────────────────────────────
// Searches for all 48 managers and stores photos as manager-{countryId} keys.

async function runManagerPass(countries, photoMap) {
  const targets = countries
    .filter(c => photoMap[`manager-${c.id}`] === undefined)
    .map(c => ({ key: `manager-${c.id}`, name: c.manager, countryId: c.id }));

  console.log(`Manager pass: searching for ${targets.length} manager photos…`);
  if (!targets.length) { console.log('  All manager photos already in map.'); return 0; }

  // Phase A: search Wikipedia for each manager
  console.log('\nPhase A: searching Wikipedia for manager articles…');
  const titleMap = new Map();
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    try {
      const title = await searchWikiTitle(t.name, 'football manager');
      if (title) titleMap.set(t.key, { title, t });
      else console.log(`  — no article: ${t.name}`);
    } catch (err) {
      console.error(`  search error for "${t.name}": ${err.message}`);
    }
    if (i < targets.length - 1) await sleep(SEARCH_DELAY_MS);
  }

  console.log(`  Found ${titleMap.size}/${targets.length} articles`);
  if (!titleMap.size) return 0;

  console.log('\nCooling down 45s before Phase B…');
  await sleep(45_000);

  // Phase B: pageimages batch
  console.log('Phase B: fetching manager images…');
  const allTitles = [...new Set([...titleMap.values()].map(v => v.title))];
  const imageByTitle = {};
  for (let i = 0; i < allTitles.length; i += BATCH_SIZE) {
    const batch = allTitles.slice(i, i + BATCH_SIZE);
    try {
      const pages = await fetchWikiImages(batch);
      Object.assign(imageByTitle, parsePages(pages));
    } catch (err) { console.error(`  batch failed: ${err.message}`); }
    if (i + BATCH_SIZE < allTitles.length) await sleep(BATCH_DELAY_MS);
  }

  // Phase C: update map
  let found = 0;
  for (const [key, { title, t }] of titleMap) {
    const url = imageByTitle[title];
    if (!url || isSuspicious(url)) {
      photoMap[key] = null;
      if (!url) console.log(`  — no image: ${t.name} (article: "${title}")`);
      else console.log(`  ⚠ suspicious: ${t.name}`);
      continue;
    }
    photoMap[key] = url;
    found++;
    console.log(`  ✓ ${t.name.padEnd(28)} → "${title}"`);
  }

  // Mark unfound as null so they aren't re-searched on next run
  for (const t of targets) {
    if (photoMap[t.key] === undefined) photoMap[t.key] = null;
  }

  return found;
}

// ─── Wikidata Pass 2 ─────────────────────────────────────────
// For null player entries: re-search Wikipedia, then query Wikidata P18
// for articles that have no Wikipedia lead image.

async function runWikidataPass(countries, photoMap) {
  const nullHeroes = [];
  for (const country of countries) {
    const file = join(PLAYERS_DIR, `${country.id}.json`);
    let players = [];
    try { players = JSON.parse(readFileSync(file, 'utf8')).data ?? []; }
    catch { continue; }
    for (const p of players) {
      if (photoMap[p.id] === null) nullHeroes.push({ id: p.id, name: p.name, team: country.id });
    }
  }

  console.log(`\nWikidata Pass 2: ${nullHeroes.length} null entries`);
  if (!nullHeroes.length) return 0;

  // Phase A: search Wikipedia for article titles
  console.log('\nPhase A: searching Wikipedia…');
  const titleMap = new Map();
  for (let i = 0; i < nullHeroes.length; i++) {
    const hero = nullHeroes[i];
    try {
      const title = await searchWikiTitle(hero.name);
      if (title) titleMap.set(hero.id, { title, hero });
    } catch (err) { console.error(`  search error for "${hero.name}": ${err.message}`); }
    if (i % 50 === 0 && i > 0) console.log(`  searched ${i}/${nullHeroes.length}…`);
    if (i < nullHeroes.length - 1) await sleep(SEARCH_DELAY_MS);
  }
  console.log(`  Found ${titleMap.size} articles`);
  if (!titleMap.size) return 0;

  console.log('\nCooling down 45s…');
  await sleep(45_000);

  // Phase B: Wikipedia pageimages — players who have a lead image are already in map;
  // for those WITHOUT a lead image, we fall through to Wikidata
  console.log('Phase B: pageimages batch…');
  const allTitles = [...new Set([...titleMap.values()].map(v => v.title))];
  const wikiImage = {};
  for (let i = 0; i < allTitles.length; i += BATCH_SIZE) {
    const batch = allTitles.slice(i, i + BATCH_SIZE);
    try {
      const pages = await fetchWikiImages(batch);
      Object.assign(wikiImage, parsePages(pages));
    } catch (err) { console.error(`  pageimages batch failed: ${err.message}`); }
    if (i + BATCH_SIZE < allTitles.length) await sleep(BATCH_DELAY_MS);
  }

  // Split: titles with Wikipedia image vs. those needing Wikidata fallback
  const wikiFounds = [];
  const needWikidata = [];
  for (const [playerId, { title, hero }] of titleMap) {
    const url = wikiImage[title];
    if (url) wikiFounds.push({ playerId, url, hero });
    else needWikidata.push({ playerId, title, hero });
  }
  console.log(`  Wiki image found: ${wikiFounds.length} — Wikidata fallback needed: ${needWikidata.length}`);

  // Phase C: Wikidata P18 for articles without Wikipedia lead image
  let wikidataImage = {};
  if (needWikidata.length) {
    console.log('\nPhase C: Wikidata P18 lookup…');
    await sleep(BATCH_DELAY_MS);
    const wdTitles = [...new Set(needWikidata.map(e => e.title))];
    for (let i = 0; i < wdTitles.length; i += BATCH_SIZE) {
      const batch = wdTitles.slice(i, i + BATCH_SIZE);
      try {
        const result = await fetchWikidataImages(batch);
        Object.assign(wikidataImage, result);
      } catch (err) { console.error(`  wikidata batch failed: ${err.message}`); }
      if (i + BATCH_SIZE < wdTitles.length) await sleep(BATCH_DELAY_MS);
    }
  }

  // Phase D: duplicate-URL pre-scan across all candidates AND existing photoMap entries.
  // Without checking the existing map, a URL already assigned to player A can be
  // assigned again to player B in this pass (root cause of Sprint 21 false-positive re-introductions).
  const existingUrls = new Set(Object.values(photoMap).filter(v => v !== null && v !== undefined));

  const allCandidates = [
    ...wikiFounds.map(e => ({ playerId: e.playerId, url: e.url, hero: e.hero })),
    ...needWikidata
      .map(e => ({ playerId: e.playerId, url: wikidataImage[e.title], hero: e.hero }))
      .filter(e => e.url),
  ];
  const urlToIds = new Map();
  for (const e of allCandidates) {
    if (!e.url || isSuspicious(e.url)) continue;
    if (!urlToIds.has(e.url)) urlToIds.set(e.url, []);
    urlToIds.get(e.url).push(e.playerId);
  }
  const dupeUrls = new Set([
    // Multiple candidates in this batch map to the same URL
    ...[...urlToIds.entries()].filter(([, ids]) => ids.length > 1).map(([u]) => u),
    // URL already assigned to a different player in the existing map
    ...[...urlToIds.keys()].filter(u => existingUrls.has(u)),
  ]);

  // Phase E: write results
  let recovered = 0, skipped = 0;
  for (const e of allCandidates) {
    if (!e.url) continue;
    if (isSuspicious(e.url)) { skipped++; continue; }
    if (dupeUrls.has(e.url)) { skipped++; continue; }
    photoMap[e.playerId] = e.url;
    recovered++;
    const src = wikiFounds.some(f => f.playerId === e.playerId) ? 'wiki' : 'wikidata';
    console.log(`  ✓ [${src}] ${e.hero.name.padEnd(28)} (${e.hero.team})`);
  }
  if (skipped) console.log(`  ${skipped} skipped (suspicious or duplicate URL)`);
  return recovered;
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const mode = GATHER_MANAGERS ? 'Manager photos'
             : WIKIDATA_PASS   ? 'Pass 2 (Wikidata P18)'
             : RETRY_NULLS     ? 'Pass 1 (Search API retry)'
                               : 'Normal (exact-title)';
  console.log(`gather-photos: starting in ${mode} mode…\n`);

  const countries = JSON.parse(readFileSync(COUNTRIES_FILE, 'utf8')).data;
  const existing  = loadExisting();
  const photoMap  = { ...existing };

  const nullsBefore = Object.values(photoMap).filter(v => v === null).length;
  const hitsBefore  = Object.values(photoMap).filter(v => v !== null && v !== undefined).length;
  console.log(`Starting state: ${hitsBefore} photos, ${nullsBefore} nulls (${Object.keys(photoMap).length} in map)`);

  if (GATHER_MANAGERS) {
    const found = await runManagerPass(countries, photoMap);
    const managerKeys = Object.keys(photoMap).filter(k => k.startsWith('manager-'));
    const withPhoto   = managerKeys.filter(k => photoMap[k]).length;
    console.log(`\nManager photos: ${withPhoto}/${managerKeys.length} (${found} new this run)`);

  } else if (WIKIDATA_PASS) {
    const recovered = await runWikidataPass(countries, photoMap);
    const playerHits = Object.entries(photoMap)
      .filter(([k, v]) => !k.startsWith('manager-') && v).length;
    console.log(`\nWikidata Pass 2 complete. Recovered: ${recovered}`);
    console.log(`Player coverage: ${playerHits}/1248 (${(playerHits/1248*100).toFixed(1)}%)`);

  } else if (RETRY_NULLS) {
    const recovered = await runRetryPass(countries, photoMap);
    const hitsAfter  = Object.values(photoMap).filter(v => v !== null && v !== undefined).length;
    const nullsAfter = Object.values(photoMap).filter(v => v === null).length;
    const allPlayers = countries.reduce((n, c) => {
      try { return n + (JSON.parse(readFileSync(join(PLAYERS_DIR, `${c.id}.json`), 'utf8')).data?.length ?? 0); }
      catch { return n; }
    }, 0);

    const teamStats = {};
    for (const country of countries) {
      let players = [];
      try { players = JSON.parse(readFileSync(join(PLAYERS_DIR, `${country.id}.json`), 'utf8')).data ?? []; }
      catch { continue; }
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
      .filter(s => s.gain > 0).sort((a, b) => b.gain - a.gain);
    if (gainers.length) {
      console.log('\nTeams with biggest gains:');
      gainers.forEach(s => console.log(`  ${s.name.padEnd(26)} +${s.gain} (now ${s.after}/${s.total})`));
    }
    const remaining = Object.entries(teamStats)
      .map(([, s]) => ({ name: s.name, nulls: s.total - s.after }))
      .filter(s => s.nulls > 0).sort((a, b) => b.nulls - a.nulls);
    console.log('\nRemaining nulls by team:');
    remaining.forEach(s => console.log(`  ${s.name.padEnd(26)} ${s.nulls} remaining`));
    console.log('═══════════════════════════════════════════════════════\n');

  } else {
    const { hits, nulls } = await runNormalPass(countries, photoMap);
    console.log(`\ngather-photos: done. Hits: ${hits}, No image: ${nulls}`);
    console.log(`Total in map: ${Object.keys(photoMap).length}`);
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify({
    version:     '1.0',
    lastUpdated: new Date().toISOString(),
    data:        photoMap,
  }, null, 2), 'utf8');

  console.log('player-photos.json updated.');
}

main().catch(console.error);
