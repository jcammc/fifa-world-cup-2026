/**
 * Generates player consensus rankings for the teams in data/ranking-scope.json.
 * Run: node scripts/generate-rankings.js
 *
 * See docs/plans/2026-07-06-ranking-system-design.md for the full design.
 *
 * What this script does NOT do: acquire the 4 manual components
 * (transfermarkt/ea/awards/media). Those are hand-researched and edited
 * directly into data/rankings.json — there's no automated source for them
 * (see the design doc and docs/ROADMAP.md Sprint 38 for why). This script:
 *   1. Seeds a stub entry (all manual fields null) for any in-scope player
 *      who doesn't have one yet — idempotent, never overwrites an existing
 *      manual value.
 *   2. Recomputes `form`/`formBreakdown` for every in-scope player, fresh,
 *      from data/match-events.json (cheap — no external calls).
 *   3. Recomputes `consensus`/`provisional` for every entry, renormalizing
 *      over whichever manual components are present.
 *   4. Reports any event player-name it couldn't resolve, deterministically
 *      (see scripts/lib/ranking-formula.mjs) — never guesses, never fails
 *      silently.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  buildTeamIndex, aggregateFormStats, rawFormScore, percentileRank, computeConsensus, FORM_WEIGHTS,
} from './lib/ranking-formula.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

function readJson(rel)       { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function writeJson(rel, obj) { writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

function main() {
  const scope       = readJson('data/ranking-scope.json').teams;
  const rankingsFile = readJson('data/rankings.json');
  const fixtures      = readJson('data/fixtures.json').data;
  const knockout       = readJson('data/knockout.json').data;
  const matchEventsData = readJson('data/match-events.json').data;

  // ── Build lookups ──────────────────────────────────────────────────────
  const matchLookup = new Map();
  for (const f of fixtures) matchLookup.set(f.id, { homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId });
  for (const round of knockout) {
    for (const m of round.matches ?? []) matchLookup.set(m.id, { homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId });
  }

  const teamIndexes  = new Map();
  const teamPlayers  = new Map();
  for (const teamId of scope) {
    const players = readJson(`data/players/${teamId}.json`).data;
    teamPlayers.set(teamId, players);
    teamIndexes.set(teamId, buildTeamIndex(players));
  }

  // ── Seed: ensure every in-scope player has an entry (manual fields null
  //    if new — never overwrite an existing manually-entered value) ───────
  const byPlayerId = new Map(rankingsFile.data.map(e => [e.playerId, e]));
  let seeded = 0;
  for (const teamId of scope) {
    for (const player of teamPlayers.get(teamId)) {
      if (!byPlayerId.has(player.id)) {
        const entry = {
          playerId: player.id, transfermarkt: null, ea: null, awards: null, media: null,
          form: 0, formBreakdown: { starts: 0, subApps: 0, goals: 0, assists: 0, motm: 0 },
          consensus: 0, provisional: true,
        };
        byPlayerId.set(player.id, entry);
        seeded++;
      }
    }
  }

  // ── Form: aggregate real tournament events, then percentile-normalize ──
  const { stats, unmatched } = aggregateFormStats(matchEventsData, matchLookup, teamIndexes);

  const rawEntries = [];
  for (const teamId of scope) {
    for (const player of teamPlayers.get(teamId)) {
      const s = stats.get(player.id) ?? { starts: 0, subApps: 0, goals: 0, assists: 0, motm: 0 };
      rawEntries.push({ key: player.id, raw: rawFormScore(s), breakdown: s });
    }
  }
  const percentiles = percentileRank(rawEntries.map(e => ({ key: e.key, raw: e.raw })));

  for (const { key, breakdown } of rawEntries) {
    const entry = byPlayerId.get(key);
    entry.form = percentiles.get(key) ?? 0;
    entry.formBreakdown = breakdown;
  }

  // ── Consensus + provisional, renormalized over present manual fields ──
  for (const teamId of scope) {
    for (const player of teamPlayers.get(teamId)) {
      const entry = byPlayerId.get(player.id);
      const { consensus, provisional } = computeConsensus(entry);
      entry.consensus = consensus;
      entry.provisional = provisional;
    }
  }

  // ── Write ────────────────────────────────────────────────────────────
  const inScopeIds = new Set(scope.flatMap(teamId => teamPlayers.get(teamId).map(p => p.id)));
  rankingsFile.data = [...byPlayerId.values()].filter(e => inScopeIds.has(e.playerId));
  rankingsFile.lastUpdated = new Date().toISOString();
  writeJson('data/rankings.json', rankingsFile);

  // ── Report ───────────────────────────────────────────────────────────
  const provisionalCount = rankingsFile.data.filter(e => e.provisional).length;
  console.log(`Ranked players       : ${rankingsFile.data.length} (${seeded} newly seeded)`);
  console.log(`Still provisional    : ${provisionalCount} (missing at least one manual component)`);
  console.log(`Unmatched event names: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('\n  Event names that could not be resolved to a player (reported, not guessed):');
    unmatched.slice(0, 30).forEach(u => console.log(`    • "${u.name}" — ${u.eventType} in ${u.fixtureId}${u.teamId ? ` (${u.teamId})` : ''}`));
    if (unmatched.length > 30) console.log(`    ... and ${unmatched.length - 30} more`);
  }
  console.log('\n✓ data/rankings.json updated.');
}

main();
