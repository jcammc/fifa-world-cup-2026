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
