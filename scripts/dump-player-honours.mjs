/**
 * Dumps each in-scope player's Wikipedia "Honours" section (plus a few
 * paragraphs of surrounding prose, since some career-summary sentences
 * mention placements without an explicit Honours-list bullet) to stdout,
 * for manual reading/transcription into an --field awards CSV
 * (scripts/import-ranking-raw.mjs) -- see docs/plans/2026-07-06-ranking-system-design.md.
 *
 * This is a research aid, not an extraction script: it does NOT parse or
 * guess any award value itself -- it just gets the raw text in front of a
 * human (or an LLM doing the reading) faster than fetching each player's
 * full article by hand. Every fact still has to be read and transcribed
 * with judgment (see the fifaBestPlayer false-positive finding in the
 * design doc §0b for why a naive "this text mentions X" check isn't safe).
 *
 * Run: node scripts/dump-player-honours.mjs --team argentina
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveArticleTitle, pageFullWikitext } from './gather-rankings-signals.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

function readJson(rel) { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); }
function sleep(ms)      { return new Promise(r => setTimeout(r, ms)); }

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      args[key] = (next && !next.startsWith('--')) ? argv[++i] : true;
    }
  }
  return args;
}

// Extracts the "==Honours==" section (any heading level) through the next
// same-or-higher-level heading. Falls back to reporting "no Honours section
// found" rather than guessing a substitute -- some articles use a different
// heading, which should be read manually instead.
function extractHonoursSection(wikitext) {
  const match = wikitext.match(/\n(={2,4})\s*Honours\s*\1\n([\s\S]*?)(?=\n={2,4}[^=]|\n==\s*(References|External links|See also)\s*==|$)/i);
  return match ? match[2].trim() : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const team = args.team;
  if (!team) { console.error('--team is required'); process.exit(1); }

  const players = readJson(`data/players/${team}.json`).data;

  for (const player of players) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`PLAYER: ${player.id}  (${player.name})`);
    console.log('='.repeat(70));

    const title = await resolveArticleTitle(player.name);
    if (!title) {
      console.log('  [UNRESOLVED -- no Wikipedia article title found]');
      continue;
    }
    console.log(`  source: https://en.wikipedia.org/wiki/${title}`);

    const wikitext = await pageFullWikitext(title);
    if (!wikitext) {
      console.log('  [FETCH FAILED]');
      continue;
    }

    const honours = extractHonoursSection(wikitext);
    if (!honours) {
      console.log('  [NO "Honours" SECTION FOUND -- read the article manually if needed]');
      continue;
    }
    console.log(honours);

    await sleep(1200); // be polite -- see gather-rankings-signals.mjs's own rate-limiting finding
  }
}

main();
