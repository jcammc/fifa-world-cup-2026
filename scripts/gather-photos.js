// Downloads player photos from photoUrl fields to assets/players/. Run: node scripts/gather-photos.js
// Idempotent — skips files that already exist locally.
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('gather-photos: not yet implemented');
}

main().catch(console.error);
