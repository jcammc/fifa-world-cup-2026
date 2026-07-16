# Contributing

## Local Setup

1. Clone the repo: `git clone https://github.com/jcammc/fifa-world-cup-2026.git`
2. Open in VS Code
3. Install the **Live Server** extension (ritwickdey.LiveServer)
4. Right-click `index.html` → "Open with Live Server"
5. The app runs at `http://127.0.0.1:5500`

No build step, no npm install required for the frontend.

## Running Scripts

Scripts require Node.js 18+.

```bash
# Data maintenance (use these regularly)
npm run sync-data          # Pull live scores/standings from football-data.org into local JSON files
npm run update-knockout    # Record a knockout result and propagate winner (see script --help)
npm run gather-match-events    # Backfill lineups/events for newly-completed matches (Wikipedia)
npm run gather-head-to-head    # Migrate/refresh head-to-head prose for newly-completed matches
npm run validate           # Check all JSON files for schema errors

# Rankings (Sprint 39 — real, working ranking engine, not a stub)
npm run generate-rankings  # Recompute consensus scores for every team in data/ranking-scope.json

# Player bios
npm run gather-guardian-bios # Fetch real Guardian bios for players still missing a description

# Search index (run after any squad change)
npm run build-search-index # Rebuild data/search-index.json

# Photo gathering (run when adding new players)
npm run gather-photos      # Download player/manager photos (configure flags inside script)

# Deploy gate
npm run pre-deploy         # Run validate + gather-guardian-bios + build-search-index
```

**Note:** `npm run sync-data` updates local JSON files directly. On production, scores are updated automatically by `netlify/functions/live-data.mjs` whenever the SPA polls `/api/live`. Run `sync-data` locally to pull the latest results before doing any data entry work.

## Adding a New Team's Data

1. Create `data/players/{countryId}.json` — see `schemas/README.md` for the full player schema
2. Ensure the country exists in `data/countries.json`
3. Ensure all referenced clubs exist in `data/clubs.json`
4. Ensure all referenced leagues exist in `data/leagues.json`
5. Run `npm run validate` — fix any errors before committing
6. Run `npm run gather-guardian-bios` — fills real player bios where available; any player it can't reach falls back to `js/bio.js`'s generic template at render time, never a blank field
7. Run `npm run build-search-index` — adds players to search
8. Commit and push

## Commit Message Format

```
feat: add France squad data (26 players)
fix: correct Bellingham shirt number
data: update Group E standings after MD2
FT: France 2-1 Iraq (Group I, MD2)
```

## Deployment

Every `git push master` auto-deploys to Netlify within ~30 seconds. No manual deploy step required.

## File Structure

See `docs/SESSION_HANDOFF.md` or `docs/PROJECT_ANALYSIS.md` for the full file tree and architectural decisions.

## Documentation Convention

All `.md` documentation files live in `docs/`. Do not place `.md` files in the project root or other directories.

Exceptions:
- `skills/**/SKILL.md` — must stay alongside their skill directory for the skill system to discover them
- `schemas/README.md` — subdirectory-level reference, stays with the schemas it describes
