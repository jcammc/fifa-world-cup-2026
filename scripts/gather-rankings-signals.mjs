/**
 * Automated acquisition for the ranking signals that ARE reliably fetchable
 * (see docs/plans/2026-07-06-ranking-system-design.md §0/§3a/§0b):
 *
 *   - `mediaPageviews` — Wikimedia Pageviews API, replacing Instagram
 *     entirely (Instagram is login-walled; confirmed even for a global
 *     superstar's own public profile).
 *   - `awardsRaw.worldCupWinner` — parsed from the player's Wikipedia
 *     infobox `medaltemplates` field, structured and reliable for TEAM
 *     competition results.
 *   - `awardsRaw.{ballonDorTier,uefaPoty,wcGoldenBall}` — Wikidata's
 *     structured `P166` ("award received") claims, looked up by an EXACT
 *     sitelinks query against the same article title already resolved
 *     above (no new fuzzy name-matching). Deliberately limited to a small,
 *     individually-verified Q-id table (§0b) — Wikidata's P166 only
 *     reliably captures wins, not placements, so Ballon d'Or top-3/top-10,
 *     CL wins, domestic title counts, and TOTY stay manual. FIFA Best
 *     Player was tried and removed (§0b) after a confirmed false positive
 *     (Egypt's Salah shows a claim despite only finishing 3rd) — stays
 *     manual too.
 *
 * Transfermarkt/EA raw values and the remaining awardsRaw sub-fields are
 * manual — agent-side fetching for those was tested and confirmed blocked.
 * Use scripts/import-ranking-raw.mjs to bulk-populate them from pasted
 * research, rather than hand-editing data/rankings.json.
 *
 * Never overwrites a raw field a human (or a prior automated pass) has
 * already supplied. Never guesses a Wikipedia article title or an award
 * mapping not in the verified table — an unresolved player, or an award
 * this script can't confidently map, is reported and skipped, matching
 * this project's determinism convention everywhere else.
 *
 * Run: node scripts/gather-rankings-signals.mjs
 * Idempotent — safe to re-run any time (e.g. monthly, to refresh pageviews).
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const DELAY_MS  = 1500;
const MAX_RETRIES = 3;

// Wikimedia's API etiquette explicitly asks for a descriptive User-Agent
// with contact info on high-volume requests -- found while diagnosing an
// unexpectedly high (251/286) unresolved-player rate on the first real run
// against this project's actual 286-player scope: transient failures (rate
// limiting / 5xx) were being treated identically to "page doesn't exist"
// with no retry at all. Fixed with the UA header below plus fetchWithRetry.
const UA_HEADERS = { 'User-Agent': 'WorldCup2026SquadExplorer/1.0 (non-commercial fan project; contact: jcameronmcd@gmail.com)' };

function readJson(rel)       { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function writeJson(rel, obj) { writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
function sleep(ms)           { return new Promise(r => setTimeout(r, ms)); }

// Retries a transient failure (network error, 429, 5xx) with backoff; does
// NOT retry a clean non-ok/non-5xx response (e.g. a real 404), since that's
// not transient. Matches the retry convention already used in
// gather-head-to-head-stats.mjs's apiFetch().
async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: UA_HEADERS });
    if (res.ok || (res.status < 500 && res.status !== 429)) return res;
    if (attempt >= MAX_RETRIES) return res;
    await sleep(attempt * 3000);
    return fetchWithRetry(url, attempt + 1);
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    await sleep(attempt * 3000);
    return fetchWithRetry(url, attempt + 1);
  }
}

// ── Wikipedia article-title resolution — unambiguous or refuse ────────────
//
// Different problem from the match-events name-matching chain (that chain
// resolves a free-text event name to a team-roster player ID; this resolves
// a player's name to an actual Wikipedia ARTICLE TITLE). Verified against
// real data: the direct "Firstname_Lastname" title resolves correctly for
// both a global superstar (Messi) and an obscure squad player (Norway's
// Sondre Langås) — that's tried first. Falls back to a scoped search only
// when the direct title doesn't exist, and only accepts a single
// unambiguous candidate.

export async function pageWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&section=0&format=json&formatversion=2`;
  const res = await fetchWithRetry(url).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json();
  if (json.error) return null; // confirmed missing (missingtitle), not a transient failure
  return json.parse?.wikitext ?? null;
}

// Full article wikitext (no section restriction) -- unlike pageWikitext()
// above, which only fetches section 0 (the infobox/lead) for the
// medaltemplates check. Used by scripts/dump-player-honours.mjs to read a
// player's "Honours" section, which lives later in the article body.
export async function pageFullWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2`;
  const res = await fetchWithRetry(url).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json();
  if (json.error) return null;
  return json.parse?.wikitext ?? null;
}

export async function searchCandidate(playerName) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`"${playerName}" footballer`)}&srlimit=2&format=json&formatversion=2`;
  const res = await fetchWithRetry(url).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json();
  const results = json.query?.search ?? [];
  return results.length === 1 ? results[0].title : null;
}

export async function resolveArticleTitle(playerName) {
  const direct = playerName.replace(/ /g, '_');
  if (await pageWikitext(direct)) return direct;

  const withSuffix = `${direct}_(footballer)`;
  if (await pageWikitext(withSuffix)) return withSuffix;

  const candidate = await searchCandidate(playerName);
  if (candidate && await pageWikitext(candidate.replace(/ /g, '_'))) return candidate.replace(/ /g, '_');

  return null;
}

// ── World Cup winner detection from the infobox medaltemplates field ──────
//
// Verified against Messi's real infobox wikitext: `medaltemplates` contains
// `{{MedalCompetition|[[FIFA World Cup]]}}` followed by one or more
// `{{Medal|...|...}}` lines for that competition. A literal match on the
// competition line (not just "contains FIFA World Cup") deliberately
// excludes youth/women's variants (`[[FIFA U-20 World Cup]]`, etc.), which
// use a different link target — conservative by construction, so this only
// ever under-detects, never mis-detects, a senior World Cup win.

export function detectWorldCupWinner(wikitext) {
  const block = wikitext.match(/medaltemplates\s*=([\s\S]*?)\n\|\s*\w+\s*=/)?.[1]
             ?? wikitext.match(/medaltemplates\s*=([\s\S]*?)\n}}/)?.[1];
  if (!block) return false;

  let inWorldCup = false;
  for (const line of block.split('\n').map(l => l.trim()).filter(Boolean)) {
    const comp = line.match(/\{\{MedalCompetition\|(.*?)\}\}/);
    if (comp) { inWorldCup = comp[1].trim() === '[[FIFA World Cup]]'; continue; }
    if (inWorldCup && /\{\{Medal\|W\|/.test(line)) return true;
  }
  return false;
}

// ── Wikidata award detection — exact sitelinks lookup, verified Q-id table ──
//
// Different mechanism from the medaltemplates parse above: Wikidata's P166
// ("award received") claims are structured per-award, not free prose.
// Looked up via an EXACT sitelinks query against the article title already
// resolved by resolveArticleTitle() -- no new name-matching risk. Verified
// directly (see design doc §0b): Messi (Q615) has 66 P166 claims including
// Ballon d'Or/FIFA Ballon d'Or/FIFA World Player of the Year/World Cup
// Golden Ball; an obscure squad player (Norway's Sondre Langås, Q102330606)
// has a real resolved entity with 0 claims -- the correct, honest answer,
// not a lookup failure.
//
// Each Q-id below was individually looked up and confirmed, not guessed.
// P166 only reliably captures WINS -- it has no concept of "runner-up" or
// "top 10", so Ballon d'Or top-3/top-10 placements, CL wins, domestic title
// counts, and TOTY (a video-game award, not tracked the same way) are
// deliberately NOT covered here and stay manual (scripts/import-ranking-raw.mjs).
//
// "The Best FIFA Men's Player" / "FIFA World Player of the Year" (Q28156245 /
// Q182529) were REMOVED from this table 2026-07-08 after a confirmed false
// positive: Egypt's Mohamed Salah shows a P166 claim for Q28156245, but he
// only finished 3rd (2018, 2021) -- Wikidata includes podium finalists under
// "award received" for this specific award with no queryable qualifier
// distinguishing them from an actual winner (checked: only a P585 date
// qualifier is present, no placement marker). Spot-checked the three
// remaining mappings below against real non-winners already in this
// project's scope (Ballon d'Or: Mbappé, a genuine multi-time runner-up;
// UEFA POTY: Bellingham, a real 2023-24 finalist who didn't win, and Kane;
// World Cup Golden Ball: Mbappé, the real 2022 Silver Ball/runner-up) --
// all three correctly show no claim, so this false-positive risk appears
// isolated to the FIFA Best Player award specifically, not systemic. Per
// this project's determinism principle, a field that can produce even one
// wrong answer is removed entirely rather than patched with a heuristic --
// fifaBestPlayer stays manual (scripts/import-ranking-raw.mjs).
const BALLON_DOR_QIDS    = new Set(['Q166177', 'Q2291862']); // Ballon d'Or; FIFA Ballon d'Or (2010-2015 merged era)
const UEFA_POTY_QID      = 'Q260117';  // UEFA Men's Player of the Year Award
const WC_GOLDEN_BALL_QID = 'Q17355204'; // World Cup Golden Ball

// Pure mapping function, unit-testable without any network access.
export function mapWikidataAwardsToRaw(awardQids) {
  const raw = {};
  if (awardQids.some(q => BALLON_DOR_QIDS.has(q))) raw.ballonDorTier = 'winner';
  if (awardQids.includes(UEFA_POTY_QID)) raw.uefaPoty = true;
  if (awardQids.includes(WC_GOLDEN_BALL_QID)) raw.wcGoldenBall = true;
  return raw;
}

export async function fetchWikidataAwardQids(title) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(title)}&props=claims&format=json`;
  const res = await fetchWithRetry(url).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json();
  const entity = Object.values(json.entities ?? {})[0];
  if (!entity || entity.missing !== undefined) return null;
  const claims = entity.claims?.P166 ?? [];
  return claims.map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
}

// ── Wikimedia Pageviews — a single, fully-completed calendar month ─────────
//
// Verified: a same-month start/end range (e.g. 20260601/20260630) returns
// exactly one clean bucket; a range crossing into the current, still-
// in-progress month returns an extra partial-month bucket that would make
// pageview counts incomparable across players fetched on different days.

export function mostRecentCompletedMonth(now = new Date()) {
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const pad  = n => String(n).padStart(2, '0');
  const y = prev.getUTCFullYear(), m = prev.getUTCMonth(); // 0-indexed
  // Day 0 of next month = the actual last day of this month (28/29/30/31) --
  // the Pageviews API 400s with "no full months between dates" if the end
  // date doesn't reach the real end of the month (verified: day 28 fails
  // for June's 30 days; the actual last day works).
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { start: `${y}${pad(m + 1)}01`, end: `${y}${pad(m + 1)}${pad(lastDay)}`, label: `${y}-${pad(m + 1)}` };
}

export async function fetchMonthlyPageviews(title, window) {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(title)}/monthly/${window.start}/${window.end}`;
  const res = await fetchWithRetry(url).catch(() => null);
  if (!res || !res.ok) return null; // e.g. 404 -- no data for this article/window
  const json = await res.json();
  return json.items?.[0]?.views ?? null;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const scope        = readJson('data/ranking-scope.json').teams;
  const rankingsFile  = readJson('data/rankings.json');
  const byPlayerId    = new Map(rankingsFile.data.map(e => [e.playerId, e]));
  const window        = mostRecentCompletedMonth();

  const players = [];
  for (const teamId of scope) {
    for (const p of readJson(`data/players/${teamId}.json`).data) players.push(p);
  }

  console.log(`Fetching signals for ${players.length} in-scope players (pageviews window: ${window.label})...\n`);

  let mediaUpdated = 0, wcWinnerDetected = 0, wikidataAwardsDetected = 0, unresolved = [];

  for (const player of players) {
    const entry = byPlayerId.get(player.id);
    if (!entry) continue; // generate-rankings.js seeds entries; run that first if missing

    const title = await resolveArticleTitle(player.name);
    if (!title) {
      unresolved.push(player.id);
      continue;
    }

    if (entry.mediaPageviews == null) {
      const views = await fetchMonthlyPageviews(title, window);
      if (views != null) { entry.mediaPageviews = views; mediaUpdated++; }
    }

    await sleep(DELAY_MS);

    const wikitext = await pageWikitext(title);
    if (wikitext && detectWorldCupWinner(wikitext)) {
      entry.awardsRaw = { ...(entry.awardsRaw ?? {}), worldCupWinner: true };
      wcWinnerDetected++;
    }

    await sleep(DELAY_MS);

    const awardQids = await fetchWikidataAwardQids(title);
    if (awardQids) {
      const mapped = mapWikidataAwardsToRaw(awardQids);
      if (Object.keys(mapped).length) {
        entry.awardsRaw = { ...(entry.awardsRaw ?? {}), ...mapped };
        wikidataAwardsDetected++;
      }
    }

    await sleep(DELAY_MS);
  }

  rankingsFile.lastUpdated = new Date().toISOString();
  writeJson('data/rankings.json', rankingsFile);

  console.log('────────────────────────────────────────────────────────────');
  console.log('  RANKING SIGNALS GATHER SUMMARY');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`  mediaPageviews populated       : ${mediaUpdated}`);
  console.log(`  worldCupWinner newly detected  : ${wcWinnerDetected}`);
  console.log(`  Wikidata awards newly detected : ${wikidataAwardsDetected} (Ballon d'Or/UEFA POTY/WC Golden Ball)`);
  console.log(`  Unresolved article titles      : ${unresolved.length}`);
  if (unresolved.length) {
    console.log('\n  Players whose Wikipedia article could not be resolved (reported, not guessed):');
    unresolved.slice(0, 30).forEach(id => console.log(`    • ${id}`));
    if (unresolved.length > 30) console.log(`    ... and ${unresolved.length - 30} more`);
  }
  console.log('────────────────────────────────────────────────────────────');
  console.log('\nNote: this only fills mediaPageviews and the auto-detectable awardsRaw');
  console.log('sub-fields above. Run npm run generate-rankings afterward to recompute');
  console.log('derived scores. Use scripts/import-ranking-raw.mjs for the remaining');
  console.log('manual fields (transfermarktValueEUR, eaRatingRaw, and the rest of awardsRaw).');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
