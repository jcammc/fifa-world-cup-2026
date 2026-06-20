// Regenerates data/search-index.json from countries, clubs, and player files.
// Run: node scripts/generate-search-index.js
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, '..');

function read(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

const countries = read('data/countries.json').data;
const clubs     = read('data/clubs.json').data;
const clubMap   = Object.fromEntries(clubs.map(c => [c.id, c.name]));

const entries = [];

// ── Team entries ───────────────────────────────────────────────────────────
for (const c of countries) {
  entries.push({
    type:  'team',
    id:    c.id,
    label: c.name,
    meta:  `Group ${c.groupId} · ${c.confederation}`,
    href:  `#${c.id}`,
  });
}

// ── Player entries ─────────────────────────────────────────────────────────
const playerFiles = readdirSync(join(root, 'data/players')).filter(f => f.endsWith('.json'));
const countryMap  = Object.fromEntries(countries.map(c => [c.id, c.name]));

for (const file of playerFiles) {
  const countryId = file.replace('.json', '');
  const nation    = countryMap[countryId] ?? countryId;
  const players   = read(`data/players/${file}`).data;

  for (const p of players) {
    const clubName = clubMap[p.clubId] ?? p.clubId;
    entries.push({
      type:  'player',
      id:    p.id,
      label: p.name,
      meta:  `${nation} · ${p.position} · ${clubName}`,
      href:  `#${p.id}`,
    });
  }
}

const out = {
  version:     '1.0',
  lastUpdated: new Date().toISOString().slice(0, 19) + 'Z',
  data:        entries,
};

writeFileSync(join(root, 'data/search-index.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`search-index.json regenerated: ${entries.length} entries (${playerFiles.length} squads populated)`);
