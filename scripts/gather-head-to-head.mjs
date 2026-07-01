/**
 * Gathers head-to-head World Cup history narrative text from Wikipedia.
 * For each group match, extracts the paragraph that appears between the
 * ===Team A v Team B=== section heading and the {{#invoke:football box}} call.
 *
 * Writes to data/match-previews.json.
 *
 * Run: npm run gather-head-to-head
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const DELAY_MS = 1500;

function readJson(rel)       { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function writeJson(rel, obj) { writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
function sleep(ms)           { return new Promise(r => setTimeout(r, ms)); }

async function fetchWikitext(page, retries = 3) {
  const url = new URL(WIKI_API);
  url.searchParams.set('action',        'parse');
  url.searchParams.set('prop',          'wikitext');
  url.searchParams.set('page',          page);
  url.searchParams.set('format',        'json');
  url.searchParams.set('formatversion', '2');

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'WorldCup2026App/1.0 (data gathering script)' },
    });
    if (res.status === 429) {
      const wait = attempt * 5000;
      console.warn(`  Rate limited, waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${page}`);
    const data = await res.json();
    if (data.error) throw new Error(`Wikipedia error: ${data.error.info}`);
    return data.parse.wikitext;
  }
  throw new Error(`Wikipedia gave up after ${retries} retries for ${page}`);
}

// Clean wiki markup from a paragraph of text — strip links, templates, bold/italic.
function cleanWikiText(raw) {
  return raw
    // Strip file/image links entirely (they contain thumb/caption text we don't want)
    .replace(/\[\[(?:File|Image|Fichier|Media):[^\]]+\]\]/gi, '')
    // [[Link|Display]] → Display
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    // [[Link]] → Link; strip disambiguation parentheticals
    .replace(/\[\[([^\]]+)\]\]/g, (_, t) => t.replace(/\s*\([^)]+\)$/, ''))
    // {{template}} calls → ''
    .replace(/\{\{[^}]+\}\}/g, '')
    // Bold/italic
    .replace(/'{2,}/g, '')
    // <ref> citations
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>.*?<\/ref>/gis, '')
    // Remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Leftover image positioning fragments (thumb|right|caption, etc.)
    .replace(/\b(?:thumb|right|left|center|upright|frame|none)\|[^|\n]*/g, '')
    // Trailing/leading pipe characters
    .replace(/^\|+/, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract the head-to-head paragraph between a section heading and the football box.
// Returns the cleaned paragraph text, or null if not found.
function extractH2HParagraph(sectionText) {
  // The paragraph is plain prose before the football box call.
  // Find where the football box starts.
  const boxStart = sectionText.toLowerCase().indexOf('{{#invoke:football box');
  const prose = boxStart !== -1 ? sectionText.slice(0, boxStart) : sectionText;

  // Look for lines that look like paragraph text (not wiki markup directives).
  const lines = prose.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('=') && !l.startsWith('{') && !l.startsWith('|')
              && !l.startsWith('!') && !l.startsWith('*') && !l.startsWith('#'));

  const text = cleanWikiText(lines.join(' '));
  return text.length > 20 ? text : null;
}

// Build a lookup: sorted teamId pair → fixture ID.
// e.g. "mexico:south-africa" → "a-r1-mex-rsa"
function buildTeamPairIndex(fixtures, countries) {
  const index = new Map();
  for (const f of fixtures) {
    if (!f.homeTeamId || !f.awayTeamId) continue;
    const key = [f.homeTeamId, f.awayTeamId].sort().join(':');
    index.set(key, f.id);
  }
  return index;
}

// Map common country name variants from Wikipedia section headings → team IDs.
// Wikipedia section headings use official country names, not always our internal IDs.
const NAME_TO_ID = {
  'mexico':           'mexico',
  'south africa':     'south-africa',
  'canada':           'canada',
  'united states':    'usa',
  'usa':              'usa',
  'argentina':        'argentina',
  'brazil':           'brazil',
  'uruguay':          'uruguay',
  'colombia':         'colombia',
  'ecuador':          'ecuador',
  'chile':            'chile',
  'venezuela':        'venezuela',
  'peru':             'peru',
  'paraguay':         'paraguay',
  'bolivia':          'bolivia',
  'france':           'france',
  'spain':            'spain',
  'england':          'england',
  'germany':          'germany',
  'portugal':         'portugal',
  'netherlands':      'netherlands',
  'belgium':          'belgium',
  'italy':            'italy',
  'switzerland':      'switzerland',
  'croatia':          'croatia',
  'poland':           'poland',
  'denmark':          'denmark',
  'sweden':           'sweden',
  'norway':           'norway',
  'austria':          'austria',
  'turkey':           'turkey',
  'serbia':           'serbia',
  'scotland':         'scotland',
  'wales':            'wales',
  'nigeria':          'nigeria',
  'morocco':          'morocco',
  'senegal':          'senegal',
  'egypt':            'egypt',
  'cameroon':         'cameroon',
  "ivory coast":      'ivory-coast',
  "côte d'ivoire":    'ivory-coast',
  'ghana':            'ghana',
  'tunisia':          'tunisia',
  'mali':             'mali',
  'angola':           'angola',
  'algeria':          'algeria',
  'qatar':            'qatar',
  'iran':             'iran',
  'japan':            'japan',
  'south korea':      'south-korea',
  'australia':        'australia',
  'new zealand':      'new-zealand',
  'dr congo':         'dr-congo',
  "democratic republic of the congo": 'dr-congo',
  'saudi arabia':     'saudi-arabia',
  'iraq':             'iraq',
  'united arab emirates': 'uae',
  'uae':              'uae',
  'uzbekistan':       'uzbekistan',
  'cape verde':       'cape-verde',
  'bosnia and herzegovina': 'bosnia-herzegovina',
  'costa rica':       'costa-rica',
  'jamaica':          'jamaica',
  'honduras':         'honduras',
  'haiti':            'haiti',
  'panama':           'panama',
  'czech republic':   'czech-republic',
  'czechia':          'czech-republic',
  'curaçao':          'curacao',
  'curacao':          'curacao',
  'jordan':           'jordan',
};

// Parse a section heading like "===Mexico v South Africa===" and return team IDs.
function parseHeadingTeams(heading) {
  // Remove = signs and trim
  const text = heading.replace(/=+/g, '').trim();
  // Split on " v " or " vs " (case insensitive)
  const parts = text.split(/\s+v(?:s?)\.?\s+/i);
  if (parts.length !== 2) return null;

  const id1 = NAME_TO_ID[parts[0].trim().toLowerCase()];
  const id2 = NAME_TO_ID[parts[1].trim().toLowerCase()];

  if (!id1 || !id2) return null;
  return [id1, id2];
}

// Extract all match sections from a Wikipedia group/round page wikitext.
// Returns array of { heading, sectionText } where sectionText is the content
// between this heading and the next same-level heading.
function extractMatchSections(wikitext) {
  const sections = [];
  // Match lines that are ===Level 3=== headings (match headings in group pages)
  const headingRe = /^(={3})([^=]+)\1\s*$/gm;
  const matches   = [...wikitext.matchAll(headingRe)];

  for (let i = 0; i < matches.length; i++) {
    const m      = matches[i];
    const nextM  = matches[i + 1];
    const start  = m.index + m[0].length;
    const end    = nextM ? nextM.index : wikitext.length;
    sections.push({
      heading:     m[0].trim(),
      sectionText: wikitext.slice(start, end),
    });
  }

  return sections;
}

const GROUP_PAGES = [
  '2026_FIFA_World_Cup_Group_A', '2026_FIFA_World_Cup_Group_B',
  '2026_FIFA_World_Cup_Group_C', '2026_FIFA_World_Cup_Group_D',
  '2026_FIFA_World_Cup_Group_E', '2026_FIFA_World_Cup_Group_F',
  '2026_FIFA_World_Cup_Group_G', '2026_FIFA_World_Cup_Group_H',
  '2026_FIFA_World_Cup_Group_I', '2026_FIFA_World_Cup_Group_J',
  '2026_FIFA_World_Cup_Group_K', '2026_FIFA_World_Cup_Group_L',
];

const KNOCKOUT_PAGES = [
  '2026_FIFA_World_Cup_round_of_32',
  '2026_FIFA_World_Cup_round_of_16',
  '2026_FIFA_World_Cup_quarter-finals',
  '2026_FIFA_World_Cup_semi-finals',
  '2026_FIFA_World_Cup_Final',
];

async function main() {
  const fixtures  = readJson('data/fixtures.json').data;
  const knockout  = readJson('data/knockout.json').data.flatMap(r => r.matches);
  const countries = readJson('data/countries.json').data;

  const allFixtures = [...fixtures, ...knockout];
  const pairIndex   = buildTeamPairIndex(allFixtures, countries);
  const statusMap   = new Map(allFixtures.map(f => [f.id, f.status]));

  // Load or initialise the output file
  const outputPath = 'data/match-previews.json';
  const existing   = existsSync(resolve(ROOT, outputPath))
    ? readJson(outputPath)
    : { version: '1.0', lastUpdated: '', data: {} };

  // Migrate: move headToHead → matchStory for any FT fixtures already in the file
  let migrated = 0;
  for (const [id, entry] of Object.entries(existing.data)) {
    if (entry.headToHead && statusMap.get(id) === 'FT') {
      entry.matchStory  = entry.headToHead;
      entry.headToHead  = '';
      migrated++;
    }
  }
  if (migrated > 0) console.log(`Migrated ${migrated} headToHead → matchStory entries`);

  let populated = 0, skipped = 0, noText = 0, noMatch = 0;

  async function processPage(page, headingLevel = 3) {
    console.log(`\nFetching: ${page}`);

    let wikitext;
    try {
      wikitext = await fetchWikitext(page);
    } catch (err) {
      console.warn(`  ✗ ${err.message}`);
      return;
    }

    const sections = extractMatchSections(wikitext);
    console.log(`  Found ${sections.length} level-3 section(s)`);

    for (const { heading, sectionText } of sections) {
      const teams = parseHeadingTeams(heading);
      if (!teams) continue; // not a match heading (e.g. "Match officials")

      const [id1, id2] = teams;
      const key        = [id1, id2].sort().join(':');
      const fixtureId  = pairIndex.get(key);

      if (!fixtureId) {
        console.log(`  ⚠ no fixture for ${heading.replace(/=+/g, '').trim()}`);
        noMatch++;
        continue;
      }

      const status    = statusMap.get(fixtureId) ?? 'scheduled';
      const isFT      = status === 'FT';
      const targetKey = isFT ? 'matchStory' : 'headToHead';
      const entry     = existing.data[fixtureId] ?? {};

      // Skip if target field already populated (idempotent)
      if (entry[targetKey]) {
        skipped++;
        continue;
      }

      const text = extractH2HParagraph(sectionText);
      if (!text) {
        console.log(`  ⚠ no h2h text found for ${fixtureId}`);
        noText++;
        continue;
      }

      existing.data[fixtureId] = { ...entry, [targetKey]: text, source: 'Wikipedia' };
      console.log(`  ✓ ${fixtureId} [${targetKey}]: "${text.slice(0, 80)}..."`);
      populated++;
    }

    await sleep(DELAY_MS);
  }

  for (const page of [...GROUP_PAGES, ...KNOCKOUT_PAGES]) {
    await processPage(page);
  }

  existing.lastUpdated = new Date().toISOString();
  writeJson(outputPath, existing);

  console.log('\n' + '─'.repeat(60));
  console.log('  HEAD-TO-HEAD GATHER SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  ✓ Populated  : ${populated}`);
  console.log(`  · Skipped    : ${skipped}`);
  console.log(`  ⚠ No text    : ${noText}`);
  console.log(`  ⚠ No fixture : ${noMatch}`);
  console.log(`  Total entries: ${Object.keys(existing.data).length}`);
  console.log('─'.repeat(60));
}

main().catch(err => {
  console.error('gather-head-to-head failed:', err);
  process.exit(1);
});
