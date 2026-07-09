// Regression coverage for Sprint 44 (Knockout Bracket Wallchart Redesign):
//   - computeConnectorGeometry(): pure connector-line math, shared by both
//     the left half (non-mirrored) and the right half (mirrored) — one
//     implementation, not two maintained in parallel.
//   - buildChampionBox(): relies solely on the existing deriveWinnerId(),
//     no separate winner-derivation logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Same bootstrap as knockout-bracket-tick.test.mjs: js/modules/knockout-bracket.js
// imports js/data.js, which reads window.location.hostname at module-load
// time — needs a minimal DOM global before the import resolves, even though
// the functions under test here are pure and never touch the DOM themselves.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window   = dom.window;
globalThis.document = dom.window.document;

const { computeConnectorGeometry, buildChampionBox } = await import('../js/modules/knockout-bracket.js');

test('computeConnectorGeometry (non-mirrored) reproduces the exact Sprint 42 line coordinates', () => {
  // This is the original #drawConnectors() math, verbatim: feeders at
  // x=0, child at x=gapPx, spine at the midpoint. Any change here is a
  // real regression against Sprint 42's already-verified geometry.
  const lines = computeConnectorGeometry({ fromA: 10, fromB: 50, toY: 30, gapPx: 32, mirrored: false });

  assert.deepEqual(lines, [
    [0, 10, 16, 10],   // stub from feeder A
    [0, 50, 16, 50],   // stub from feeder B
    [16, 10, 16, 50],  // vertical spine
    [16, 30, 32, 30],  // outgoing stub to child
  ]);
});

test('computeConnectorGeometry (mirrored) is the exact horizontal flip of the non-mirrored case', () => {
  const gapPx = 32;
  const input = { fromA: 10, fromB: 50, toY: 30, gapPx };

  const normal   = computeConnectorGeometry({ ...input, mirrored: false });
  const mirrored = computeConnectorGeometry({ ...input, mirrored: true });

  assert.equal(normal.length, mirrored.length);
  for (let i = 0; i < normal.length; i++) {
    const [x1, y1, x2, y2] = normal[i];
    const [mx1, my1, mx2, my2] = mirrored[i];
    assert.equal(mx1, gapPx - x1, `segment ${i} x1 flips`);
    assert.equal(mx2, gapPx - x2, `segment ${i} x2 flips`);
    assert.equal(my1, y1, `segment ${i} y1 unchanged`);
    assert.equal(my2, y2, `segment ${i} y2 unchanged`);
  }

  // Concretely: feeders now sit at x=gapPx, the child at x=0.
  assert.deepEqual(mirrored, [
    [32, 10, 16, 10],
    [32, 50, 16, 50],
    [16, 10, 16, 50],
    [16, 30, 0, 30],
  ]);
});

test('computeConnectorGeometry handles equal feeder centers (flat stub pair, zero-length spine)', () => {
  const lines = computeConnectorGeometry({ fromA: 20, fromB: 20, toY: 20, gapPx: 32, mirrored: false });
  const spine = lines[2];
  assert.deepEqual(spine, [16, 20, 16, 20], 'spine has zero length when both feeders share a center');
});

test('buildChampionBox shows the trophy + TBD placeholder before the Final is FT', () => {
  const scheduled = { id: 'final-m1', homeTeamId: 'france', awayTeamId: 'england', homeScore: null, awayScore: null, status: 'scheduled' };
  const html = buildChampionBox(scheduled, new Map());

  assert.match(html, /bracket-champion"/);
  assert.doesNotMatch(html, /bracket-champion--resolved/);
  assert.match(html, />CHAMPION</);
});

test('buildChampionBox shows the winner after the Final is FT, using deriveWinnerId only', () => {
  const countryMap = new Map([['france', { id: 'france', name: 'France' }]]);
  const finished = { id: 'final-m1', homeTeamId: 'france', awayTeamId: 'england', homeScore: 2, awayScore: 1, status: 'FT' };
  const html = buildChampionBox(finished, countryMap);

  assert.match(html, /bracket-champion--resolved/);
  assert.match(html, /data-champion="france"/);
  assert.match(html, />France</);
});

test('buildChampionBox falls back to the placeholder when FT but no winner is derivable (level, no shootout)', () => {
  // deriveWinnerId() itself returns null here (no penalty scores) —
  // buildChampionBox must not invent a winner some other way.
  const level = { id: 'final-m1', homeTeamId: 'france', awayTeamId: 'england', homeScore: 1, awayScore: 1, status: 'FT' };
  const html = buildChampionBox(level, new Map());

  assert.doesNotMatch(html, /bracket-champion--resolved/);
  assert.match(html, />CHAMPION</);
});

test('buildChampionBox handles a null finalMatch (bracket not yet built out that far) as the placeholder', () => {
  const html = buildChampionBox(null, new Map());
  assert.doesNotMatch(html, /bracket-champion--resolved/);
  assert.match(html, />CHAMPION</);
});
