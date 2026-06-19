// Builds data/search-index.json from all player and country data. Run: node scripts/build-search-index.js
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('build-search-index: not yet implemented');
}

main().catch(console.error);
