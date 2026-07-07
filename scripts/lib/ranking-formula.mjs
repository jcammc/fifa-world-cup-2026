/**
 * Pure ranking-computation functions for Sprint 39 (see
 * docs/plans/2026-07-06-ranking-system-design.md for the full design).
 * No DOM, no fetching, no file I/O — scripts/generate-rankings.js reads
 * files and calls into this module. Designed for direct unit testing.
 *
 * Determinism is a hard requirement (see the design doc's Decisions
 * log): every function here either produces an exact, reproducible
 * result or explicitly reports that it couldn't, via `unmatched`
 * arrays. Nothing here ever guesses a "closest" match.
 */

// ── Name normalization + team-scoped matching ──────────────────────────────
//
// Ported from scripts/gather-guardian-bios.mjs's proven matching chain
// (buildTeamIndex / matchGuardianPlayer), adapted for one real difference:
// match-events.json's scorer/assistBy/motm fields are sometimes a bare
// surname with NO given name at all (e.g. "Messi"), unlike Guardian bios
// which are always full names. A bare single-token name is matched via
// the surname index alone, accepted only when exactly one same-surname
// candidate exists on that team's roster — same "unambiguous or refuse"
// safety gate as the full-name surname fallback below.

export function normaliseName(name) {
  return name
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .replace(/-/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build a same-team index: exact full-name map, plus every candidate's
// normalised name kept for suffix matching (see matchEventName). Matching
// is deliberately scoped to one team's own ~26-man roster, never across
// teams, to keep the fallback's blast radius small (same reasoning as
// gather-guardian-bios.mjs).
export function buildTeamIndex(players) {
  const byFullName = new Map();
  const all = [];

  for (const player of players) {
    if (!player.name) continue;
    const norm  = normaliseName(player.name);
    const entry = { playerId: player.id, name: player.name, norm };
    byFullName.set(norm, entry);
    all.push(entry);
  }
  return { byFullName, all };
}

// Match one event's raw name string against one team's index. Tried in
// order, each an exact or unambiguous-suffix lookup (never fuzzy):
//   1. Exact normalised full name.
//   2. Leading-token dropped (honorific/extra given name), e.g.
//      "Seyed Hossein Hosseini" -> "Hossein Hosseini".
//   3. First+last only (dropped middle name(s)).
//   4. Unambiguous trailing-token suffix match: the raw name (as given,
//      whatever its token count) matches the LAST N tokens of exactly one
//      candidate's stored name. Covers both a bare single-token surname
//      (e.g. "Messi" -> "Lionel Messi") and a compound/multi-word surname
//      match-events strips the given name from (e.g. "Lo Celso" ->
//      "Giovani Lo Celso", "De Bruyne" -> "Kevin De Bruyne") — the same
//      rule handles both cases, rather than assuming a surname is always
//      exactly one token. Rejected if more than one candidate on this
//      roster shares that trailing sequence (never guesses).
// Returns the matched entry, or null if none of the above applies.
export function matchEventName(rawName, index) {
  if (!rawName) return null;
  const norm = normaliseName(rawName);
  const exact = index.byFullName.get(norm);
  if (exact) return exact;

  const parts = norm.split(' ');

  if (parts.length >= 3) {
    const droppedLeading = index.byFullName.get(parts.slice(1).join(' '));
    if (droppedLeading) return droppedLeading;

    const firstLast = index.byFullName.get(`${parts[0]} ${parts[parts.length - 1]}`);
    if (firstLast) return firstLast;
  }

  const suffix = ` ${norm}`;
  const candidates = index.all.filter(e => e.norm === norm || e.norm.endsWith(suffix));
  if (candidates.length === 1) return candidates[0];
  return null;
}

// ── Form: event-driven tournament-performance aggregation ──────────────────
//
// Cards are deliberately excluded (see design doc §3) — a card reflects
// disciplinary/refereeing judgment, not quality of performance.

export const FORM_WEIGHTS = { start: 3, subApp: 1, goal: 8, assist: 6, motm: 40 };

/**
 * matchEventsData: the `.data` object from data/match-events.json.
 * matchLookup: Map of fixtureId -> { homeTeamId, awayTeamId } (from
 *   fixtures.json + knockout.json), used to resolve MOTM's team.
 * teamIndexes: Map of teamId -> index (from buildTeamIndex), scoped to
 *   only the teams in data/ranking-scope.json.
 *
 * Returns { stats: Map(playerId -> {starts, subApps, goals, assists, motm}),
 *           unmatched: [{ fixtureId, teamId, name, eventType }] }
 */
export function aggregateFormStats(matchEventsData, matchLookup, teamIndexes) {
  const stats = new Map();
  const unmatched = [];

  function bump(teamId, name, field, fixtureId, eventType) {
    const index = teamIndexes.get(teamId);
    if (!index) return; // team not in ranking scope — not an error, just out of scope
    const entry = matchEventName(name, index);
    if (!entry) { unmatched.push({ fixtureId, teamId, name, eventType }); return; }
    if (!stats.has(entry.playerId)) {
      stats.set(entry.playerId, { starts: 0, subApps: 0, goals: 0, assists: 0, motm: 0 });
    }
    stats.get(entry.playerId)[field]++;
  }

  for (const [fixtureId, fixtureEvents] of Object.entries(matchEventsData)) {
    const teams = matchLookup.get(fixtureId);
    if (!teams) continue;

    for (const p of fixtureEvents.homeStarting || []) bump(teams.homeTeamId, p.name, 'starts', fixtureId, 'start');
    for (const p of fixtureEvents.awayStarting || []) bump(teams.awayTeamId, p.name, 'starts', fixtureId, 'start');

    // Per-fixture roster (starters + sub-on players) per side, used below to
    // resolve which team the MOTM played for — there's no explicit teamId on
    // the motm field itself. Checking only starting lineups misses a MOTM who
    // came on as a substitute (found via real data: Switzerland's Manzambi).
    const homeRoster = new Set((fixtureEvents.homeStarting || []).map(p => normaliseName(p.name)));
    const awayRoster = new Set((fixtureEvents.awayStarting || []).map(p => normaliseName(p.name)));

    for (const e of fixtureEvents.events || []) {
      if (e.type === 'goal') {
        bump(e.teamId, e.scorer, 'goals', fixtureId, 'goal');
        if (e.assistBy) bump(e.teamId, e.assistBy, 'assists', fixtureId, 'assist');
      }
      if (e.type === 'substitution') {
        bump(e.teamId, e.onPlayer, 'subApps', fixtureId, 'subApp');
        if (e.onPlayer) {
          (e.teamId === teams.homeTeamId ? homeRoster : awayRoster).add(normaliseName(e.onPlayer));
        }
      }
    }

    if (fixtureEvents.motm) {
      const motmNorm = normaliseName(fixtureEvents.motm);
      const team = homeRoster.has(motmNorm) ? teams.homeTeamId
                 : awayRoster.has(motmNorm) ? teams.awayTeamId
                 : null;
      if (team) bump(team, fixtureEvents.motm, 'motm', fixtureId, 'motm');
      else unmatched.push({ fixtureId, teamId: null, name: fixtureEvents.motm, eventType: 'motm' });
    }
  }

  return { stats, unmatched };
}

export function rawFormScore(s, weights = FORM_WEIGHTS) {
  return weights.start * s.starts + weights.subApp * s.subApps + weights.goal * s.goals
       + weights.assist * s.assists + weights.motm * s.motm;
}

// ── Percentile normalization, with an explicit tie-break rule ──────────────
//
// Ties receive the SAME percentile (never split by insertion order or an
// unstable sort) — required for full reproducibility, per the design doc.

export function percentileRank(entries) {
  // entries: [{ key, raw }]. Returns Map(key -> percentile 0-100).
  const n = entries.length;
  const result = new Map();
  if (n === 0) return result;
  if (n === 1) { result.set(entries[0].key, 100); return result; }

  const sorted = [...entries].sort((a, b) => a.raw - b.raw);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && sorted[j + 1].raw === sorted[i].raw) j++;
    // All indices [i, j] are tied — assign them the same percentile,
    // using the rank of the LAST tied element (standard "same rank for
    // ties" convention), so a tie never straddles two different scores.
    const percentile = (j / (n - 1)) * 100;
    for (let k = i; k <= j; k++) result.set(sorted[k].key, Math.round(percentile * 10) / 10);
    i = j + 1;
  }
  return result;
}

// ── Consensus: renormalized over whichever manual components are present ───

export const CONSENSUS_WEIGHTS = { transfermarkt: 0.40, ea: 0.20, awards: 0.20, media: 0.10, form: 0.10 };

/**
 * entry: { transfermarkt, ea, awards, media, form } — any of the first
 * four may be null (not yet manually researched); form is always a
 * number (computed, defaults to 0 if the player had zero tracked events).
 * Returns { consensus, provisional }.
 */
export function computeConsensus(entry, weights = CONSENSUS_WEIGHTS) {
  const manualKeys = ['transfermarkt', 'ea', 'awards', 'media'];
  const provisional = manualKeys.some(k => entry[k] == null);

  const present = manualKeys.filter(k => entry[k] != null);
  const presentWeight = present.reduce((sum, k) => sum + weights[k], 0) + weights.form;

  if (presentWeight === 0) return { consensus: 0, provisional };

  const weightedSum = present.reduce((sum, k) => sum + entry[k] * weights[k], 0) + (entry.form ?? 0) * weights.form;
  const consensus = Math.round((weightedSum / presentWeight) * 10) / 10;

  return { consensus, provisional };
}

// ── Component derivation: raw data in, derived 0-100 scores out ────────────
//
// Added 2026-07-07 (see docs/plans/2026-07-06-ranking-system-design.md §0/§3a)
// after direct testing showed Transfermarkt/EA/Instagram aren't reliably
// fetchable by an agent. No human ever hand-maintains a final 0-100 score
// for these four components — a raw signal goes in, one of these pure
// functions derives the score, every time generate-rankings.js runs.
//
// Deliberately NOT unified into one rule: percentile-ranking EA's own
// already-0-100-scaled rating would compress it in a way never intended.

// Transfermarkt and Media share this shape: entries = [{ key, raw }], raw
// values only present for players who currently have a non-null raw field.
// A thin wrapper over percentileRank() -- same function Form already uses,
// same "always recompute fresh" treatment, no separate normalization logic.
export function deriveTransfermarktScore(entries) {
  return percentileRank(entries);
}

export function deriveMediaScore(entries) {
  return percentileRank(entries);
}

// EA's own scale is already 0-99 -- DATA_ACQUISITION_STRATEGY.md §4 says
// "treat as 0-100" literally: use the number as-is, no rescale, no percentile.
export function deriveEaScore(rawOvr) {
  return rawOvr == null ? null : rawOvr;
}

// Mechanically applies the existing Awards scoring rubric
// (DATA_ACQUISITION_STRATEGY.md §4): highest base tier reached, plus
// capped bonuses, capped total. awardsRaw is a structured object (never
// free text) so this stays a deterministic pure function -- see §0 for why
// only `worldCupWinner` is auto-detectable; the rest is manually entered
// in the same shape.
export function deriveAwardsScore(awardsRaw) {
  if (awardsRaw == null) return null;

  let score = 0;
  if (awardsRaw.ballonDorTier === 'winner') score = Math.max(score, 100);
  else if (awardsRaw.ballonDorTier === 'top3') score = Math.max(score, 85);
  else if (awardsRaw.ballonDorTier === 'top10') score = Math.max(score, 70);
  if (awardsRaw.fifaBestPlayer) score = Math.max(score, 95);
  if (awardsRaw.uefaPoty) score = Math.max(score, 90);
  if (awardsRaw.wcGoldenBall) score = Math.max(score, 90);
  if (awardsRaw.totyEaFc) score = Math.max(score, 80);

  if (awardsRaw.worldCupWinner) score += 15;
  if (awardsRaw.clWins) score += Math.min(awardsRaw.clWins * 10, 20);
  if (awardsRaw.domesticTitles) score += Math.min(awardsRaw.domesticTitles * 5, 15);

  return Math.min(score, 100);
}
