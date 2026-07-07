/**
 * Generates player consensus rankings for the teams in data/ranking-scope.json.
 * Run: node scripts/generate-rankings.js
 *
 * See docs/plans/2026-07-06-ranking-system-design.md for the full design
 * (§0/§3a for the 2026-07-07 "raw data in, derived scores out" revision).
 *
 * What this script does NOT do: acquire the raw signals (transfermarktValueEUR,
 * eaRatingRaw, awardsRaw, mediaPageviews). Transfermarkt/EA values and most of
 * awardsRaw are hand-researched and edited directly into data/rankings.json —
 * agent-side fetching for those was tested and confirmed blocked (see the
 * design doc §0). mediaPageviews and awardsRaw.worldCupWinner ARE automated,
 * by the separate scripts/gather-rankings-signals.mjs. This script:
 *   1. Seeds a stub entry (all raw fields null) for any in-scope player who
 *      doesn't have one yet — idempotent, never overwrites an existing raw
 *      value.
 *   2. Recomputes `form`/`formBreakdown` for every in-scope player, fresh,
 *      from data/match-events.json (cheap — no external calls).
 *   3. Recomputes `transfermarkt`/`ea`/`awards`/`media` for every entry, fresh,
 *      from whichever raw fields are currently non-null (never hand-edited —
 *      same "always recompute" treatment Form already gets).
 *   4. Recomputes `consensus`/`provisional` for every entry, renormalizing
 *      over whichever derived components are present.
 *   5. Reports any event player-name it couldn't resolve, deterministically
 *      (see scripts/lib/ranking-formula.mjs) — never guesses, never fails
 *      silently.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  buildTeamIndex, aggregateFormStats, rawFormScore, percentileRank, computeConsensus, FORM_WEIGHTS,
  deriveTransfermarktScore, deriveEaScore, deriveAwardsScore, deriveMediaScore,
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

  // ── Seed: ensure every in-scope player has an entry (raw fields null
  //    if new — never overwrite an existing raw value) ───────────────────
  const byPlayerId = new Map(rankingsFile.data.map(e => [e.playerId, e]));
  let seeded = 0;
  for (const teamId of scope) {
    for (const player of teamPlayers.get(teamId)) {
      if (!byPlayerId.has(player.id)) {
        const entry = {
          playerId: player.id,
          transfermarktValueEUR: null, eaRatingRaw: null, awardsRaw: null, mediaPageviews: null,
          transfermarkt: null, ea: null, awards: null, media: null,
          form: 0, formBreakdown: { starts: 0, subApps: 0, goals: 0, assists: 0, motm: 0 },
          consensus: 0, provisional: true,
        };
        byPlayerId.set(player.id, entry);
        seeded++;
      }
    }
  }

  // ── Migration: backfill the raw fields onto entries seeded before the
  //    2026-07-07 raw-in/derived-out revision, so the on-disk schema matches
  //    the design doc for every entry, not just newly-seeded ones. Never
  //    overwrites a raw value already present. ────────────────────────────
  for (const entry of byPlayerId.values()) {
    if (entry.transfermarktValueEUR === undefined) entry.transfermarktValueEUR = null;
    if (entry.eaRatingRaw === undefined) entry.eaRatingRaw = null;
    if (entry.awardsRaw === undefined) entry.awardsRaw = null;
    if (entry.mediaPageviews === undefined) entry.mediaPageviews = null;
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

  // ── Derive transfermarkt/ea/awards/media from whichever raw fields are
  //    currently non-null — never hand-edited, recomputed fresh every run
  //    (see docs/plans/2026-07-06-ranking-system-design.md §0/§3a). ───────
  const inScopeEntries = scope.flatMap(teamId => teamPlayers.get(teamId).map(p => byPlayerId.get(p.id)));

  const tmEntries = inScopeEntries
    .filter(e => e.transfermarktValueEUR != null)
    .map(e => ({ key: e.playerId, raw: e.transfermarktValueEUR }));
  const tmScores = deriveTransfermarktScore(tmEntries);

  const mediaEntries = inScopeEntries
    .filter(e => e.mediaPageviews != null)
    .map(e => ({ key: e.playerId, raw: e.mediaPageviews }));
  const mediaScores = deriveMediaScore(mediaEntries);

  for (const entry of inScopeEntries) {
    entry.transfermarkt = tmScores.get(entry.playerId) ?? null;
    entry.ea = deriveEaScore(entry.eaRatingRaw);
    entry.awards = deriveAwardsScore(entry.awardsRaw);
    entry.media = mediaScores.get(entry.playerId) ?? null;
  }

  // ── Consensus + provisional, renormalized over present derived components ──
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
  const rawCounts = {
    transfermarkt: rankingsFile.data.filter(e => e.transfermarktValueEUR != null).length,
    ea:            rankingsFile.data.filter(e => e.eaRatingRaw != null).length,
    awards:        rankingsFile.data.filter(e => e.awardsRaw != null).length,
    media:         rankingsFile.data.filter(e => e.mediaPageviews != null).length,
  };
  console.log(`Ranked players       : ${rankingsFile.data.length} (${seeded} newly seeded)`);
  console.log(`Still provisional    : ${provisionalCount} (missing at least one derived component)`);
  console.log(`Raw data present     : transfermarkt ${rawCounts.transfermarkt}, ea ${rawCounts.ea}, awards ${rawCounts.awards}, media ${rawCounts.media} (of ${rankingsFile.data.length})`);
  console.log(`Unmatched event names: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('\n  Event names that could not be resolved to a player (reported, not guessed):');
    unmatched.slice(0, 30).forEach(u => console.log(`    • "${u.name}" — ${u.eventType} in ${u.fixtureId}${u.teamId ? ` (${u.teamId})` : ''}`));
    if (unmatched.length > 30) console.log(`    ... and ${unmatched.length - 30} more`);
  }
  console.log('\n✓ data/rankings.json updated.');
}

main();
