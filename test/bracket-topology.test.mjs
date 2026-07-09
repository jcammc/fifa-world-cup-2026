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
