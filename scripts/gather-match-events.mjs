/**
 * Gathers match events (goals, MOTM, formations) from Wikipedia WC 2026 group pages.
 * Writes to data/match-events.json.
 *
 * Run: npm run gather-match-events
 * Idempotent: skips matches already in match-events.json.
 *
 * Data source: Wikipedia {{#invoke:football box|main}} templates on group/round pages.
 * Each template contains: goals (scorer + minute), teams, date, score.
 * Lineup, formation, subs may be absent — gracefully skipped.
 *
 * Minute format: preserved as string ("45+2", "90+6") — never flattened.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

const WIKI_API  = 'https://en.wikipedia.org/w/api.php';
const DELAY_MS  = 1500; // Be polite to Wikipedia

// ── Helpers ──────────────────────────────────────────────────────────────────

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
      console.warn(`  Rate limited (429), waiting ${wait / 1000}s before retry ${attempt}/${retries}...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status} for ${page}`);
    const data = await res.json();
    if (data.error) throw new Error(`Wikipedia error for ${page}: ${data.error.info}`);
    return data.parse.wikitext;
  }
  throw new Error(`Wikipedia: gave up after ${retries} retries for ${page}`);
}

// ── Template extraction ───────────────────────────────────────────────────────

// Find all {{#invoke:football box|main ...}} blocks in wikitext, brace-tracking.
// Returns array of { box: string, afterText: string } where afterText is the wikitext
// between this box's end and the next box's start (used to extract MOTM).
function extractFootballBoxes(wikitext) {
  const spans = [];
  let   pos   = 0;

  while (pos < wikitext.length) {
    const start = wikitext.toLowerCase().indexOf('{{#invoke:football box|main', pos);
    if (start === -1) break;

    let depth = 0;
    let i     = start;
    while (i < wikitext.length) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') { depth++; i += 2; }
      else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
        depth--;
        i += 2;
        if (depth === 0) break;
      } else { i++; }
    }

    spans.push({ start, end: i });
    pos = i;
  }

  return spans.map((span, idx) => ({
    box:       wikitext.slice(span.start, span.end),
    afterText: wikitext.slice(span.end, idx + 1 < spans.length ? spans[idx + 1].start : undefined),
  }));
}

// Extract Man of the Match name from the inter-box text.
// Wikipedia format: '''Man of the Match:'''\n<br />[[Player Name|Display]] (Country)
function extractMotm(afterText) {
  const m = afterText.match(/Man of the Match['']{0,3}:?['']{0,3}\s*<br\s*\/?>\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/i);
  if (!m) return null;
  // m[2] is the display name (if piped link), m[1] is the page name
  return (m[2] || m[1]).trim();
}

// Split a string by `|` at the top level (not inside {{ }}, [[ ]]).
function splitTopLevel(str, sep = '|') {
  const parts = [];
  let depth   = 0;
  let buf     = '';

  for (let i = 0; i < str.length; i++) {
    const c = str[i], n = str[i + 1];
    if ((c === '{' || c === '[') && c === n) { depth++; buf += c + n; i++; }
    else if ((c === '}' || c === ']') && c === n) { depth--; buf += c + n; i++; }
    else if (c === sep && depth === 0) { parts.push(buf); buf = ''; }
    else { buf += c; }
  }
  if (buf) parts.push(buf);
  return parts;
}

// Parse a football box block into a key→value map.
function parseBox(box) {
  const params  = {};
  // Everything after the first newline
  const inner   = box.slice(box.indexOf('\n'));
  const parts   = splitTopLevel(inner);

  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).replace(/^\s*\|/, '').trim().toLowerCase();
    const val = part.slice(eq + 1).trim();
    params[key] = val;
  }
  return params;
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

// Strip [[Link|Display]] → Display, [[Link]] → Link, and other wiki markup.
function stripLinks(text) {
  return text
    .replace(/\[\[(?:[^\]|]+)\|([^\]]+)\]\]/g, '$1') // [[Link|Display]] → Display
    .replace(/\[\[([^\]]+)\]\]/g, '$1')               // [[Link]] → Link
    .replace(/\{\{[^}]*\}\}/g, '')                    // {{template}} → ''
    .replace(/'{2,}/g, '')                            // bold/italic markup
    .trim();
}

// Parse a goals parameter value into event objects.
// Wikipedia format: lines starting with * then player name then minute'
// e.g. "*[[Julián Quiñones|Quiñones]] 9'\n*[[Raúl Jiménez|Jiménez]] 67'"
// Minute may be "45+2'" or "90+6'" — preserved as string.
function parseGoals(goalsParam, teamId) {
  if (!goalsParam || !goalsParam.trim()) return [];
  const events = [];

  // Split on list items (* or newlines) and <br> tags
  const lines = goalsParam
    .split(/\n|<br\s*\/?>/gi)
    .map(l => l.trim())
    .filter(l => l.startsWith('*') || /\d+[\+\d]*['′]/.test(l));

  for (const line of lines) {
    // Remove leading * and wiki list markup
    const text = line.replace(/^\*+/, '').trim();
    if (!text) continue;

    // Extract minute: a number (with optional +extras) followed by ' or ′ (prime)
    // Must be the LAST occurrence in the line (final goal time)
    const minuteMatches = [...text.matchAll(/(\d+(?:\+\d+)?)['′]/g)];

    if (minuteMatches.length === 0) continue;

    // If multiple goals by same player on one line (e.g. "Mbappé 14' 78'"), emit each
    // Otherwise single goal
    const nameText = text.slice(0, minuteMatches[0].index).trim();
    const scorer   = stripLinks(nameText) || null;

    for (const m of minuteMatches) {
      events.push({
        type:     'goal',
        minute:   m[1],         // string, e.g. "45+2"
        teamId,
        scorer,
        assistBy: null,
      });
    }
  }

  return events;
}

// Extract the 3-letter FIFA code from {{#invoke:flag|fb-rt|MEX}} or {{#invoke:flag|fb|RSA}}.
function extractFIFACode(teamParam) {
  const m = teamParam.match(/\{\{#invoke:flag\|fb(?:-rt)?\|([A-Z]{2,3})\}\}/i);
  return m ? m[1].toUpperCase() : null;
}

// Extract date string "YYYY-MM-DD" from {{Start date|2026|6|11}}.
function extractDate(dateParam) {
  const m = dateParam.match(/\{\{Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})/i);
  if (!m) return null;
  const y = m[1], mo = m[2].padStart(2, '0'), d = m[3].padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

// ── FIFA code → internal team ID ─────────────────────────────────────────────
// Full 48-team WC 2026 mapping using FIFA 3-letter codes.
const FIFA_TO_ID = {
  MEX: 'mexico',        CAN: 'canada',        USA: 'usa',
  ARG: 'argentina',     BRA: 'brazil',        URU: 'uruguay',
  COL: 'colombia',      ECU: 'ecuador',       CHI: 'chile',
  VEN: 'venezuela',     PER: 'peru',          PAR: 'paraguay',
  BOL: 'bolivia',       FRA: 'france',        ESP: 'spain',
  ENG: 'england',       GER: 'germany',       POR: 'portugal',
  NED: 'netherlands',   BEL: 'belgium',       ITA: 'italy',
  SUI: 'switzerland',   CRO: 'croatia',       POL: 'poland',
  DEN: 'denmark',       SWE: 'sweden',        NOR: 'norway',
  AUT: 'austria',       TUR: 'turkey',        SRB: 'serbia',
  SCO: 'scotland',      WAL: 'wales',         NGA: 'nigeria',
  MAR: 'morocco',       SEN: 'senegal',       EGY: 'egypt',
  CMR: 'cameroon',      CIV: 'ivory-coast',   GHA: 'ghana',
  TUN: 'tunisia',       MLI: 'mali',          RSA: 'south-africa',
  ANG: 'angola',        ALG: 'algeria',       QAT: 'qatar',
  IRN: 'iran',          JPN: 'japan',         KOR: 'south-korea',
  AUS: 'australia',     NZL: 'new-zealand',   COD: 'dr-congo',
  KSA: 'saudi-arabia',  IRQ: 'iraq',          UAE: 'uae',
  UZB: 'uzbekistan',    CPV: 'cape-verde',    BIH: 'bosnia-herzegovina',
  // Additional codes that may appear
  DRC: 'dr-congo',      CRC: 'costa-rica',    JAM: 'jamaica',
  HON: 'honduras',      HAI: 'haiti',         PAN: 'panama',
  CZE: 'czech-republic', CUW: 'curacao',      JOR: 'jordan',
};

// ── Fixture index ─────────────────────────────────────────────────────────────

function buildFixtureIndex(fixtures, countries) {
  const countryMap = new Map(countries.map(c => [c.id, c]));
  // Key: YYYY-MM-DD:teamId:teamId (sorted alphabetically)
  const byDateTeams = new Map();
  // Key: YYYY-MM-DD (for fallback when only 1 match on a date)
  const byDate      = new Map();

  for (const f of fixtures) {
    if (!f.kickoff) continue;
    const date = f.kickoff.slice(0, 10);
    const key  = `${date}:${[f.homeTeamId, f.awayTeamId].sort().join(':')}`;
    byDateTeams.set(key, f.id);

    const existing = byDate.get(date) || [];
    existing.push(f.id);
    byDate.set(date, existing);
  }

  return { byDateTeams, byDate };
}

function findFixtureId(date, code1, code2, index) {
  const id1 = FIFA_TO_ID[code1];
  const id2 = FIFA_TO_ID[code2];
  if (!id1 || !id2) return null;

  const sorted = [id1, id2].sort().join(':');

  // Try exact date first (Wikipedia local date matches UTC kickoff date)
  let key = `${date}:${sorted}`;
  if (index.byDateTeams.has(key)) return index.byDateTeams.get(key);

  // Wikipedia uses US local dates; late-night kickoffs (after ~20:00 UTC)
  // fall into the next UTC day. Try date + 1.
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextStr = next.toISOString().slice(0, 10);
  key = `${nextStr}:${sorted}`;
  if (index.byDateTeams.has(key)) return index.byDateTeams.get(key);

  // Fallback: single match on either date
  const same = [...(index.byDate.get(date) || []), ...(index.byDate.get(nextStr) || [])];
  if (same.length === 1) return same[0];

  return null;
}

// ── Pages to scrape ──────────────────────────────────────────────────────────

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
];

// ── Result categories ─────────────────────────────────────────────────────────
const RESULT = {
  POPULATED:            'populated',           // successfully written to JSON
  SKIPPED:              'skipped',             // already present, not re-fetched
  RATE_LIMITED:         'rate_limited',        // Wikipedia 429, gave up after retries
  PAGE_MISSING:         'page_missing',        // Wikipedia page not found / error
  FETCH_ERROR:          'fetch_error',         // other HTTP / network error
  INCOMPLETE_TEMPLATE:  'incomplete_template', // box parsed but missing team1/team2
  NO_FIXTURE_MATCH:     'no_fixture_match',    // teams found but no fixture in our data
  UNKNOWN_FIFA_CODE:    'unknown_fifa_code',   // FIFA code not in FIFA_TO_ID map
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const fixtures  = readJson('data/fixtures.json').data;
  const knockout  = readJson('data/knockout.json').data
    .flatMap(r => r.matches);
  const countries = readJson('data/countries.json').data;
  const existing  = readJson('data/match-events.json');

  const allFixtures = [...fixtures, ...knockout];
  const index       = buildFixtureIndex(allFixtures, countries);

  // Per-page result log: { page, results: Map<RESULT, string[]> }
  const pageLog = [];

  async function processPage(page) {
    const results = new Map(Object.values(RESULT).map(r => [r, []]));
    const log = (cat, detail) => results.get(cat).push(detail);

    console.log(`\nFetching: ${page}`);

    let wikitext;
    try {
      wikitext = await fetchWikitext(page);
    } catch (err) {
      const cat = err.message.includes('gave up after') ? RESULT.RATE_LIMITED
                : err.message.includes('error') ? RESULT.PAGE_MISSING
                : RESULT.FETCH_ERROR;
      log(cat, err.message);
      console.warn(`  ✗ ${err.message}`);
      pageLog.push({ page, results });
      return;
    }

    const boxes = extractFootballBoxes(wikitext);
    console.log(`  Found ${boxes.length} football box(es)`);

    for (const { box, afterText } of boxes) {
      const params = parseBox(box);

      const dateStr = params['date']  ? extractDate(params['date'])  : null;
      const code1   = params['team1'] ? extractFIFACode(params['team1']) : null;
      const code2   = params['team2'] ? extractFIFACode(params['team2']) : null;

      // Detect incomplete template (section-transcluded content on page)
      if (!code1 || !code2) {
        if (!params['team1'] && !params['team2']) {
          log(RESULT.INCOMPLETE_TEMPLATE, `date=${dateStr ?? 'none'} — team params absent (section transclusion?)`);
          console.warn(`  ⚠ incomplete template (date=${dateStr}, no team1/team2)`);
        } else {
          // Team params exist but FIFA code extraction failed
          const raw1 = params['team1'] ?? 'none';
          const raw2 = params['team2'] ?? 'none';
          if (raw1 && !code1) {
            log(RESULT.UNKNOWN_FIFA_CODE, `team1="${raw1.slice(0, 60)}"`);
            console.warn(`  ⚠ unknown FIFA code: team1="${raw1.slice(0, 60)}"`);
          }
          if (raw2 && !code2) {
            log(RESULT.UNKNOWN_FIFA_CODE, `team2="${raw2.slice(0, 60)}"`);
            console.warn(`  ⚠ unknown FIFA code: team2="${raw2.slice(0, 60)}"`);
          }
        }
        continue;
      }

      if (!FIFA_TO_ID[code1] || !FIFA_TO_ID[code2]) {
        const missing = [!FIFA_TO_ID[code1] && code1, !FIFA_TO_ID[code2] && code2].filter(Boolean);
        log(RESULT.UNKNOWN_FIFA_CODE, missing.join(', '));
        console.warn(`  ⚠ FIFA code not in ID map: ${missing.join(', ')}`);
        continue;
      }

      const fixtureId = findFixtureId(dateStr, code1, code2, index);
      if (!fixtureId) {
        log(RESULT.NO_FIXTURE_MATCH, `${dateStr} ${code1} vs ${code2}`);
        console.warn(`  ⚠ no fixture for ${dateStr} ${code1} vs ${code2}`);
        continue;
      }

      // Skip only when both events and MOTM are already populated.
      // Re-process if MOTM is still null so a re-run can fill it in.
      const prev = existing.data[fixtureId];
      if (prev && prev.motm !== null) {
        log(RESULT.SKIPPED, fixtureId);
        continue;
      }

      const teamId1 = FIFA_TO_ID[code1];
      const teamId2 = FIFA_TO_ID[code2];

      const goals1 = parseGoals(params['goals1'] || '', teamId1);
      const goals2 = parseGoals(params['goals2'] || '', teamId2);

      const sortMin = m => {
        const p = String(m).split('+');
        return parseInt(p[0], 10) * 100 + parseInt(p[1] || 0, 10);
      };
      const allEvents = [...goals1, ...goals2].sort((a, b) => sortMin(a.minute) - sortMin(b.minute));

      // MOTM: try box param first (older Wikipedia format), then inter-box text pattern
      const motm = params['motom']
        ? stripLinks(params['motom'])
        : extractMotm(afterText);

      // Preserve existing events if re-processing for MOTM-only update
      const existingEvents = prev?.events ?? [];
      const newEvents = allEvents.length > 0 ? allEvents : existingEvents;

      existing.data[fixtureId] = {
        events:        newEvents,
        motm,
        homeFormation: params['formation1'] ? params['formation1'].trim() : null,
        awayFormation: params['formation2'] ? params['formation2'].trim() : null,
        homeStarting:  [],
        awayStarting:  [],
      };

      const isUpdate = prev !== undefined;
      log(RESULT.POPULATED, `${fixtureId} (${newEvents.length} goals${motm ? ', MOTM: ' + motm : ''}${isUpdate ? ' [update]' : ''})`);
      console.log(`  ✓ ${fixtureId} (${newEvents.length} goals${motm ? ', MOTM' : ''}${isUpdate ? ' [update]' : ''})`);
    }

    pageLog.push({ page, results });
    await sleep(DELAY_MS);
  }

  for (const page of [...GROUP_PAGES, ...KNOCKOUT_PAGES]) {
    await processPage(page);
  }

  existing.lastUpdated = new Date().toISOString();
  writeJson('data/match-events.json', existing);

  // ── Summary report ────────────────────────────────────────────────────────
  const totals = new Map(Object.values(RESULT).map(r => [r, 0]));
  for (const { results } of pageLog) {
    for (const [cat, items] of results) {
      totals.set(cat, totals.get(cat) + items.length);
    }
  }

  const totalEntries = Object.keys(existing.data).length;

  console.log('\n' + '─'.repeat(60));
  console.log('  GATHER SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  match-events.json total entries : ${totalEntries}`);
  console.log('─'.repeat(60));

  const labels = {
    [RESULT.POPULATED]:           '  ✓ Newly populated    ',
    [RESULT.SKIPPED]:             '  · Already present   ',
    [RESULT.RATE_LIMITED]:        '  ✗ Rate limited (429) ',
    [RESULT.PAGE_MISSING]:        '  ✗ Page missing/error ',
    [RESULT.FETCH_ERROR]:         '  ✗ Fetch error        ',
    [RESULT.INCOMPLETE_TEMPLATE]: '  ⚠ Incomplete template',
    [RESULT.NO_FIXTURE_MATCH]:    '  ⚠ No fixture match   ',
    [RESULT.UNKNOWN_FIFA_CODE]:   '  ⚠ Unknown FIFA code  ',
  };

  for (const [cat, count] of totals) {
    if (count > 0) console.log(`${labels[cat]} : ${count}`);
  }

  // Detail lines for anything that needs attention
  const attention = [
    RESULT.RATE_LIMITED, RESULT.PAGE_MISSING, RESULT.FETCH_ERROR,
    RESULT.INCOMPLETE_TEMPLATE, RESULT.NO_FIXTURE_MATCH, RESULT.UNKNOWN_FIFA_CODE,
  ];
  const hasDetail = pageLog.some(({ results }) =>
    attention.some(cat => results.get(cat).length > 0)
  );

  if (hasDetail) {
    console.log('\n  Pages needing attention:');
    for (const { page, results } of pageLog) {
      const issues = attention.flatMap(cat =>
        results.get(cat).map(d => `${cat}: ${d}`)
      );
      if (issues.length) {
        const shortPage = page.replace('2026_FIFA_World_Cup_', '');
        console.log(`\n  ${shortPage}`);
        issues.forEach(i => console.log(`    → ${i}`));
      }
    }
  }

  console.log('─'.repeat(60));
}

main().catch(err => {
  console.error('gather-match-events failed:', err);
  process.exit(1);
});
