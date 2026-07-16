// Regression coverage for the knockout bracket "confirmed" tick/banner.
//
// This was designed as a ONE-TIME indicator for the group-stage ->
// Round-of-32 qualification transition (Sprint 27: "during R3 users will
// revisit the bracket frequently, so newly confirmed teams should stand
// out instantly") — not a recurring per-round feature. Three prior fix
// passes (Sprint 28, Sprint 42 Defect 1, Sprint 44) each only addressed
// per-match-vs-per-round GRANULARITY within an assumed "recurring every
// round" frame, and none of them ever added test coverage for the round
// banner (buildColumn's confirmedBanner) at all — which is exactly why
// the bug shipped three times undetected. This file now covers both the
// R32-only restriction and the "knockout stage has started" permanent
// retirement, for both buildMatch (per-team tick) and buildColumn (round
// banner).
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// js/modules/knockout-bracket.js imports js/data.js, which reads
// window.location.hostname at module-load time (the IS_LIVE flag) —
// needs a minimal DOM global to exist before the import resolves, even
// though the functions under test here never touch the DOM themselves.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window   = dom.window;
globalThis.document = dom.window.document;

const { buildMatch, buildColumn } = await import('../js/modules/knockout-bracket.js');

const countryMap = new Map([
  ['france', { id: 'france', name: 'France' }],
  ['morocco', { id: 'morocco', name: 'Morocco' }],
  ['spain', { id: 'spain', name: 'Spain' }],
  ['england', { id: 'england', name: 'England' }],
]);

// ─── buildMatch: per-team tick ──────────────────────────────────────────

test('R32, partially resolved, knockout NOT started: known side gets the tick (Sprint 42 behavior, preserved)', () => {
  const match = {
    id: 'r32-m9', homeTeamId: 'france', awayTeamId: null, awayLabel: 'Winner R32-9',
    homeScore: null, awayScore: null, status: 'scheduled',
  };
  const html = buildMatch(match, new Map(), countryMap, false);

  assert.match(html, /bracket-team--confirmed/, 'known side gets the confirmed class');
  assert.match(html, /score--confirmed/, 'known side gets the tick glyph');
  assert.match(html, /bracket-team--pending/, 'unknown side still gets the TBD placeholder');
});

test('R32, partially resolved, knockout HAS started: tick is hidden (the actual fix)', () => {
  const match = {
    id: 'r32-m9', homeTeamId: 'france', awayTeamId: null, awayLabel: 'Winner R32-9',
    homeScore: null, awayScore: null, status: 'scheduled',
  };
  const html = buildMatch(match, new Map(), countryMap, true);

  assert.doesNotMatch(html, /bracket-team--confirmed/, 'no tick once the knockout stage has started, even mid-R32');
  assert.doesNotMatch(html, /score--confirmed/);
});

test('R32, both teams TBD: shows placeholders, not ticks (unaffected by knockoutStarted)', () => {
  const match = { id: 'r32-m10', homeTeamId: null, awayTeamId: null, homeLabel: null, awayLabel: null, homeScore: null, awayScore: null, status: 'scheduled' };
  const html = buildMatch(match, new Map(), countryMap, false);

  assert.doesNotMatch(html, /bracket-team--confirmed/);
  assert.match(html, /bracket-team--pending/);
  assert.match(html, />TBD</);
});

test('R16 match, partially resolved: NEVER ticks, regardless of knockoutStarted — this is the reported bug scenario', () => {
  const partial = { id: 'r16-m5', homeTeamId: 'spain', awayTeamId: null, awayLabel: 'Winner R32-11', homeScore: null, awayScore: null, status: 'scheduled' };
  assert.doesNotMatch(buildMatch(partial, new Map(), countryMap, false), /bracket-team--confirmed/, 'R16 never ticks even pre-kickoff');
  assert.doesNotMatch(buildMatch(partial, new Map(), countryMap, true), /bracket-team--confirmed/, 'R16 never ticks once knockout has started either');
});

test('Semi-final match, partially resolved, both known-side team AND opponent still TBD: NEVER ticks (the exact screenshot scenario — Spain in Final, France in 3rd Place)', () => {
  const finalSlot = { id: 'final-m1', homeTeamId: 'spain', awayTeamId: null, awayLabel: null, homeScore: null, awayScore: null, status: 'scheduled' };
  const thirdPlaceSlot = { id: '3rd-place', homeTeamId: 'france', awayTeamId: null, awayLabel: null, homeScore: null, awayScore: null, status: 'scheduled' };

  assert.doesNotMatch(buildMatch(finalSlot, new Map(), countryMap, true), /bracket-team--confirmed/);
  assert.doesNotMatch(buildMatch(thirdPlaceSlot, new Map(), countryMap, true), /bracket-team--confirmed/);
});

test('a played match (has a score) shows the score, never a tick, regardless of round or knockoutStarted', () => {
  const match = { id: 'r32-m1', homeTeamId: 'france', awayTeamId: 'morocco', homeScore: 2, awayScore: 1, status: 'FT' };
  const html = buildMatch(match, new Map(), countryMap, false);

  assert.match(html, /bracket-team__score">2</);
  assert.match(html, /bracket-team__score">1</);
  assert.doesNotMatch(html, /score--confirmed/);
});

// ─── buildColumn: round-level banner ────────────────────────────────────

test('R32 column, all teams set, knockout NOT started: banner shows', () => {
  const descriptor = {
    id: 'r32-l', label: 'Round of 32', matches: [
      { id: 'r32-m1', homeTeamId: 'france', awayTeamId: 'morocco', homeScore: null, awayScore: null, status: 'scheduled' },
    ],
  };
  const html = buildColumn(descriptor, new Map(), countryMap, false);
  assert.match(html, /bracket-round__confirmed/);
  assert.match(html, /All Round of 32 teams confirmed/);
});

test('R32 column, all teams set, knockout HAS started: banner permanently hidden', () => {
  const descriptor = {
    id: 'r32-l', label: 'Round of 32', matches: [
      { id: 'r32-m1', homeTeamId: 'france', awayTeamId: 'morocco', homeScore: 2, awayScore: 1, status: 'FT' },
    ],
  };
  const html = buildColumn(descriptor, new Map(), countryMap, true);
  assert.doesNotMatch(html, /bracket-round__confirmed/);
});

test('non-R32 column (R16), all teams set: banner NEVER shows, regardless of knockoutStarted — the exact "All Semi-finals teams confirmed" bug', () => {
  const descriptor = {
    id: 'sf-l', label: 'Semi-finals', matches: [
      { id: 'sf-m1', homeTeamId: 'france', awayTeamId: 'spain', homeScore: 0, awayScore: 2, status: 'FT' },
    ],
  };
  assert.doesNotMatch(buildColumn(descriptor, new Map(), countryMap, false), /bracket-round__confirmed/);
  assert.doesNotMatch(buildColumn(descriptor, new Map(), countryMap, true), /bracket-round__confirmed/);
});

test('final column (Final + 3rd Place), all teams set: banner never shows', () => {
  const descriptor = {
    id: 'final', label: 'Final', matches: [
      { id: 'final-m1', homeTeamId: 'spain', awayTeamId: 'argentina', homeScore: null, awayScore: null, status: 'scheduled' },
      { id: '3rd-place', homeTeamId: 'france', awayTeamId: 'england', homeScore: null, awayScore: null, status: 'scheduled' },
    ],
  };
  assert.doesNotMatch(buildColumn(descriptor, new Map(), countryMap, true), /bracket-round__confirmed/);
});
