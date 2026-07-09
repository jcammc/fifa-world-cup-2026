// Regression coverage for Sprint 42's bracket-topology fixes:
//   - Defect 2 (connector derivation): getFeederMatchIds must return the
//     TRUE propagation feeders, not array-adjacent match IDs.
//   - Defect 3 (deterministic advancement): resolvePropagatedSlots must
//     fill a TBD slot from already-FT local feeders, including the exact
//     same-kickoff-date collision that misfired during Sprint 34 Pass 2.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFeederMatchIds,
  deriveWinnerId,
  deriveLoserId,
  resolvePropagatedSlots,
  getBracketSide,
  getSidePartition,
  bracketSortKey,
  PROPAGATION,
} from '../js/bracket-topology.js';

test('getFeederMatchIds returns the true propagation feeders for every R16/QF/SF/Final slot', () => {
  // This exact table is what Defect 2's investigation verified by hand
  // against Wikipedia's bracket — 7 of 8 R16 slots and 2 of 4 QF slots
  // were wrong under the old array-order assumption. Any future edit to
  // PROPAGATION that breaks one of these should fail this test.
  const expected = {
    'r16-m1': ['r32-m2', 'r32-m5'],
    'r16-m2': ['r32-m1', 'r32-m3'],
    'r16-m3': ['r32-m4', 'r32-m6'],
    'r16-m4': ['r32-m7', 'r32-m8'],
    'r16-m5': ['r32-m11', 'r32-m12'],
    'r16-m6': ['r32-m9', 'r32-m10'],
    'r16-m7': ['r32-m14', 'r32-m16'],
    'r16-m8': ['r32-m13', 'r32-m15'],
    'qf-m1':  ['r16-m1', 'r16-m2'],
    'qf-m2':  ['r16-m5', 'r16-m6'],
    'qf-m3':  ['r16-m3', 'r16-m4'],
    'qf-m4':  ['r16-m7', 'r16-m8'],
    'sf-m1':  ['qf-m1', 'qf-m2'],
    'sf-m2':  ['qf-m3', 'qf-m4'],
    'final-m1':  ['sf-m1', 'sf-m2'],
    '3rd-place': ['sf-m1', 'sf-m2'],
  };

  for (const [matchId, feeders] of Object.entries(expected)) {
    assert.deepEqual(getFeederMatchIds(matchId), feeders, `feeders for ${matchId}`);
  }
});

test('deriveWinnerId/deriveLoserId handle normal-time, level, and penalty-shootout results', () => {
  const normalWin = { homeTeamId: 'a', awayTeamId: 'b', homeScore: 2, awayScore: 1, status: 'FT' };
  assert.equal(deriveWinnerId(normalWin), 'a');
  assert.equal(deriveLoserId(normalWin), 'b');

  const levelNoShootout = { homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 1, status: 'FT' };
  assert.equal(deriveWinnerId(levelNoShootout), null, 'no winner derivable without a shootout score');
  assert.equal(deriveLoserId(levelNoShootout), null);

  const penaltyWin = {
    homeTeamId: 'a', awayTeamId: 'b', homeScore: 0, awayScore: 0,
    penaltyHomeScore: 3, penaltyAwayScore: 4, status: 'FT',
  };
  assert.equal(deriveWinnerId(penaltyWin), 'b');
  assert.equal(deriveLoserId(penaltyWin), 'a');

  const notYetPlayed = { homeTeamId: 'a', awayTeamId: 'b', homeScore: null, awayScore: null, status: 'scheduled' };
  assert.equal(deriveWinnerId(notYetPlayed), null);
});

// Minimal fixture matching the real bracket shape, used by the tests below.
function makeRounds() {
  return [
    { id: 'r32', matches: [
      { id: 'r32-m13', homeTeamId: 'switzerland', awayTeamId: 'algeria',    homeScore: 2, awayScore: 0, status: 'FT' },
      { id: 'r32-m14', homeTeamId: 'argentina',   awayTeamId: 'cape-verde', homeScore: 3, awayScore: 2, status: 'FT' },
      { id: 'r32-m15', homeTeamId: 'colombia',     awayTeamId: 'ghana',     homeScore: 1, awayScore: 0, status: 'FT' },
      { id: 'r32-m16', homeTeamId: 'australia',    awayTeamId: 'egypt',     homeScore: 3, awayScore: 5, status: 'FT' },
    ]},
    { id: 'r16', matches: [
      { id: 'r16-m7', homeTeamId: null, awayTeamId: null, homeScore: null, awayScore: null, status: 'scheduled', kickoff: '2026-07-07' },
      { id: 'r16-m8', homeTeamId: null, awayTeamId: null, homeScore: null, awayScore: null, status: 'scheduled', kickoff: '2026-07-07' },
    ]},
  ];
}

test('resolvePropagatedSlots reproduces the exact r16-m7/r16-m8 same-date collision fix (Defect 3)', () => {
  // r16-m7 and r16-m8 share a kickoff date (2026-07-07) — the scenario that
  // defeated the old date-fallback matching in both sync-data.mjs and
  // live-data.mjs during Sprint 34 Pass 2. This must resolve from local
  // data alone, with no date field involved at all.
  const rounds = makeRounds();
  const resolved = resolvePropagatedSlots(rounds);

  const r16 = rounds[1].matches;
  const m7 = r16.find(m => m.id === 'r16-m7');
  const m8 = r16.find(m => m.id === 'r16-m8');

  assert.equal(resolved, 4, 'four slot fields resolved (home+away for each match)');
  assert.equal(m7.homeTeamId, 'argentina');
  assert.equal(m7.awayTeamId, 'egypt');
  assert.equal(m8.homeTeamId, 'switzerland');
  assert.equal(m8.awayTeamId, 'colombia');
});

test('resolvePropagatedSlots is idempotent — a second pass over already-resolved data changes nothing', () => {
  const rounds = makeRounds();
  resolvePropagatedSlots(rounds);
  const secondPass = resolvePropagatedSlots(rounds);
  assert.equal(secondPass, 0);
});

test('resolvePropagatedSlots resolves both winner and loser propagation (SF -> Final + 3rd place)', () => {
  const rounds = [
    { id: 'sf', matches: [
      { id: 'sf-m1', homeTeamId: 'france', awayTeamId: 'morocco', homeScore: 2, awayScore: 1, status: 'FT' },
      { id: 'sf-m2', homeTeamId: 'norway', awayTeamId: 'england', homeScore: 0, awayScore: 0,
        penaltyHomeScore: 4, penaltyAwayScore: 3, status: 'FT' },
    ]},
    { id: 'final', matches: [
      { id: '3rd-place', homeTeamId: null, awayTeamId: null },
      { id: 'final-m1',  homeTeamId: null, awayTeamId: null },
    ]},
  ];

  resolvePropagatedSlots(rounds);
  const finalRound = rounds[1].matches;
  const finalM = finalRound.find(m => m.id === 'final-m1');
  const third  = finalRound.find(m => m.id === '3rd-place');

  assert.deepEqual({ home: finalM.homeTeamId, away: finalM.awayTeamId }, { home: 'france', away: 'norway' });
  assert.deepEqual({ home: third.homeTeamId, away: third.awayTeamId }, { home: 'morocco', away: 'england' });
});

// Regression coverage for Sprint 44 (Knockout Bracket Wallchart Redesign):
// getBracketSide()/getSidePartition() must stay fully derived from
// PROPAGATION, with no hardcoded left/right match-ID lists anywhere in
// the app. These tests exercise the real map, not a frozen copy of it.

test('getBracketSide returns the correct half for every R32/R16/QF/SF match, and null for terminal matches', () => {
  const expectedLeft = new Set([
    'r32-m1', 'r32-m2', 'r32-m3', 'r32-m5', 'r32-m9', 'r32-m10', 'r32-m11', 'r32-m12',
    'r16-m1', 'r16-m2', 'r16-m5', 'r16-m6',
    'qf-m1', 'qf-m2',
    'sf-m1',
  ]);
  const expectedRight = new Set([
    'r32-m4', 'r32-m6', 'r32-m7', 'r32-m8', 'r32-m13', 'r32-m14', 'r32-m15', 'r32-m16',
    'r16-m3', 'r16-m4', 'r16-m7', 'r16-m8',
    'qf-m3', 'qf-m4',
    'sf-m2',
  ]);

  for (const id of expectedLeft)  assert.equal(getBracketSide(id), 'left',  `${id} should be left`);
  for (const id of expectedRight) assert.equal(getBracketSide(id), 'right', `${id} should be right`);

  assert.equal(getBracketSide('final-m1'), null, 'the Final belongs to the center column, not a side');
  assert.equal(getBracketSide('3rd-place'), null, '3rd Place belongs to the center column, not a side');
});

test('propagation-integrity: getSidePartition is exhaustive, disjoint, and correctly balanced across the whole non-terminal bracket', () => {
  // Built directly from PROPAGATION's own keys, not a hand-typed copy of
  // the graph — if a future edit to PROPAGATION changes which matches
  // exist or how they connect, this test exercises the real current
  // shape rather than silently drifting out of sync with it.
  const nonTerminalIds = Object.keys(PROPAGATION).filter(id => id !== 'final-m1' && id !== '3rd-place');
  const byRound = {
    r32: nonTerminalIds.filter(id => id.startsWith('r32-')),
    r16: nonTerminalIds.filter(id => id.startsWith('r16-')),
    qf:  nonTerminalIds.filter(id => id.startsWith('qf-')),
    sf:  nonTerminalIds.filter(id => id.startsWith('sf-')),
  };
  const rounds = Object.entries(byRound).map(([id, ids]) => ({
    id, matches: ids.map(matchId => ({ id: matchId })),
  }));

  const { left, right } = getSidePartition(rounds);

  // Exhaustive + disjoint: every non-terminal match ID is assigned to
  // exactly one side — a future malformed/cyclic PROPAGATION edit that
  // orphans a match or duplicates it across both sides fails here.
  const combined = [...left, ...right];
  assert.equal(combined.length, nonTerminalIds.length, 'every non-terminal match is assigned a side');
  assert.equal(new Set(combined).size, combined.length, 'no match ID appears on both sides');
  for (const id of nonTerminalIds) {
    assert.ok(left.includes(id) || right.includes(id), `${id} is on some side`);
  }

  // Balanced: the real 2026 bracket splits perfectly 8/8, 4/4, 2/2, 1/1 —
  // verified by hand against PROPAGATION when this sprint was designed.
  // A future edit that unbalances the two halves (breaking the wallchart's
  // symmetric layout assumption) fails this, not just the shape check above.
  const countInRound = (ids, roundIds) => ids.filter(id => roundIds.includes(id)).length;
  assert.equal(countInRound(left, byRound.r32), 8);
  assert.equal(countInRound(right, byRound.r32), 8);
  assert.equal(countInRound(left, byRound.r16), 4);
  assert.equal(countInRound(right, byRound.r16), 4);
  assert.equal(countInRound(left, byRound.qf), 2);
  assert.equal(countInRound(right, byRound.qf), 2);
  assert.deepEqual(left.filter(id => byRound.sf.includes(id)), ['sf-m1']);
  assert.deepEqual(right.filter(id => byRound.sf.includes(id)), ['sf-m2']);
});

// Regression coverage for a Sprint 44 follow-up bug: the wallchart's R32
// columns displayed matches in data/knockout.json's raw file order (the
// real tournament's official match numbering), which does NOT track
// bracket-tree adjacency — two matches that feed the same R16 slot could
// end up with an unrelated match sitting visually between them, producing
// a scattered/asymmetric look even though the underlying feeder data was
// always correct. bracketSortKey() fixes this by deriving display order
// from a depth-first walk down from each side's semifinal instead.

test('bracketSortKey assigns every match a key derived from a DFS walk down from its side\'s semifinal', () => {
  const expected = {
    // Left side (sf-m1) — DFS order: qf-m1's subtree (r16-m1: m2,m5; r16-m2: m1,m3),
    // then qf-m2's subtree (r16-m5: m11,m12; r16-m6: m9,m10).
    'r32-m2': 0, 'r32-m5': 1, 'r32-m1': 2, 'r32-m3': 3,
    'r32-m11': 4, 'r32-m12': 5, 'r32-m9': 6, 'r32-m10': 7,
    // Right side (sf-m2), ranks offset by 8 — qf-m3's subtree (r16-m3: m4,m6;
    // r16-m4: m7,m8), then qf-m4's subtree (r16-m7: m14,m16; r16-m8: m13,m15).
    'r32-m4': 8, 'r32-m6': 9, 'r32-m7': 10, 'r32-m8': 11,
    'r32-m14': 12, 'r32-m16': 13, 'r32-m13': 14, 'r32-m15': 15,
    // Later rounds: each key is the min of its feeders' keys.
    'r16-m1': 0, 'r16-m2': 2, 'r16-m5': 4, 'r16-m6': 6,
    'r16-m3': 8, 'r16-m4': 10, 'r16-m7': 12, 'r16-m8': 14,
    'qf-m1': 0, 'qf-m2': 4, 'qf-m3': 8, 'qf-m4': 12,
    'sf-m1': 0, 'sf-m2': 8,
    // Terminal matches tie (both fed by sf-m1 and sf-m2) — stable sort
    // preserves whatever relative order they already had.
    'final-m1': 0, '3rd-place': 0,
  };

  for (const [matchId, key] of Object.entries(expected)) {
    assert.equal(bracketSortKey(matchId), key, `sort key for ${matchId}`);
  }
});

test('bracketSortKey, applied to getSidePartition\'s output, fixes the exact R32 sibling-scattering bug and leaves R16/QF unchanged', () => {
  const nonTerminalIds = Object.keys(PROPAGATION).filter(id => id !== 'final-m1' && id !== '3rd-place');
  const rounds = [
    { id: 'r32', matches: nonTerminalIds.filter(id => id.startsWith('r32-')).map(id => ({ id })) },
    { id: 'r16', matches: nonTerminalIds.filter(id => id.startsWith('r16-')).map(id => ({ id })) },
    { id: 'qf',  matches: nonTerminalIds.filter(id => id.startsWith('qf-')).map(id => ({ id })) },
  ];
  const { left, right } = getSidePartition(rounds);
  const sortedIn = (ids, prefix) =>
    ids.filter(id => id.startsWith(prefix)).sort((a, b) => bracketSortKey(a) - bracketSortKey(b));

  // The actual bug: r32-m1/r32-m3 (siblings feeding r16-m2) and r32-m2/r32-m5
  // (siblings feeding r16-m1) used to be scattered by data/knockout.json's
  // raw file order (m1,m2,m3,m5,...) — this locks in that they're now
  // adjacent, as two contiguous pairs.
  assert.deepEqual(sortedIn(left, 'r32-'), ['r32-m2', 'r32-m5', 'r32-m1', 'r32-m3', 'r32-m11', 'r32-m12', 'r32-m9', 'r32-m10']);
  // Same bug, mirrored: r32-m13/r32-m15 (feeding r16-m8) and r32-m14/r32-m16
  // (feeding r16-m7) used to be scattered.
  assert.deepEqual(sortedIn(right, 'r32-'), ['r32-m4', 'r32-m6', 'r32-m7', 'r32-m8', 'r32-m14', 'r32-m16', 'r32-m13', 'r32-m15']);

  // R16 and QF never had this bug (their own numbering already keeps
  // siblings adjacent) — confirm the fix doesn't disturb them.
  assert.deepEqual(sortedIn(left, 'r16-'), ['r16-m1', 'r16-m2', 'r16-m5', 'r16-m6']);
  assert.deepEqual(sortedIn(right, 'r16-'), ['r16-m3', 'r16-m4', 'r16-m7', 'r16-m8']);
  assert.deepEqual(sortedIn(left, 'qf-'), ['qf-m1', 'qf-m2']);
  assert.deepEqual(sortedIn(right, 'qf-'), ['qf-m3', 'qf-m4']);
});
