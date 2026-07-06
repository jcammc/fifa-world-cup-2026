// Regression coverage for Sprint 42's Defect 1 fix: the "confirmed" tick
// must be gated per-match, not per-round. Exercises the real buildMatch/
// buildTeamSlot functions extracted from js/modules/knockout-bracket.js —
// same logic the class uses, just callable without a DOM/DataManager.
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

const { buildMatch } = await import('../js/modules/knockout-bracket.js');

const countryMap = new Map([
  ['france', { id: 'france', name: 'France' }],
  ['morocco', { id: 'morocco', name: 'Morocco' }],
]);

test('a fully-resolved match (both teams known) shows NO tick, regardless of round state', () => {
  const match = { id: 'qf-m1', homeTeamId: 'france', awayTeamId: 'morocco', homeScore: null, awayScore: null, status: 'scheduled' };
  const html = buildMatch(match, new Map(), countryMap);

  assert.doesNotMatch(html, /bracket-team--confirmed/, 'no tick class once both sides are known');
  assert.doesNotMatch(html, /score--confirmed/, 'no tick glyph once both sides are known');
});

test('a fully-unresolved match (both teams TBD) shows placeholders, not ticks', () => {
  const match = { id: 'qf-m2', homeTeamId: null, awayTeamId: null, homeLabel: null, awayLabel: null, homeScore: null, awayScore: null, status: 'scheduled' };
  const html = buildMatch(match, new Map(), countryMap);

  assert.doesNotMatch(html, /bracket-team--confirmed/);
  assert.match(html, /bracket-team--pending/);
  assert.match(html, />TBD</);
});

test('a PARTIALLY-resolved match (one side known, one still TBD) shows the tick only on the known side — the exact fix Defect 1 made', () => {
  // This is the state a round is in for most of its real lifetime: one
  // team already propagated in from an earlier finished feeder match,
  // the other side's feeder still in progress. Under the old round-level
  // gate this depended on whether every OTHER match in the round was
  // also resolved; under the fix it depends only on THIS match.
  const match = {
    id: 'r16-x', homeTeamId: 'france', awayTeamId: null, awayLabel: 'Winner R32-9',
    homeScore: null, awayScore: null, status: 'scheduled',
  };
  const html = buildMatch(match, new Map(), countryMap);

  assert.match(html, /bracket-team--confirmed/, 'known side gets the confirmed class');
  assert.match(html, /score--confirmed/, 'known side gets the tick glyph');
  assert.match(html, /bracket-team--pending/, 'unknown side still gets the TBD placeholder');
  assert.match(html, /Winner R32-9/);
});

test('a played match (has a score) shows the score, never a tick, even when fully resolved', () => {
  const match = { id: 'r32-m1', homeTeamId: 'france', awayTeamId: 'morocco', homeScore: 2, awayScore: 1, status: 'FT' };
  const html = buildMatch(match, new Map(), countryMap);

  assert.match(html, /bracket-team__score">2</);
  assert.match(html, /bracket-team__score">1</);
  assert.doesNotMatch(html, /score--confirmed/);
});
