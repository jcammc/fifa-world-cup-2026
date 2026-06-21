#!/usr/bin/env node
/**
 * Records a knockout match result and propagates the winner to the next round.
 *
 * Usage:
 *   node scripts/update-knockout.js --match r32-m1 --home 2 --away 1
 *   node scripts/update-knockout.js --match r32-m1 --home 1 --away 1 --pen-home 4 --pen-away 3
 *   node scripts/update-knockout.js --match r32-m1 --home 2 --away 1 --dry-run
 *   node scripts/update-knockout.js --match r32-m1 --home 2 --away 1 --no-propagate
 *   node scripts/update-knockout.js --match r32-m1 --home 2 --away 1 --force
 *
 * Flags:
 *   --match          Match ID (r32-m1, r16-m3, qf-m2, sf-m1, final-m1, 3rd-place)
 *   --home           Home score at full time / after extra time
 *   --away           Away score at full time / after extra time
 *   --pen-home       Home penalty score (required if match ends level after ET)
 *   --pen-away       Away penalty score (required if match ends level after ET)
 *   --dry-run        Print what would change without writing to disk
 *   --no-propagate   Record result only; do not update any next-round slot
 *   --force          Overwrite a match already marked FT (for corrections)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname     = dirname(fileURLToPath(import.meta.url));
const KNOCKOUT_PATH = resolve(__dirname, '../data/knockout.json');

// ─── Bracket propagation map ───────────────────────────────────────────────
//
// Verified against Wikipedia: en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
// R32 matches are NOT simple sequential pairings — see inline comments below.
// Use --dry-run to preview, --no-propagate to skip propagation.
//
const PROPAGATION = {
  // ── Round of 32 → Round of 16 ───────────────────────────────────────────
  // Verified against Wikipedia bracket: en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
  // r32-m1 (M73) + r32-m3 (M75) → r16-m2 (M90)
  // r32-m2 (M74) + r32-m5 (M77) → r16-m1 (M89)
  // r32-m4 (M76) + r32-m6 (M78) → r16-m3 (M91)
  // r32-m7 (M79) + r32-m8 (M80) → r16-m4 (M92)
  // r32-m9 (M81) + r32-m10 (M82) → r16-m6 (M94)
  // r32-m11 (M83) + r32-m12 (M84) → r16-m5 (M93)
  // r32-m13 (M85) + r32-m15 (M87) → r16-m8 (M96)
  // r32-m14 (M86) + r32-m16 (M88) → r16-m7 (M95)
  'r32-m1':  { winner: { match: 'r16-m2', slot: 'home' } },
  'r32-m2':  { winner: { match: 'r16-m1', slot: 'home' } },
  'r32-m3':  { winner: { match: 'r16-m2', slot: 'away' } },
  'r32-m4':  { winner: { match: 'r16-m3', slot: 'home' } },
  'r32-m5':  { winner: { match: 'r16-m1', slot: 'away' } },
  'r32-m6':  { winner: { match: 'r16-m3', slot: 'away' } },
  'r32-m7':  { winner: { match: 'r16-m4', slot: 'home' } },
  'r32-m8':  { winner: { match: 'r16-m4', slot: 'away' } },
  'r32-m9':  { winner: { match: 'r16-m6', slot: 'home' } },
  'r32-m10': { winner: { match: 'r16-m6', slot: 'away' } },
  'r32-m11': { winner: { match: 'r16-m5', slot: 'home' } },
  'r32-m12': { winner: { match: 'r16-m5', slot: 'away' } },
  'r32-m13': { winner: { match: 'r16-m8', slot: 'home' } },
  'r32-m14': { winner: { match: 'r16-m7', slot: 'home' } },
  'r32-m15': { winner: { match: 'r16-m8', slot: 'away' } },
  'r32-m16': { winner: { match: 'r16-m7', slot: 'away' } },
  // ── Round of 16 → Quarter-finals ────────────────────────────────────────
  // r16-m1 (M89) + r16-m2 (M90) → qf-m1 (M97)
  // r16-m3 (M91) + r16-m4 (M92) → qf-m3 (M99)
  // r16-m5 (M93) + r16-m6 (M94) → qf-m2 (M98)
  // r16-m7 (M95) + r16-m8 (M96) → qf-m4 (M100)
  'r16-m1':  { winner: { match: 'qf-m1', slot: 'home' } },
  'r16-m2':  { winner: { match: 'qf-m1', slot: 'away' } },
  'r16-m3':  { winner: { match: 'qf-m3', slot: 'home' } },
  'r16-m4':  { winner: { match: 'qf-m3', slot: 'away' } },
  'r16-m5':  { winner: { match: 'qf-m2', slot: 'home' } },
  'r16-m6':  { winner: { match: 'qf-m2', slot: 'away' } },
  'r16-m7':  { winner: { match: 'qf-m4', slot: 'home' } },
  'r16-m8':  { winner: { match: 'qf-m4', slot: 'away' } },
  // ── Quarter-finals → Semi-finals ────────────────────────────────────────
  // qf-m1 (M97) + qf-m2 (M98) → sf-m1 (M101)
  // qf-m3 (M99) + qf-m4 (M100) → sf-m2 (M102)
  'qf-m1':   { winner: { match: 'sf-m1', slot: 'home' } },
  'qf-m2':   { winner: { match: 'sf-m1', slot: 'away' } },
  'qf-m3':   { winner: { match: 'sf-m2', slot: 'home' } },
  'qf-m4':   { winner: { match: 'sf-m2', slot: 'away' } },
  // ── Semi-finals → Final + 3rd Place (winner + loser both propagate) ─────
  'sf-m1':   {
    winner: { match: 'final-m1', slot: 'home' },
    loser:  { match: '3rd-place', slot: 'home' },
  },
  'sf-m2':   {
    winner: { match: 'final-m1', slot: 'away' },
    loser:  { match: '3rd-place', slot: 'away' },
  },
  // ── Terminal matches — no propagation ───────────────────────────────────
  'final-m1':  null,
  '3rd-place': null,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

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

function loadKnockout() {
  return JSON.parse(readFileSync(KNOCKOUT_PATH, 'utf8'));
}

function saveKnockout(envelope) {
  envelope.lastUpdated = new Date().toISOString();
  writeFileSync(KNOCKOUT_PATH, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
}

function findMatch(envelope, id) {
  for (const round of envelope.data) {
    const m = round.matches.find(m => m.id === id);
    if (m) return m;
  }
  return null;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.match || args.home === undefined || args.away === undefined) {
    console.error('Usage: node scripts/update-knockout.js --match <id> --home <n> --away <n> [options]');
    console.error('Run with --help to see all options.');
    process.exit(1);
  }

  const matchId    = args.match;
  const homeScore  = parseInt(args.home,  10);
  const awayScore  = parseInt(args.away,  10);
  const penHome    = args['pen-home'] !== undefined ? parseInt(args['pen-home'], 10) : null;
  const penAway    = args['pen-away'] !== undefined ? parseInt(args['pen-away'], 10) : null;
  const dryRun     = !!args['dry-run'];
  const noPropagate = !!args['no-propagate'];
  const force      = !!args.force;

  if (isNaN(homeScore) || isNaN(awayScore)) {
    console.error('Error: --home and --away must be integers');
    process.exit(1);
  }

  const envelope = loadKnockout();
  const match = findMatch(envelope, matchId);

  if (!match) {
    console.error(`Error: match "${matchId}" not found in knockout.json`);
    process.exit(1);
  }

  if (match.status === 'FT' && !force) {
    console.error(`Error: "${matchId}" is already FT. Use --force to overwrite.`);
    process.exit(1);
  }

  // ── Determine winner ─────────────────────────────────────────────────────

  let winnerSlot;
  if (homeScore !== awayScore) {
    winnerSlot = homeScore > awayScore ? 'home' : 'away';
  } else {
    if (penHome === null || penAway === null) {
      console.error('Error: scores are level — provide --pen-home and --pen-away for penalty shootout result');
      process.exit(1);
    }
    if (penHome === penAway) {
      console.error('Error: penalty scores cannot be equal');
      process.exit(1);
    }
    winnerSlot = penHome > penAway ? 'home' : 'away';
  }

  const loserSlot    = winnerSlot === 'home' ? 'away' : 'home';
  const winnerTeamId = winnerSlot === 'home' ? match.homeTeamId : match.awayTeamId;
  const loserTeamId  = loserSlot  === 'home' ? match.homeTeamId : match.awayTeamId;

  // ── Build change list ─────────────────────────────────────────────────────

  const changes = []; // { matchId, fields }

  // Source match result
  const resultFields = {
    status:    'FT',
    homeScore,
    awayScore,
    ...(penHome !== null ? { penaltyHomeScore: penHome } : {}),
    ...(penAway !== null ? { penaltyAwayScore: penAway } : {}),
  };
  changes.push({ matchId, fields: resultFields });

  // Next-round propagation
  if (!noPropagate) {
    if (!(matchId in PROPAGATION)) {
      console.warn(`⚠  No propagation entry for "${matchId}" — add it to PROPAGATION map or use --no-propagate`);
    } else {
      const prop = PROPAGATION[matchId];
      if (prop === null) {
        // Terminal match — nothing to propagate
      } else {
        if (prop.winner) {
          if (!winnerTeamId) {
            console.warn(`⚠  Cannot propagate winner: ${winnerSlot} slot in "${matchId}" has no teamId`);
          } else {
            const field = prop.winner.slot === 'home' ? 'homeTeamId' : 'awayTeamId';
            changes.push({ matchId: prop.winner.match, fields: { [field]: winnerTeamId } });
          }
        }
        if (prop.loser) {
          if (!loserTeamId) {
            console.warn(`⚠  Cannot propagate loser: ${loserSlot} slot in "${matchId}" has no teamId`);
          } else {
            const field = prop.loser.slot === 'home' ? 'homeTeamId' : 'awayTeamId';
            changes.push({ matchId: prop.loser.match, fields: { [field]: loserTeamId } });
          }
        }
      }
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────

  const homeTeam = match.homeTeamId ?? match.homeLabel ?? 'home';
  const awayTeam = match.awayTeamId ?? match.awayLabel ?? 'away';
  const penStr   = penHome !== null ? ` (${penHome}–${penAway} pens)` : '';
  const winner   = winnerTeamId ?? `${winnerSlot} team`;

  console.log(`\n  Match:  ${matchId}  —  ${homeTeam} ${homeScore}–${awayScore} ${awayTeam}${penStr}`);
  console.log(`  Winner: ${winner} (${winnerSlot})\n`);

  for (const { matchId: tid, fields } of changes) {
    const label = tid === matchId ? '  UPDATE ' : '  PROPAGATE ';
    for (const [k, v] of Object.entries(fields)) {
      console.log(`${label}${tid}.${k} = ${JSON.stringify(v)}`);
    }
  }

  if (dryRun) {
    console.log('\n  [dry-run] No changes written.\n');
    return;
  }

  // ── Apply ─────────────────────────────────────────────────────────────────

  for (const { matchId: tid, fields } of changes) {
    const m = findMatch(envelope, tid);
    if (m) {
      Object.assign(m, fields);
    } else {
      console.warn(`  ⚠  Target match "${tid}" not found — skipped`);
    }
  }

  saveKnockout(envelope);
  console.log('\n  ✓  knockout.json updated.\n');
}

main();
