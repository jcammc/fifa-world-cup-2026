// Regression coverage for the "previous starting XI" lineup redesign.
// The bug: player nodes were plain circles, and the surname label used
// fill="var(--color-text)" — a CSS custom property that doesn't exist
// anywhere in styles/theme.css (the real vars are --color-text-primary/
// -secondary/-muted), silently falling back to SVG's default black fill
// directly on a dark-green pitch. js/charts.js has no DOM/window
// dependency at all, so a plain object with a settable innerHTML is
// enough as the "container" — no jsdom bootstrap needed here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Charts } from '../js/charts.js';

function render(formation, players) {
  const container = { innerHTML: '' };
  Charts.renderLineup(container, formation, players);
  return container.innerHTML;
}

test('renders a jersey path per player, not the old circle', () => {
  const html = render('4-3-3', [{ name: 'Kylian Mbappe', pos: 'ST', shirt: 7 }]);
  assert.match(html, /<path d="M -4,-14/);
  assert.doesNotMatch(html, /<circle r="\d+" fill="var\(--color-lineup-pitch\)"/);
});

test('shirt number and surname text content are correctly derived', () => {
  const html = render('4-3-3', [{ name: 'Kylian Mbappe', pos: 'ST', shirt: 7 }]);
  assert.match(html, />7</);
  assert.match(html, />Mbappe</);
});

test('never references the undefined --color-text CSS var (the black-on-green bug)', () => {
  const html = render('4-3-3', [{ name: 'Kylian Mbappe', pos: 'ST', shirt: 7 }]);
  assert.doesNotMatch(html, /var\(--color-text\)/);
});

test('surname label uses a literal high-contrast fill with a dark halo stroke, not a theme-dependent var', () => {
  const html = render('4-3-3', [{ name: 'Kylian Mbappe', pos: 'ST', shirt: 7 }]);
  assert.match(html, /fill="#ffffff"[^>]*paint-order="stroke fill"/);
});

test('long surnames get textLength compression so a 5-wide tier cannot overlap', () => {
  const fiveAcross = ['LB', 'CB', 'CB', 'CB', 'RB'].map((pos, i) => ({
    name: `Player Alexanderovich${i}`, pos, shirt: i + 2,
  }));
  const html = render('5-3-2', fiveAcross);
  assert.match(html, /textLength="44"/);
});

test('short surnames are left uncompressed', () => {
  const html = render('4-3-3', [{ name: 'Kylian Mbappe', pos: 'ST', shirt: 7 }]);
  assert.doesNotMatch(html, /textLength/);
});

test('renders exactly one jersey per player for a full XI, across all position groups', () => {
  const xi = [
    { name: 'A Keeper', pos: 'GK', shirt: 1 },
    { name: 'B Back', pos: 'LB', shirt: 3 }, { name: 'C Back', pos: 'CB', shirt: 4 },
    { name: 'D Back', pos: 'CB', shirt: 5 }, { name: 'E Back', pos: 'RB', shirt: 2 },
    { name: 'F Mid', pos: 'CM', shirt: 6 }, { name: 'G Mid', pos: 'CM', shirt: 8 }, { name: 'H Mid', pos: 'CM', shirt: 10 },
    { name: 'I Fwd', pos: 'LW', shirt: 11 }, { name: 'J Fwd', pos: 'ST', shirt: 9 }, { name: 'K Fwd', pos: 'RW', shirt: 7 },
  ];
  const html = render('4-3-3', xi);
  assert.equal((html.match(/<path d="M -4,-14/g) ?? []).length, 11);
});

test('empty players array or missing formation clears the container (unchanged guard behaviour)', () => {
  assert.equal(render('4-3-3', []), '');
  assert.equal(render('', [{ name: 'X Y', pos: 'GK', shirt: 1 }]), '');
});
