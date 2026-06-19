// Generates player bios for all players with bio: null. Run: node scripts/generate-player-bios.js
// Idempotent — never overwrites an existing non-null bio.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('generate-player-bios: not yet implemented');
}

main().catch(console.error);
