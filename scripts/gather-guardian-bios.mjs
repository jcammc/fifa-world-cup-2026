/**
 * Fetches player bio descriptions from The Guardian's WC 2026 player guide.
 * Updates the `description` field in data/players/{team}.json for matched players.
 *
 * Run: node scripts/gather-guardian-bios.mjs
 *
 * The player guide's own page is behind an anti-bot CDN, but each team's
 * player data is backed by its own Google Sheet, served as static JSON by
 * Guardian's own docsdata CDN — no auth, no anti-bot, no browser needed:
 *
 *   https://interactive.guim.co.uk/docsdata/{spreadsheetId}.json
 *
 * The per-team spreadsheet IDs come from `data/guardian-teams-raw.json`
 * (a one-time manual DevTools capture of the guide's "Teams" sheet — see
 * that file's `sheets.Teams[].spreadsheet` field). This script fetches all
 * 48 team player-sheets directly from that CDN and never needs to touch the
 * page itself.
 *
 * If `data/guardian-teams-raw.json` is missing, the script exits with
 * instructions for the one-time manual DevTools capture.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

function readJson(rel) { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function sleep(ms)           { return new Promise(r => setTimeout(r, ms)); }

// ── Fetch strategy ────────────────────────────────────────────────────────────

const GUARDIAN_URL     = 'https://www.theguardian.com/football/ng-interactive/2026/jun/04/world-cup-2026-complete-player-guide';
const TEAMS_RAW_PATH   = 'data/guardian-teams-raw.json';
const DOCSDATA_URL     = id => `https://interactive.guim.co.uk/docsdata/${id}.json`;

const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept':          'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.5',
};

// Fetch a single team's Players sheet from Guardian's docsdata CDN.
async function fetchTeamSheet(spreadsheetId, attempt = 1) {
  try {
    const res = await fetch(DOCSDATA_URL(spreadsheetId), { headers: BROWSER_HEADERS });
    if (res.ok) return await res.json();
    if (res.status === 429 && attempt <= 3) {
      await sleep(attempt * 2000);
      return fetchTeamSheet(spreadsheetId, attempt + 1);
    }
    return null;
  } catch {
    if (attempt <= 3) {
      await sleep(attempt * 2000);
      return fetchTeamSheet(spreadsheetId, attempt + 1);
    }
    return null;
  }
}

// ── Player extraction ─────────────────────────────────────────────────────────

// Guardian interactives use various JSON shapes. Walk common paths to find
// an array of player objects.
function findPlayerArray(obj, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(obj)) {
    // Check if this looks like a player array (objects with name + some text field)
    if (obj.length > 10 && obj[0] && typeof obj[0].name === 'string') return obj;
    for (const item of obj) {
      const found = findPlayerArray(item, depth + 1);
      if (found) return found;
    }
  }
  if (obj && typeof obj === 'object') {
    for (const val of Object.values(obj)) {
      const found = findPlayerArray(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Extract a bio description from a Guardian player object.
// Common field names observed in Guardian interactives.
function extractBio(player) {
  const candidates = [
    player.description, player.bio, player.text, player.summary,
    player.blurb, player.copy, player.body, player.profile,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim().length > 20) return c.trim();
  }
  return null;
}

// Extract the player's name from a Guardian player object.
function extractName(player) {
  return player.name || player.playerName || player.fullName || null;
}

// ── Name matching ─────────────────────────────────────────────────────────────

// Normalise a name for fuzzy matching: lowercase, strip accents, strip punctuation.
function normaliseName(name) {
  return name
    .toLowerCase()
    .replace(/ı/g, 'i')  // Turkish dotless i has no NFD decomposition, would otherwise be dropped
    .replace(/ß/g, 'ss') // German sharp s has no NFD decomposition either
    .replace(/-/g, ' ')  // treat hyphens as word boundaries (El-Shenawy / El Shenawy must compare equal)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract a quoted nickname from a Guardian name, e.g. `Ahmed Sayed 'Zizo'`
// or `Roberto 'Pico' Lopes`. Returns null if there's no quoted segment.
function splitNickname(name) {
  const m = name.match(/['"‘’“”]([^'"‘’“”]+)['"‘’“”]/);
  if (!m) return null;
  const nickname = m[1];
  const prefix   = name.slice(0, m.index).trim();
  const suffix   = name.slice(m.index + m[0].length).trim();
  return { nickname, prefix, suffix };
}

// Guardian "Team" strings that don't literally equal our countries.json `name`.
const TEAM_NAME_OVERRIDES = {
  'USA': 'usa',
  "Côte d'Ivoire": 'ivory-coast',
};

function resolveCountryId(guardianTeamName, countries) {
  if (TEAM_NAME_OVERRIDES[guardianTeamName]) return TEAM_NAME_OVERRIDES[guardianTeamName];
  const match = countries.find(c => c.name === guardianTeamName);
  return match ? match.id : null;
}

// Build a same-team index: exact full-name map, plus a surname → candidates[]
// map used only for a constrained fallback (see matchGuardianPlayer). Matching
// is deliberately scoped to one team's own ~26-man roster, never across
// countries, to keep the surname fallback's blast radius small.
function buildTeamIndex(players, filePath) {
  const byFullName = new Map();
  const bySurname   = new Map();

  for (const player of players) {
    if (!player.name) continue;
    const norm  = normaliseName(player.name);
    const parts = norm.split(' ');
    const entry = { player, filePath, firstInitial: parts[0]?.[0] };

    byFullName.set(norm, entry);
    if (parts.length > 1) {
      const surname = parts[parts.length - 1];
      if (!bySurname.has(surname)) bySurname.set(surname, []);
      bySurname.get(surname).push(entry);
    }
  }
  return { byFullName, bySurname };
}

// Explicit, manually-verified name variants that no mechanical rule can
// safely bridge (different transliteration conventions, dropped/added
// honorifics that don't follow a fixed pattern, compound-vs-shortened
// surnames). Keyed by countryId, guardianName → ourStoredName. Add entries
// only when confident of identity — an unresolved gap is safer than a wrong
// bio (see the Jordan "Al-Rawabdeh" false-positive this pipeline already hit
// once with unconstrained surname matching).
const NAME_ALIASES = {
  // NOTE: Qatar's Guardian entry "Mohamed Al-Mannai" was deliberately left
  // unaliased after verification — he and our roster's "Mohamed Manai" are
  // two distinct real players (different birth years/birthplaces per
  // Wikipedia); only "Manai" is confirmed for the 2026 World Cup squad.
  qatar: {
    'ayoub alawi': 'ayoub al-oui',           // Wikipedia/press confirm Alawi/Al-Alawi/Al-Oui are the same player
    'hashmi hussein': 'al-hashmi al-hussain', // dedicated Wikipedia page confirms this is the full name
  },
  morocco:       { 'munir el kajoui': 'munir mohamedi' }, // Wikipedia: same player, two commonly-used surnames
  'south-korea': { 'lee ki hyuk': 'lee gi-hyuk' },         // standard Korean romanisation g/k variance (alias key uses normaliseName's hyphen→space convention; harmless duplicate of what the surname fallback already resolves safely here)
  tunisia:       { 'mohamed amine ben hmida': 'mohamed amine ben hamida' }, // vowel-elision spelling variant
  iraq:          {
    'akam hashem': 'akam hashim', 'ahmed qasim': 'ahmed qasem', 'ali yousef': 'ali yousif', // vowel variants, confirmed via press coverage
  },
  uzbekistan: { 'odiljon khamrobekov': 'odiljon hamrobekov' }, // kh/h transliteration variance, confirmed same squad member
  iran: {
    'dennis yerai eckert ayensa': 'dennis eckert',    // Wikipedia: "Dennis Eckert" is the common/article name (alias key uses normaliseName's hyphen→space convention)
    'mehdi ghaedi': 'mehdi ghayedi',                  // official 2026 squad list uses "Ghayedi"
    'shahriar moghanloo': 'shahriyar moghanlou',      // vowel/spelling variant, single candidate in squad
  },
  paraguay: {
    'roberto junior fernandez': 'gatito fernandez', // Wikipedia: Gatito's real name is Roberto Júnior Fernández
    'gaston oliveira': 'gaston olveira',            // single-letter spelling variant, single candidate in squad
  },
  ghana: { 'baba rahman': 'abdul rahman baba' }, // Wikipedia: Baba Rahman is the common name for Abdul Rahman Baba
  jordan: { 'ehsan haddad': 'ihsan haddad' }, // Guardian/FIFA spell the captain "Ehsan"; Wikipedia's official squad table (our source of record after the Sprint 35 roster correction) spells him "Ihsan" — same player, shirt 23, Al-Hussein
};

// Match a single Guardian player against one team's index. Tried in order,
// each an exact lookup (never fuzzy) so every accepted match is either an
// exact string equality or an explicitly reviewed alias:
//   1. Exact normalised full name.
//   2. Leading-token dropped (honorific or extra given name, e.g. "Seyed
//      Hossein Hosseini" → "Hossein Hosseini", "Carlos Andrés Gómez" →
//      "Andrés Gómez").
//   3. Quoted-nickname variants (nickname alone; prefix+nickname;
//      nickname+suffix; prefix+suffix with the nickname dropped entirely) —
//      covers Guardian's "Ahmed Sayed 'Zizo'" style bios for players we
//      store under just their common name.
//   4. Manually-verified NAME_ALIASES for this country.
//   5. Surname-only fallback — accepted only when unambiguous (exactly one
//      same-surname candidate in this roster) AND the first-name initial
//      agrees, to avoid misattributing a bio to a same-surnamed teammate
//      (this pipeline hit exactly that false positive once, for Jordan's
//      two different "Al-Rawabdeh" players, before this guard existed).
function matchGuardianPlayer(guardianName, index, countryId) {
  const norm = normaliseName(guardianName);
  const exact = index.byFullName.get(norm);
  if (exact) return exact;

  // Hyphens are ambiguous as word boundaries: "El-Shenawy" needs to become
  // "el shenawy" to match our stored "El Shenawy", but "Kanaani-Zadegan"
  // needs the hyphen dropped entirely to match our stored "Kanaanizadegan".
  // normaliseName() picks the space convention; also try the no-space one.
  const noHyphenSpace = index.byFullName.get(normaliseName(guardianName.replace(/-/g, '')));
  if (noHyphenSpace) return noHyphenSpace;

  const parts = norm.split(' ');

  if (parts.length >= 3) {
    const droppedLeading = index.byFullName.get(parts.slice(1).join(' '));
    if (droppedLeading) return droppedLeading;

    // Dropped middle name(s), e.g. "Kevin Lenini Pina" → our stored "Kevin Pina".
    const firstLast = index.byFullName.get(`${parts[0]} ${parts[parts.length - 1]}`);
    if (firstLast) return firstLast;
  }

  const split = splitNickname(guardianName);
  if (split) {
    const { nickname, prefix, suffix } = split;
    const candidates = [
      nickname,
      prefix && `${prefix} ${nickname}`,
      suffix && `${nickname} ${suffix}`,
      prefix && suffix && `${prefix} ${suffix}`,
    ].filter(Boolean);
    for (const c of candidates) {
      const found = index.byFullName.get(normaliseName(c));
      if (found) return found;
    }
  }

  const alias = NAME_ALIASES[countryId]?.[norm];
  if (alias) {
    const found = index.byFullName.get(normaliseName(alias));
    if (found) return found;
  }

  if (parts.length < 2) return null;
  const surname      = parts[parts.length - 1];
  const firstInitial = parts[0]?.[0];

  const candidates = index.bySurname.get(surname);
  if (!candidates || candidates.length !== 1) return null; // absent or ambiguous
  const candidate = candidates[0];
  if (candidate.firstInitial !== firstInitial) return null; // different person

  return candidate;
}

// ── Write bios ────────────────────────────────────────────────────────────────

function writeBiosToFiles(matches) {
  // Group matches by file path
  const byFile = new Map();
  for (const { filePath, player, bio } of matches) {
    if (!byFile.has(filePath)) byFile.set(filePath, []);
    byFile.get(filePath).push({ player, bio });
  }

  for (const [filePath, updates] of byFile) {
    const fileData = JSON.parse(readFileSync(filePath, 'utf8'));
    for (const { player: matchedPlayer, bio } of updates) {
      const p = fileData.data?.find(p => p.id === matchedPlayer.id);
      if (p) p.description = bio;
    }
    writeFileSync(filePath, JSON.stringify(fileData, null, 2) + '\n', 'utf8');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const countries = readJson('data/countries.json').data;

  if (!existsSync(resolve(ROOT, TEAMS_RAW_PATH))) {
    console.log('\n' + '═'.repeat(60));
    console.log('  MANUAL FALLBACK REQUIRED (one-time)');
    console.log('═'.repeat(60));
    console.log(`  ${TEAMS_RAW_PATH} not found.`);
    console.log('  To proceed:');
    console.log('  1. Open this URL in a browser:');
    console.log(`     ${GUARDIAN_URL}`);
    console.log('  2. Open DevTools → Network tab → Fetch/XHR filter, hard refresh');
    console.log('  3. Find the request whose response starts with {"sheets":{"Teams":[...');
    console.log(`  4. Save its response body as: ${TEAMS_RAW_PATH}`);
    console.log('  5. Re-run this script.');
    console.log('═'.repeat(60));
    process.exit(1);
  }

  const teamsData = readJson(TEAMS_RAW_PATH);
  const teamSheets = (teamsData.sheets?.Teams ?? []).filter(t => t.spreadsheet);
  console.log(`Found ${teamSheets.length} team spreadsheet IDs in ${TEAMS_RAW_PATH}`);

  const matched       = [];
  const unmatched     = [];
  const unresolvedTeams = [];
  const fetchFailures = [];

  for (const [i, team] of teamSheets.entries()) {
    process.stdout.write(`  [${i + 1}/${teamSheets.length}] ${team.Team}... `);

    const countryId = resolveCountryId(team.Team, countries);
    const filePath   = countryId ? resolve(ROOT, `data/players/${countryId}.json`) : null;
    if (!filePath || !existsSync(filePath)) {
      console.log('no matching country file');
      unresolvedTeams.push(team.Team);
      continue;
    }

    const data = await fetchTeamSheet(team.spreadsheet);
    if (!data) {
      console.log('FETCH FAILED');
      fetchFailures.push(team.Team);
      continue;
    }

    const playerArray = findPlayerArray(data);
    if (!playerArray) {
      console.log('no player array found');
      fetchFailures.push(team.Team);
      continue;
    }

    const ourPlayers = JSON.parse(readFileSync(filePath, 'utf8')).data ?? [];
    const index = buildTeamIndex(ourPlayers, filePath);

    let teamMatched = 0;
    for (const guardianPlayer of playerArray) {
      const name = extractName(guardianPlayer);
      const bio  = extractBio(guardianPlayer);
      if (!name || !bio) continue;

      const found = matchGuardianPlayer(name, index, countryId);
      if (found) {
        matched.push({ filePath: found.filePath, player: found.player, bio });
        teamMatched++;
      } else {
        unmatched.push(`${name} (${team.Team})`);
      }
    }
    console.log(`${teamMatched}/${playerArray.length} matched`);

    // Be polite to the CDN between requests.
    await sleep(250);
  }

  // Write bios to player files
  if (matched.length > 0) {
    writeBiosToFiles(matched);
    console.log(`\n✓ Wrote bios for ${matched.length} players`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('  GUARDIAN BIO SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  ✓ Matched and written : ${matched.length}`);
  console.log(`  ⚠ Unmatched           : ${unmatched.length}`);
  console.log(`  ✗ Team fetch failures : ${fetchFailures.length}`);
  console.log(`  ✗ Unresolved teams    : ${unresolvedTeams.length}`);
  if (unresolvedTeams.length > 0) {
    console.log('\n  Guardian team names with no matching country file:');
    unresolvedTeams.forEach(t => console.log(`    • ${t}`));
    console.log('  Add an entry to TEAM_NAME_OVERRIDES in this script.');
  }
  if (unmatched.length > 0) {
    console.log('\n  Unmatched Guardian player names:');
    unmatched.slice(0, 30).forEach(n => console.log(`    • ${n}`));
    if (unmatched.length > 30) console.log(`    ... and ${unmatched.length - 30} more`);
    console.log('\n  Add NAME_TO_ID entries or check spelling in the player files.');
  }
  if (fetchFailures.length > 0) {
    console.log('\n  Teams that failed to fetch (re-run to retry):');
    fetchFailures.forEach(t => console.log(`    • ${t}`));
  }
  console.log('─'.repeat(60));
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(err => {
    console.error('gather-guardian-bios failed:', err);
    process.exit(1);
  });
}

export { normaliseName, resolveCountryId, buildTeamIndex, matchGuardianPlayer, extractName, extractBio, findPlayerArray, fetchTeamSheet };
