/**
 * Sprint 36 — head-to-head stats acquisition (hybrid architecture).
 *
 * Primary/automated source: football-data.org's /matches/{id}/head2head
 * subresource — already-authenticated, zero acquisition risk, no scraping.
 * On our current (free) tier this endpoint caps at the 2 most recent
 * meetings across ALL competitions combined, and does not reliably compute
 * its own W/D/L aggregate (see docs/ROADMAP.md Sprint 36 retrospective for
 * the investigation that found this). This script computes World Cup and
 * all-time scopes itself from whatever raw matches are returned, and flags
 * a scope as "capped" whenever `aggregates.numberOfMatches` (the API's own
 * count of the true total) exceeds the number of match objects actually
 * returned — an objective, API-reported signal, not a guess.
 *
 * Manual supplement: capped pairs are listed in data/h2h-manual-overrides.json
 * (see that file's own header comment for the schema and workflow). This
 * script merges any present override on top of the automated data, and
 * always records provenance in headToHeadStats.meta so it's unambiguous
 * which parts came from the API and which were manually researched.
 *
 * WorldFootball.net was investigated and explicitly ruled out as a primary
 * source (Sprint 36 architecture investigation, 2026-07-02) after a
 * Cloudflare block that persisted across a real time gap, not just rapid
 * requests. Do not resurrect it as a dependency without a fresh evaluation.
 *
 * Run: node scripts/gather-head-to-head-stats.mjs
 * Idempotent — re-run any time (e.g. after a new knockout round) to pick up
 * newly-known fixture pairs, following the same cadence as
 * gather-match-events.mjs / gather-head-to-head.mjs (see Sprint 34).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

const API_KEY  = process.env.FOOTBALL_DATA_API_KEY;
if (!API_KEY) throw new Error('FOOTBALL_DATA_API_KEY env var is not set');
const BASE     = 'https://api.football-data.org/v4';
const DELAY_MS = 7000; // free tier: 10 calls/min — keep comfortably under that

function readJson(rel)       { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function writeJson(rel, obj) { writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
function sleep(ms)           { return new Promise(r => setTimeout(r, ms)); }

async function apiFetch(path, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE}${path}`, { headers: { 'X-Auth-Token': API_KEY } });
    if (res.status === 429) { await sleep(attempt * 10000); continue; }
    if (!res.ok) throw new Error(`API ${path} → HTTP ${res.status}`);
    return res.json();
  }
  throw new Error(`API ${path} → gave up after ${retries} retries (rate limited)`);
}

// ── Build fixtureId -> football-data.org matchId map ─────────────────────

function buildMatchIdMap(apiMatches, teamMap, fixtures, knockout) {
  const fdIdToOurId = teamMap; // { "770": "england", ... }
  const named = apiMatches.filter(m => m.homeTeam?.id && m.awayTeam?.id);
  const byPair = new Map();
  for (const m of named) {
    const homeId = fdIdToOurId[String(m.homeTeam.id)];
    const awayId = fdIdToOurId[String(m.awayTeam.id)];
    if (!homeId || !awayId) continue;
    byPair.set(`${homeId}:${awayId}`, m.id);
    byPair.set(`${awayId}:${homeId}`, m.id); // orientation may differ from our fixture's home/away
  }

  const map = {};
  for (const f of fixtures) {
    const fdId = byPair.get(`${f.homeTeamId}:${f.awayTeamId}`);
    if (fdId) map[f.id] = { fdMatchId: fdId, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId };
  }
  for (const round of knockout) {
    for (const m of round.matches ?? []) {
      if (!m.homeTeamId || !m.awayTeamId) continue; // TBD slot, not yet resolved
      const fdId = byPair.get(`${m.homeTeamId}:${m.awayTeamId}`);
      if (fdId) map[m.id] = { fdMatchId: fdId, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId };
    }
  }
  return map;
}

// ── Scope computation from raw football-data.org matches ─────────────────

function computeScope(matches, homeTeamId, awayTeamId, fdTeamIdOf) {
  if (!matches.length) return { meetings: 0 };
  let homeWins = 0, awayWins = 0, draws = 0, homeGoals = 0, awayGoals = 0;
  for (const m of matches) {
    const homeIsOurHome = String(m.homeTeam.id) === fdTeamIdOf[homeTeamId];
    const hg = homeIsOurHome ? m.score.fullTime.home : m.score.fullTime.away;
    const ag = homeIsOurHome ? m.score.fullTime.away : m.score.fullTime.home;
    if (hg == null || ag == null) continue;
    homeGoals += hg; awayGoals += ag;
    if (hg > ag) homeWins++; else if (ag > hg) awayWins++; else draws++;
  }
  const sorted = [...matches].sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
  return { meetings: matches.length, homeWins, awayWins, draws, homeGoals, awayGoals, lastMeeting: sorted[0]?.utcDate.slice(0, 10) ?? null };
}

async function fetchHeadToHead(fdMatchId, homeTeamId, awayTeamId, fdTeamIdOf) {
  const data = await apiFetch(`/matches/${fdMatchId}/head2head`);
  const rawMatches = data.matches ?? [];
  // Once the reference match itself has been played, football-data.org's own
  // head2head response includes it as the most recent "previous" meeting —
  // exclude it so a fixture's history doesn't contain its own result.
  const selfIncluded = rawMatches.some(m => m.id === fdMatchId);
  const allMatches = rawMatches.filter(m => m.id !== fdMatchId);
  const wcMatches   = allMatches.filter(m => m.competition?.code === 'WC');
  const trueTotal   = (data.aggregates?.numberOfMatches ?? rawMatches.length) - (selfIncluded ? 1 : 0);
  const returned    = allMatches.length;
  const capped      = trueTotal > returned;

  return {
    teams: { home: homeTeamId, away: awayTeamId },
    allTime:  computeScope(allMatches, homeTeamId, awayTeamId, fdTeamIdOf),
    worldCup: computeScope(wcMatches,  homeTeamId, awayTeamId, fdTeamIdOf),
    matches: allMatches.map(m => ({
      date: m.utcDate.slice(0, 10),
      competition: m.competition?.name,
      homeTeam: m.homeTeam?.name, awayTeam: m.awayTeam?.name,
      homeScore: m.score?.fullTime?.home, awayScore: m.score?.fullTime?.away,
    })),
    meta: {
      autoSource: 'football-data.org',
      autoFetchedAt: new Date().toISOString(),
      // allTime capped whenever the API's own reported total exceeds what it returned.
      // World Cup can't be independently confirmed uncapped when allTime is capped —
      // there's no per-competition total in the response — so treat it as
      // possibly-incomplete too, conservatively, rather than asserting completeness
      // we can't actually verify.
      autoCapped: { allTime: capped, worldCup: capped },
      // The true total (used by the UI to say "showing 2 of 7") — only meaningful
      // for allTime, since there's no independent per-competition total to trust
      // for worldCup (see comment above). Always the real API-reported count, even
      // when not capped (harmless/unused in that case, but keeps the field's
      // meaning consistent rather than sometimes-present).
      trueTotal: { allTime: trueTotal, worldCup: null },
      manualSupplement: null,
    },
  };
}

// ── Manual supplement merge ───────────────────────────────────────────────

function loadManualOverrides() {
  const p = resolve(ROOT, 'data/h2h-manual-overrides.json');
  if (!existsSync(p)) return {};
  return readJson('data/h2h-manual-overrides.json');
}

function applyManualSupplement(auto, override) {
  if (!override) return auto;
  const merged = structuredClone(auto);
  for (const scope of override.scopes ?? []) {
    merged[scope] = { ...override.data[scope] };
  }
  // override.matches, when present, is the complete verified history for this
  // fixture and REPLACES the automated list wholesale — never merged/deduped
  // against it. A manual override exists precisely because the automated fetch
  // couldn't confirm completeness, so treating its partial rows as a base to
  // merge onto risks mixing unverified rows in with verified ones.
  if (override.matches) {
    merged.matches = override.matches;
  }
  merged.meta.manualSupplement = {
    scopes: override.scopes,
    source: override.source,
    suppliedAt: override.suppliedAt,
    note: override.note ?? null,
  };
  return merged;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const fixtures  = readJson('data/fixtures.json').data;
  const knockout  = readJson('data/knockout.json').data;
  const teamMap   = readJson('data/api-team-map.json');
  const fdTeamIdOf = Object.fromEntries(Object.entries(teamMap).map(([fd, our]) => [our, fd]));
  const previews  = readJson('data/match-previews.json');
  const manual    = loadManualOverrides();

  console.log('Fetching WC 2026 match list from football-data.org...');
  const apiMatches = (await apiFetch('/competitions/WC/matches')).matches;
  const matchIdMap = buildMatchIdMap(apiMatches, teamMap, fixtures, knockout);
  console.log(`Resolved football-data.org match IDs for ${Object.keys(matchIdMap).length} fixtures.`);

  let fetched = 0, cappedAllTime = 0, cappedWC = 0, manualApplied = 0, skipped = 0, failed = 0;

  for (const [fixtureId, { fdMatchId, homeTeamId, awayTeamId }] of Object.entries(matchIdMap)) {
    process.stdout.write(`[${fixtureId}] `);
    try {
      let stats = await fetchHeadToHead(fdMatchId, homeTeamId, awayTeamId, fdTeamIdOf);
      fetched++;
      if (stats.meta.autoCapped.allTime) cappedAllTime++;
      if (stats.meta.autoCapped.worldCup) cappedWC++;

      const override = manual[fixtureId];
      if (override) {
        stats = applyManualSupplement(stats, override);
        manualApplied++;
        console.log(`OK — allTime ${stats.allTime.meetings}, WC ${stats.worldCup.meetings} (manually supplemented: ${override.scopes.join(', ')})`);
      } else {
        console.log(`OK — allTime ${stats.allTime.meetings}${stats.meta.autoCapped.allTime ? ' [CAPPED]' : ''}, WC ${stats.worldCup.meetings}${stats.meta.autoCapped.worldCup ? ' [CAPPED]' : ''}`);
      }

      previews.data[fixtureId] = previews.data[fixtureId] ?? {};
      previews.data[fixtureId].headToHeadStats = stats;
    } catch (err) {
      console.log('FAILED:', err.message);
      failed++;
    }
    await sleep(DELAY_MS);
  }

  writeJson('data/match-previews.json', previews);

  console.log('\n' + '─'.repeat(60));
  console.log('  H2H STATS — SPRINT 36 SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  Fixtures with a resolvable match ID : ${Object.keys(matchIdMap).length}`);
  console.log(`  Fetched successfully                : ${fetched}`);
  console.log(`  Failed                              : ${failed}`);
  console.log(`  Capped (all-time)                   : ${cappedAllTime}`);
  console.log(`  Capped (World Cup)                  : ${cappedWC}`);
  console.log(`  Manually supplemented               : ${manualApplied}`);
  if (cappedAllTime - manualApplied > 0) {
    console.log(`\n  ${cappedAllTime - manualApplied} pair(s) are capped but NOT yet manually supplemented.`);
    console.log('  See data/h2h-manual-overrides.json header comment for the workflow.');
  }
  console.log('─'.repeat(60));
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(err => { console.error('gather-head-to-head-stats failed:', err); process.exit(1); });
}
