/**
 * Knockout bracket propagation topology — pure data/logic, no DOM, no
 * fetching, no Node-only APIs. Importable from both browser code
 * (js/modules/knockout-bracket.js) and Node scripts (scripts/update-knockout.js,
 * scripts/sync-data.mjs) without a build step.
 *
 * PROPAGATION is the single source of truth for "which match's result
 * feeds which next-round slot" — verified against Wikipedia's bracket
 * (en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage). R32 matches
 * are NOT simple sequential pairings; see inline comments below.
 *
 * getFeederMatchIds() is derived from PROPAGATION, not hand-authored
 * separately — it answers the inverse question ("which match IDs feed
 * *this* match") that the bracket renderer needs for connector-line
 * positioning, without risking the two directions drifting apart.
 */

export const PROPAGATION = {
  // ── Round of 32 → Round of 16 ───────────────────────────────────────────
  // r32-m1 (M73) + r32-m3 (M75) → r16-m2 (M90)
  // r32-m2 (M74) + r32-m5 (M77) → r16-m1 (M89)
  // r32-m4 (M76) + r32-m6 (M78) → r16-m3 (M91)
  // r32-m7 (M79) + r32-m8 (M80) → r16-m4 (M92)
  // r32-m9 (M81) + r32-m10 (M82) → r16-m6 (M94)
  // r32-m11 (M83) + r32-m12 (M84) → r16-m5 (M93)
  // r32-m13 (M85) + r32-m15 (M87) → r16-m8 (M96)
  // r32-m14 (M86) + r32-m16 (M88) → r16-m7 (M95)
  'r32-m1':  { winner: { match: 'r16-m2', slot: 'home' } },
  'r32-m2':  { winner: { match: 'r16-m1', slot: 'home' } },
  'r32-m3':  { winner: { match: 'r16-m2', slot: 'away' } },
  'r32-m4':  { winner: { match: 'r16-m3', slot: 'home' } },
  'r32-m5':  { winner: { match: 'r16-m1', slot: 'away' } },
  'r32-m6':  { winner: { match: 'r16-m3', slot: 'away' } },
  'r32-m7':  { winner: { match: 'r16-m4', slot: 'home' } },
  'r32-m8':  { winner: { match: 'r16-m4', slot: 'away' } },
  'r32-m9':  { winner: { match: 'r16-m6', slot: 'home' } },
  'r32-m10': { winner: { match: 'r16-m6', slot: 'away' } },
  'r32-m11': { winner: { match: 'r16-m5', slot: 'home' } },
  'r32-m12': { winner: { match: 'r16-m5', slot: 'away' } },
  'r32-m13': { winner: { match: 'r16-m8', slot: 'home' } },
  'r32-m14': { winner: { match: 'r16-m7', slot: 'home' } },
  'r32-m15': { winner: { match: 'r16-m8', slot: 'away' } },
  'r32-m16': { winner: { match: 'r16-m7', slot: 'away' } },
  // ── Round of 16 → Quarter-finals ────────────────────────────────────────
  // r16-m1 (M89) + r16-m2 (M90) → qf-m1 (M97)
  // r16-m3 (M91) + r16-m4 (M92) → qf-m3 (M99)
  // r16-m5 (M93) + r16-m6 (M94) → qf-m2 (M98)
  // r16-m7 (M95) + r16-m8 (M96) → qf-m4 (M100)
  'r16-m1':  { winner: { match: 'qf-m1', slot: 'home' } },
  'r16-m2':  { winner: { match: 'qf-m1', slot: 'away' } },
  'r16-m3':  { winner: { match: 'qf-m3', slot: 'home' } },
  'r16-m4':  { winner: { match: 'qf-m3', slot: 'away' } },
  'r16-m5':  { winner: { match: 'qf-m2', slot: 'home' } },
  'r16-m6':  { winner: { match: 'qf-m2', slot: 'away' } },
  'r16-m7':  { winner: { match: 'qf-m4', slot: 'home' } },
  'r16-m8':  { winner: { match: 'qf-m4', slot: 'away' } },
  // ── Quarter-finals → Semi-finals ────────────────────────────────────────
  // qf-m1 (M97) + qf-m2 (M98) → sf-m1 (M101)
  // qf-m3 (M99) + qf-m4 (M100) → sf-m2 (M102)
  'qf-m1':   { winner: { match: 'sf-m1', slot: 'home' } },
  'qf-m2':   { winner: { match: 'sf-m1', slot: 'away' } },
  'qf-m3':   { winner: { match: 'sf-m2', slot: 'home' } },
  'qf-m4':   { winner: { match: 'sf-m2', slot: 'away' } },
  // ── Semi-finals → Final + 3rd Place (winner + loser both propagate) ─────
  'sf-m1':   {
    winner: { match: 'final-m1', slot: 'home' },
    loser:  { match: '3rd-place', slot: 'home' },
  },
  'sf-m2':   {
    winner: { match: 'final-m1', slot: 'away' },
    loser:  { match: '3rd-place', slot: 'away' },
  },
  // ── Terminal matches — no propagation ───────────────────────────────────
  'final-m1':  null,
  '3rd-place': null,
};

// Derived, not hand-authored: for a given destination match ID, which
// source match IDs feed it (in no particular slot order — callers that
// need home/away orientation should consult PROPAGATION directly).
const FEEDERS_BY_MATCH = (() => {
  const map = new Map();
  for (const [sourceId, entry] of Object.entries(PROPAGATION)) {
    if (!entry) continue;
    for (const key of ['winner', 'loser']) {
      const dest = entry[key]?.match;
      if (!dest) continue;
      if (!map.has(dest)) map.set(dest, []);
      map.get(dest).push(sourceId);
    }
  }
  return map;
})();

export function getFeederMatchIds(destMatchId) {
  return FEEDERS_BY_MATCH.get(destMatchId) ?? [];
}

// ── Wallchart side derivation (Sprint 44) ──────────────────────────────────
//
// Fully derived from PROPAGATION — no hardcoded left/right match-ID lists.
// Walks a match's winner-chain forward until it reaches 'sf-m1' ('left') or
// 'sf-m2' ('right'). Terminal matches ('final-m1', '3rd-place') return null;
// they belong to the wallchart's center column, not either side.

export function getBracketSide(matchId) {
  let current = matchId;
  const seen = new Set();
  while (current) {
    if (current === 'sf-m1') return 'left';
    if (current === 'sf-m2') return 'right';
    if (seen.has(current)) return null; // defends against a malformed/cyclic map
    seen.add(current);
    current = PROPAGATION[current]?.winner?.match ?? null;
  }
  return null;
}

/**
 * Splits every non-terminal match ID across all given rounds (the
 * data/knockout.json `.data` array shape) into { left, right } match-ID
 * arrays, via getBracketSide(). Used both by the renderer (to build the
 * two mirrored column groups) and directly by the propagation-integrity
 * test, so the test exercises the same split the app actually renders.
 */
export function getSidePartition(rounds) {
  const left = [];
  const right = [];
  for (const round of rounds) {
    for (const m of round.matches ?? []) {
      const side = getBracketSide(m.id);
      if (side === 'left') left.push(m.id);
      else if (side === 'right') right.push(m.id);
    }
  }
  return { left, right };
}

// ── Wallchart display-order sort key (Sprint 44 follow-up) ────────────────
//
// Derived by walking DOWN from each side's semifinal (sf-m1/sf-m2) through
// getFeederMatchIds() — NOT from each match's own official match number.
// data/knockout.json's r32 array follows the real tournament's official
// numbering (M73..M88), which does not track bracket-tree adjacency, so
// sorting by that number directly is a no-op against the exact scattering
// this key exists to fix. This DFS visits a match's two feeders
// consecutively at every level, so all R32 descendants of any subtree land
// in one contiguous block — siblings that feed the same later-round match
// always end up adjacent once a round's matches are sorted by this key.

function dfsLeafOrder(matchId) {
  const feeders = getFeederMatchIds(matchId);
  if (feeders.length === 0) return [matchId]; // matchId is itself an R32 leaf
  return feeders.flatMap(dfsLeafOrder);
}

const LEAF_RANK = (() => {
  const map = new Map();
  let rank = 0;
  for (const sideRoot of ['sf-m1', 'sf-m2']) {
    for (const leafId of dfsLeafOrder(sideRoot)) map.set(leafId, rank++);
  }
  return map;
})();

export function bracketSortKey(matchId) {
  const leafRank = LEAF_RANK.get(matchId);
  if (leafRank != null) return leafRank;
  const feederKeys = getFeederMatchIds(matchId).map(bracketSortKey).filter(k => k != null);
  return feederKeys.length ? Math.min(...feederKeys) : null;
}

// ── Winner/loser derivation from a stored match's own scores ──────────────
//
// Pure — takes a match object shaped like a data/knockout.json entry
// (homeTeamId, awayTeamId, homeScore, awayScore, optional
// penaltyHomeScore/penaltyAwayScore, status). Returns null when the match
// isn't resolved yet (not FT, or level after normal/extra time with no
// shootout scores recorded).

export function deriveWinnerId(match) {
  if (match.status !== 'FT' || match.homeScore == null || match.awayScore == null) return null;
  if (match.homeScore !== match.awayScore) {
    return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
  }
  if (match.penaltyHomeScore == null || match.penaltyAwayScore == null) return null;
  return match.penaltyHomeScore > match.penaltyAwayScore ? match.homeTeamId : match.awayTeamId;
}

export function deriveLoserId(match) {
  const winnerId = deriveWinnerId(match);
  if (!winnerId) return null;
  return winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
}

/**
 * Fills in any still-TBD knockout slot whose true feeder match(es) — per
 * PROPAGATION, not array order — are already FT in the given `rounds`
 * data (the data/knockout.json `.data` array). This is a deterministic
 * resolution path that needs nothing from an external API's date field:
 * if we already know locally that match X is done and who won it, we
 * already know who occupies the slot(s) it feeds.
 *
 * Mutates `rounds` in place. Returns the number of slots resolved this
 * way (0 if nothing new was resolvable).
 */
export function resolvePropagatedSlots(rounds) {
  const byId = new Map();
  for (const round of rounds) {
    for (const m of round.matches ?? []) byId.set(m.id, m);
  }

  let resolved = 0;
  for (const [sourceId, entry] of Object.entries(PROPAGATION)) {
    if (!entry) continue;
    const source = byId.get(sourceId);
    if (!source) continue;

    for (const key of ['winner', 'loser']) {
      const target = entry[key];
      if (!target) continue;
      const destMatch = byId.get(target.match);
      if (!destMatch) continue;

      const field = target.slot === 'home' ? 'homeTeamId' : 'awayTeamId';
      if (destMatch[field]) continue; // already known, nothing to resolve

      const teamId = key === 'winner' ? deriveWinnerId(source) : deriveLoserId(source);
      if (!teamId) continue; // source not resolved yet

      destMatch[field] = teamId;
      resolved++;
    }
  }
  return resolved;
}
