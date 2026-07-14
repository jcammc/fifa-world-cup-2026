/**
 * Gathers match events (goals, cards, subs, formations, lineups, MOTM) from Wikipedia WC 2026.
 * Writes to data/match-events.json.
 *
 * Run: npm run gather-match-events
 * Idempotent: skips matches where both MOTM and lineup are already populated.
 *
 * Data sources:
 *   - {{#invoke:football box|main}} template: goals, MOTM
 *   - {| width="100%" lineup table: starting XI, formations, yellow/red cards, substitutions
 *
 * Minute format: preserved as string ("45+2", "90+6") — never flattened.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

const WIKI_API  = 'https://en.wikipedia.org/w/api.php';
const DELAY_MS  = 1500;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
// Returns array of { box, afterText } where afterText is between this box's end
// and the next box's start (used for MOTM extraction and lineup table parsing).
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
function extractMotm(afterText) {
  const m = afterText.match(/Man of the Match['']{0,3}:?['']{0,3}\s*<br\s*\/?>\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/i);
  if (!m) return null;
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

function stripLinks(text) {
  return text
    .replace(/\[\[(?:[^\]|]+)\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/'{2,}/g, '')
    .trim();
}

function parseGoals(goalsParam, teamId) {
  if (!goalsParam || !goalsParam.trim()) return [];
  const events = [];

  const lines = goalsParam
    .split(/\n|<br\s*\/?>/gi)
    .map(l => l.trim())
    .filter(l => l.startsWith('*') || /\d+[\+\d]*['′]/.test(l));

  for (const line of lines) {
    const text = line.replace(/^\*+/, '').trim();
    if (!text) continue;

    const minuteMatches = [...text.matchAll(/(\d+(?:\+\d+)?)['′]/g)];
    if (minuteMatches.length === 0) continue;

    const nameText = text.slice(0, minuteMatches[0].index).trim();
    const scorer   = stripLinks(nameText) || null;

    for (const m of minuteMatches) {
      events.push({ type: 'goal', minute: m[1], teamId, scorer, assistBy: null });
    }
  }

  return events;
}

function extractFIFACode(teamParam) {
  const m = teamParam.match(/\{\{#invoke:flag\|fb(?:-rt)?\|([A-Z]{2,3})\}\}/i);
  return m ? m[1].toUpperCase() : null;
}

function extractDate(dateParam) {
  const m = dateParam.match(/\{\{Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})/i);
  if (!m) return null;
  const y = m[1], mo = m[2].padStart(2, '0'), d = m[3].padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

// ── Lineup table parsing ──────────────────────────────────────────────────────

// Position tier mapping for formation derivation.
const POS_TIER = {
  GK: 'gk',
  // Defenders
  CB: 'def', CD: 'def', SW: 'def',
  LB: 'def', RB: 'def', LWB: 'def', RWB: 'def', WB: 'def',
  // Midfielders
  DM: 'mid', CDM: 'mid', CM: 'mid', MF: 'mid',
  LM: 'mid', RM: 'mid', AM: 'mid', CAM: 'mid', OM: 'mid',
  // Forwards
  CF: 'fwd', ST: 'fwd', SS: 'fwd', FW: 'fwd',
  LW: 'fwd', RW: 'fwd', LF: 'fwd', RF: 'fwd', WF: 'fwd',
};

function deriveFormation(starters) {
  let def = 0, mid = 0, fwd = 0;
  for (const p of starters) {
    const tier = POS_TIER[p.pos];
    if (tier === 'def') def++;
    else if (tier === 'mid') mid++;
    else if (tier === 'fwd') fwd++;
  }
  if (def + mid + fwd === 0) return null;
  return `${def}-${mid}-${fwd}`;
}

// Parse one side (home or away) of the lineup table inner wiki table.
function parseLineupSide(tableText, teamId) {
  const starters = [];
  const subs     = [];
  const events   = [];
  let   inSubs   = false;

  for (const rawLine of tableText.split('\n')) {
    const line = rawLine.trim();

    if (/'''Substitutions:?'''/.test(line) || /colspan[^|]*\|.*Substitution/.test(line)) {
      inSubs = true;
      continue;
    }
    if (/'''Manager:?'''/.test(line) || /colspan[^|]*\|.*Manager/.test(line)) break;

    // Player row: |POS ||'''N'''||[[Name...]] || ... events ...
    const playerMatch = line.match(/^\|([A-Z]+)\s*\|\|'''(\d+)'''\s*\|\|(.*)/);
    if (!playerMatch) continue;

    const pos   = playerMatch[1].toUpperCase();
    const shirt = parseInt(playerMatch[2], 10);
    const rest  = playerMatch[3];

    // Extract player name from wiki link
    const linkMatch = rest.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (!linkMatch) continue;

    let name = linkMatch[2] || linkMatch[1];
    // Strip disambiguation suffix from page titles that have no display text
    if (!linkMatch[2]) name = name.replace(/\s*\([^)]+\)$/, '');
    name = name.replace(/_/g, ' ').trim();
    if (!name) continue;

    // Extract event templates from the line
    const yelMatch    = rest.match(/\{\{yel\|(\d+(?:\+\d+)?)\}\}/i);
    const redMatch    = rest.match(/\{\{sent off\|[^|]*\|(\d+(?:\+\d+)?)\}\}/i);
    const subOffMatch = rest.match(/\{\{suboff\|(\d+(?:\+\d+)?)\}\}/i);
    const subOnMatch  = rest.match(/\{\{subon\|(\d+(?:\+\d+)?)\}\}/i);

    if (yelMatch) {
      events.push({ type: 'yellow_card', minute: yelMatch[1], teamId, player: name });
    }
    if (redMatch) {
      events.push({ type: 'red_card', minute: redMatch[1], teamId, player: name });
    }

    if (!inSubs) {
      const player = { name, pos, shirt };
      if (subOffMatch) player.subOffMinute = subOffMatch[1];
      starters.push(player);
    } else {
      const player = { name, pos, shirt };
      if (subOnMatch) player.onMinute = subOnMatch[1];
      subs.push(player);
    }
  }

  return { starters, subs, events };
}

// Pair subbed-off starters with subbed-on players by minute and order.
function buildSubstitutionEvents(starters, subs, teamId) {
  const events  = [];
  const offByMin = new Map();
  const onByMin  = new Map();

  for (const p of starters) {
    if (!p.subOffMinute) continue;
    if (!offByMin.has(p.subOffMinute)) offByMin.set(p.subOffMinute, []);
    offByMin.get(p.subOffMinute).push(p.name);
  }
  for (const p of subs) {
    if (!p.onMinute) continue;
    if (!onByMin.has(p.onMinute)) onByMin.set(p.onMinute, []);
    onByMin.get(p.onMinute).push(p.name);
  }

  for (const [minute, offPlayers] of offByMin) {
    const onPlayers = onByMin.get(minute) ?? [];
    for (let i = 0; i < offPlayers.length; i++) {
      events.push({
        type:      'substitution',
        minute,
        teamId,
        offPlayer: offPlayers[i],
        onPlayer:  onPlayers[i] ?? null,
      });
    }
  }

  return events;
}

// Use brace-tracking to find the closing |} of a wiki table starting at `start`.
function findTableEnd(text, start) {
  let depth = 0;
  let i     = start;
  while (i < text.length) {
    if (text[i] === '{' && text[i + 1] === '|') { depth++; i += 2; }
    else if (text[i] === '|' && text[i + 1] === '}') {
      depth--;
      i += 2;
      if (depth === 0) return i;
    } else { i++; }
  }
  return text.length;
}

// Find and parse the {| width="100%" lineup table in the afterText.
// Returns { home, away } where each is { starters, subs, events }, or null.
function parseLineupTable(afterText, homeTeamId, awayTeamId) {
  const outerStart = afterText.indexOf('{| width="100%"');
  if (outerStart === -1) return null;

  const segment = afterText.slice(outerStart);

  // Find the two inner lineup tables (font-size:90%) — first is home, second is away.
  const innerMarker = '{| style="font-size:90%';
  const innerStarts = [];
  let   search      = 0;

  while (innerStarts.length < 2) {
    const idx = segment.indexOf(innerMarker, search);
    if (idx === -1) break;
    innerStarts.push(idx);
    search = idx + 1;
  }

  if (innerStarts.length < 2) return null;

  const homeTableText = segment.slice(innerStarts[0], findTableEnd(segment, innerStarts[0]));
  const awayTableText = segment.slice(innerStarts[1], findTableEnd(segment, innerStarts[1]));

  const home = parseLineupSide(homeTableText, homeTeamId);
  const away = parseLineupSide(awayTableText, awayTeamId);

  return { home, away };
}

// ── FIFA code → internal team ID ──────────────────────────────────────────────

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
  DRC: 'dr-congo',      CRC: 'costa-rica',    JAM: 'jamaica',
  HON: 'honduras',      HAI: 'haiti',         PAN: 'panama',
  CZE: 'czech-republic', CUW: 'curacao',      JOR: 'jordan',
};

// ── Fixture index ─────────────────────────────────────────────────────────────

function buildFixtureIndex(fixtures) {
  const byDateTeams = new Map();
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

  let key = `${date}:${sorted}`;
  if (index.byDateTeams.has(key)) return index.byDateTeams.get(key);

  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextStr = next.toISOString().slice(0, 10);
  key = `${nextStr}:${sorted}`;
  if (index.byDateTeams.has(key)) return index.byDateTeams.get(key);

  const same = [...(index.byDate.get(date) || []), ...(index.byDate.get(nextStr) || [])];
  if (same.length === 1) return same[0];

  return null;
}

// ── Pages to scrape ───────────────────────────────────────────────────────────

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
  // Wikipedia merged R16/QF/SF into one article after the Round of 32 concluded;
  // the old per-round titles (round_of_16, quarter-finals, semi-finals) now just
  // redirect here, and action=parse doesn't follow redirects, so a stale title
  // silently returns the empty redirect stub (0 boxes) instead of erroring.
  '2026_FIFA_World_Cup_knockout_stage',
  '2026_FIFA_World_Cup_final',
];

// ── Result categories ─────────────────────────────────────────────────────────

const RESULT = {
  POPULATED:            'populated',
  SKIPPED:              'skipped',
  RATE_LIMITED:         'rate_limited',
  PAGE_MISSING:         'page_missing',
  FETCH_ERROR:          'fetch_error',
  INCOMPLETE_TEMPLATE:  'incomplete_template',
  NO_FIXTURE_MATCH:     'no_fixture_match',
  UNKNOWN_FIFA_CODE:    'unknown_fifa_code',
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const fixtures  = readJson('data/fixtures.json').data;
  const knockout  = readJson('data/knockout.json').data.flatMap(r => r.matches);
  const existing  = readJson('data/match-events.json');

  const allFixtures = [...fixtures, ...knockout];
  const index       = buildFixtureIndex(allFixtures);

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

      if (!code1 || !code2) {
        if (!params['team1'] && !params['team2']) {
          log(RESULT.INCOMPLETE_TEMPLATE, `date=${dateStr ?? 'none'} — team params absent`);
          console.warn(`  ⚠ incomplete template (date=${dateStr}, no team1/team2)`);
        } else {
          const raw1 = params['team1'] ?? 'none';
          const raw2 = params['team2'] ?? 'none';
          if (raw1 && !code1) { log(RESULT.UNKNOWN_FIFA_CODE, `team1="${raw1.slice(0, 60)}"`); }
          if (raw2 && !code2) { log(RESULT.UNKNOWN_FIFA_CODE, `team2="${raw2.slice(0, 60)}"`); }
          console.warn(`  ⚠ unknown FIFA code`);
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

      // Skip only when MOTM and lineup are both already populated.
      const prev = existing.data[fixtureId];
      if (prev && prev.motm !== null && (prev.homeStarting?.length ?? 0) > 0) {
        log(RESULT.SKIPPED, fixtureId);
        continue;
      }

      const teamId1 = FIFA_TO_ID[code1];
      const teamId2 = FIFA_TO_ID[code2];

      // Parse goals from football box
      const goals1 = parseGoals(params['goals1'] || '', teamId1);
      const goals2 = parseGoals(params['goals2'] || '', teamId2);

      // MOTM: box param first, then inter-box text
      const motm = params['motom']
        ? stripLinks(params['motom'])
        : extractMotm(afterText);

      // Parse lineup table from the text after the football box
      const lineup = parseLineupTable(afterText, teamId1, teamId2);

      const lineupFound = !!(lineup?.home?.starters?.length || lineup?.away?.starters?.length);
      if (!lineupFound) {
        console.log(`  ⚠ no lineup table found for ${fixtureId}`);
      }

      // Card and substitution events from lineups
      const cardSubEvents = lineup ? [
        ...lineup.home.events,
        ...lineup.away.events,
        ...buildSubstitutionEvents(lineup.home.starters, lineup.home.subs, teamId1),
        ...buildSubstitutionEvents(lineup.away.starters, lineup.away.subs, teamId2),
      ] : [];

      const sortMin = m => {
        const p = String(m).split('+');
        return parseInt(p[0], 10) * 100 + parseInt(p[1] || 0, 10);
      };

      // Preserve existing goals if re-processing for lineup data and goal parse is empty
      const existingGoals = (prev?.events ?? []).filter(e => e.type === 'goal');
      const goalEvents    = goals1.length + goals2.length > 0
        ? [...goals1, ...goals2]
        : existingGoals;

      const allEvents = [...goalEvents, ...cardSubEvents]
        .sort((a, b) => sortMin(a.minute) - sortMin(b.minute));

      existing.data[fixtureId] = {
        events:        allEvents,
        motm,
        homeFormation: lineup ? (deriveFormation(lineup.home.starters) ?? prev?.homeFormation ?? null)
                               : (prev?.homeFormation ?? null),
        awayFormation: lineup ? (deriveFormation(lineup.away.starters) ?? prev?.awayFormation ?? null)
                               : (prev?.awayFormation ?? null),
        homeStarting:  lineup ? lineup.home.starters.map(p => ({ name: p.name, pos: p.pos, shirt: p.shirt }))
                               : (prev?.homeStarting ?? []),
        awayStarting:  lineup ? lineup.away.starters.map(p => ({ name: p.name, pos: p.pos, shirt: p.shirt }))
                               : (prev?.awayStarting ?? []),
        homeSubs:      lineup ? lineup.home.subs.map(p => ({ name: p.name, pos: p.pos, shirt: p.shirt, onMinute: p.onMinute ?? null }))
                               : (prev?.homeSubs ?? []),
        awaySubs:      lineup ? lineup.away.subs.map(p => ({ name: p.name, pos: p.pos, shirt: p.shirt, onMinute: p.onMinute ?? null }))
                               : (prev?.awaySubs ?? []),
      };

      const isUpdate = prev !== undefined;
      const lineupNote = lineupFound ? `, lineup (${lineup.home.starters.length}+${lineup.away.starters.length})` : '';
      log(RESULT.POPULATED, `${fixtureId} (${goalEvents.length} goals${motm ? ', MOTM' : ''}${lineupNote}${isUpdate ? ' [update]' : ''})`);
      console.log(`  ✓ ${fixtureId} (${goalEvents.length} goals, ${cardSubEvents.length} card/sub events${motm ? ', MOTM' : ''}${lineupNote}${isUpdate ? ' [update]' : ''})`);
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
