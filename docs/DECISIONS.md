# Architectural Decision Log

## ADR-001: Vanilla JavaScript + ES Modules (no framework)

**Decision:** Build with plain JavaScript and native ES Modules. No React, Vue, Angular, or other framework.

**Rationale:** This is a read-mostly, data-display application with no complex client state management requirements. Vanilla JS eliminates the build step entirely — no Webpack, no Babel, no node_modules for the frontend. The result is a repo that deploys directly from the file system to Netlify with zero tooling. ES Modules are supported natively in all modern browsers and provide clean dependency graphs without bundling.

**Trade-off:** No component library, no ecosystem. Custom module lifecycle (render/init/teardown) is hand-rolled. Accepted.

---

## ADR-002: Local-first photo strategy (no runtime remote URLs)

**Decision:** All player photos are stored locally in `assets/players/{id}.jpg`. The `photoUrl` field in player JSON is source metadata only — used by `scripts/gather-photos.js` offline, never fetched by the browser.

**Rationale:** External image URLs rot during a 6-week tournament as clubs update their press packs, FIFA reshuffles their CDN, and sponsorship agreements expire. A single broken URL handling case forces runtime fallback logic across every player card. Local-first eliminates the entire category of URL-rot bugs. With ~1,250 players at ~30KB each, total photo payload is ~40MB — well within Netlify's free tier.

**Trade-off:** Requires a one-time download step (`npm run gather-photos`). New players during tournament require manual photo download. Accepted.

---

## ADR-003: Pre-generated bios (not runtime generation)

**Decision:** Player bios are pre-generated offline by `scripts/generate-player-bios.js` and stored in the `bio` field of each player JSON file. `js/bio.js` in the browser is a 10-line fallback only — it generates a minimal description if `bio` is null at render time.

**Rationale:** Runtime bio generation via LLM APIs would require API keys in the browser, incur per-request latency, create a dependency on external uptime, and add cost proportional to page views. Pre-generating offline produces consistent, reviewable output that can be committed to the repo.

**Trade-off:** Bios must be regenerated and redeployed after squad changes. Script is idempotent — it never overwrites existing non-null bios. Accepted.

---

## ADR-004: Per-team player files (not single players.json)

**Decision:** Player data is split into 48 files: `data/players/{countryId}.json`. A single `data/players/france.json` is ~30KB for 26 players. A monolithic file would be 48 × 26 = 1,248 players ≈ 1.5MB.

**Rationale:** The team page only ever needs one team's players at a time. Loading all 1,248 players on initial page load would waste bandwidth for users browsing only one or two teams. Per-team files make the DataManager's caching strategy straightforward — `loadPlayersForTeam('france')` loads and caches one file. Data entry is also simpler: volunteers can work on one team at a time without merge conflicts.

**Trade-off:** Search index (`data/search-index.json`) must be pre-built to enable cross-team search. Accepted.

---

## ADR-005: GitHub → Netlify git-based deploy (not drag-and-drop)

**Decision:** The Netlify site is connected to the GitHub repo via git integration. Every `git push master` triggers an automatic deploy within ~30 seconds.

**Rationale:** During the 6-week tournament, standings and results will be updated after every match — up to 8 times per day during the group stage. A git-based workflow (`git commit && git push`) is faster and less error-prone than repeated drag-and-drop deploys. It also provides a full audit trail: every score update is a commit.

**Trade-off:** Requires the GitHub repo to be connected to Netlify once during setup. Instructions in `SESSION_HANDOFF.md`. Accepted.
