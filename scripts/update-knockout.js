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
import { PROPAGATION } from '../js/bracket-topology.js';

const __dirname     = dirname(fileURLToPath(import.meta.url));
const KNOCKOUT_PATH = resolve(__dirname, '../data/knockout.json');

// Bracket propagation map now lives in js/bracket-topology.js — single
// source of truth, shared with the bracket renderer's connector-line
// positioning (js/modules/knockout-bracket.js) and the sync/live-data
// merge functions. Use --dry-run to preview, --no-propagate to skip
// propagation.

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
