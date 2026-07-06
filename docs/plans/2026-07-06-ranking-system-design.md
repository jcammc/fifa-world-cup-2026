# Ranking System Design (Sprint 38)

**Status:** Design complete, approved. Not yet implemented — this is Sprint 39's job.
**Produced:** 2026-07-06, via a `/brainstorming` design session (per the Sprint 38 decision to run this as a dedicated conversation, not an inline draft).

---

## 1. Scope & Purpose

This document is the full design for the player ranking / consensus score system originally specified in `01_PRODUCT_SPEC.md` and `docs/DATA_ACQUISITION_STRATEGY.md` §4, adapted for the fact that the app is now live and mid-tournament (Round of 16 / Quarter-finals) rather than pre-launch.

**What gets ranked:** individual players only. Countries keep their existing, separate `fifaRanking` field. Club/League Explorer's "Average Consensus Rating" is an aggregate of player scores, not an independent metric.

**Who gets ranked, initially:** full squads (26 players each) of the teams still alive in the tournament at design time — 12 teams, ~312 players (`argentina, belgium, colombia, egypt, england, france, morocco, norway, portugal, spain, switzerland, usa`). This is a **one-time cut, not a moving target**: because "alive" only shrinks as the tournament progresses, nothing ranked now becomes invalid later. Expanding to the 36 eliminated teams is a future, lower-priority backfill (possibly never, if the tournament ends first).

**Formula, unchanged from the original spec:**
```
Consensus = (Transfermarkt × 0.40) + (EA × 0.20) + (Awards × 0.20) + (Media × 0.10) + (Form × 0.10)
```
All five components normalized 0–100. All 5 are sourced together from day one — no phased 3-then-5 component rollout, so the formula is always the full weighting (no renormalization for a deliberately-partial *category* set — see §3 for renormalization due to *incomplete manual entry*, which is a different concern).

**The one substantive change from the original plan:** Form is no longer an external manual lookup (the original plan: fbref.com match logs or WC qualification stats). It's computed entirely from this project's own already-gathered tournament data (`data/match-events.json`), broadened from "goals + assists" into an event-driven tournament-performance score so it's meaningful across all positions, not just attackers. See §3.

**Explicitly out of scope for Sprint 39:** the original spec's "Most Valuable XI" and similar Statistics-page features — natural future extensions once ranking coverage grows, not part of this rollout. Backfilling the group stage or eliminated teams. Any UI beyond the three surfaces in §5.

---

## 2. Data Schema

`data/rankings.json` already exists as an empty stub envelope (`{ "version": "1.0", "lastUpdated": ..., "data": [] }`) with `DataManager.loadRankings()` already wired up in `js/data.js` but currently uncalled anywhere. Sprint 39 populates this — no new client-side data-loading plumbing needed.

Per-player entry:

```json
{
  "playerId": "argentina-messi",
  "transfermarkt": 78,
  "ea": 91,
  "awards": 100,
  "media": 95,
  "form": 100,
  "formBreakdown": { "starts": 3, "subApps": 1, "goals": 7, "assists": 0, "motm": 3 },
  "consensus": 92.6,
  "provisional": false
}
```

- `transfermarkt` / `ea` / `awards` / `media` — flat, manually-entered numbers, 0–100. No provenance wrapper (unlike the H2H stats schema from Sprint 36) — there's no automated writer to reconcile a manual edit against, so a human just edits the field directly, the same way `broadcaster` and `venue` are hand-maintained elsewhere in this project.
- `form` / `formBreakdown` — computed, not manually entered. See §3.
- `consensus` — computed by `generate-rankings.js`, renormalizing weights across whichever of the 4 manual components are actually non-null (see §4).
- `provisional` — `true` whenever any of the 4 manual components is still `null`. Stored rather than re-derived by every consumer, matching the same reasoning as `formBreakdown` (compute once, don't make downstream code recompute a derived value). See §4 and §5 for how this gates hero-card eligibility and UI display.

**No `formVersion` field.** `generate-rankings.js` recomputes Form for every entry from scratch on every run (cheap — no external API, just rescanning already-local files), so 100% of entries always reflect the same formula by construction. A per-record version marker would just be identical duplication across ~312 records. If the Form formula changes, bump the top-level `rankings.json` `"version"` string and record the change in a `docs/ROADMAP.md` sprint retrospective — the same convention every other formula/architecture change in this project has used (the H2H self-inclusion fix, the bracket topology fix), never an embedded per-record version field.

**Ranking scope config:** a new `data/ranking-scope.json`, matching the existing `data/api-team-map.json` precedent exactly (a small, standalone, **bare JSON file — no `{version, lastUpdated, data}` envelope**, since this is configuration, not tracked content, and `api-team-map.json` is this project's own established precedent for exactly that distinction):

```json
{ "teams": ["argentina", "belgium", "colombia", "egypt", "england", "france", "morocco", "norway", "portugal", "spain", "switzerland", "usa"] }
```

`generate-rankings.js` reads this list rather than hardcoding it or dynamically re-deriving "who's alive right now" — the scope is a deliberate, one-time, human-editable decision, not something that should silently shift mid-run as more teams get eliminated.

---

## 3. Form Scoring Formula

Computed from `data/match-events.json` + `data/players/{team}.json`, per player, only for players in `data/ranking-scope.json`.

| Signal | Source | Weight (proposed, not locked) | Why |
|---|---|---|---|
| Start | appears in `homeStarting`/`awayStarting` | 3 pts | Baseline selection/trust signal — position-agnostic |
| Sub appearance | appears as `onPlayer` in a substitution | 1 pt | Involvement, weighted below a full start |
| Goal | `scorer` | 8 pts | Attacking end product |
| Assist | `assistBy` | 6 pts | Creative end product |
| MOTM | `motm` | 40 pts | Rare, prestigious, explicitly position-agnostic — a goalkeeper or center-back can win it without scoring |

Raw score = weighted sum → **percentile-ranked** (not min-max) across the scoped player pool, 0–100.

**Why percentile, not min-max — verified against real data, not assumed.** Aggregating real match-events for the 12 alive teams during this design session produced: `min: 1, max: 130 (186 once a name-matching bug — see below — was accounted for), median: 8`. That's a heavily right-skewed distribution with extreme outliers. Min-max normalization (`(score − min) / (max − min) × 100`) would compress nearly the entire pool into single digits (a median player would land around **3.8**, not a meaningful mid-table score) because one or two outliers stretch the denominator far past where the rest of the pool sits. Percentile rank avoids this: a median player lands near percentile 50 regardless of how extreme the top outlier is, giving a usable spread for the bulk of the pool while still putting a standout player at/near 100. Trade-off accepted: percentile discards magnitude ("how much better," not just "ranked higher") — acceptable since this feeds a 0–100 display score and hero-card sorting, not precise cardinal comparison.

**Tie-break rule (added for full determinism — see below):** players with identical raw scores must receive the *same* percentile, not be arbitrarily split by insertion order or an unstable sort.

**Disciplinary events (yellow/red cards): excluded entirely from the score.** Not neutral-but-tracked, not penalized — simply not part of the calculation. A card reflects referee/disciplinary judgment, not quality of performance; including it would penalize a hard-tackling but excellent defensive player and reward an overly cautious but technically poor one. Real-world "player of the tournament" honors (Golden Ball, MOTM itself) don't factor in card record either. A red card that cuts a match short is already reflected naturally (fewer minutes, fewer chances to add starts/goals) — no separate deduction needed.

**Name matching — reuses `gather-guardian-bios.mjs`'s proven strategy, not a new one.** Event fields (`scorer`, `assistBy`, `motm`, starting-XI names) are free-text strings, not player IDs, and inconsistent within the same match (see the Messi finding below). Every event carries `teamId`, so matching is scoped to that team's 26-player squad only, never cross-team — same fallback chain: exact name → dropped honorific/extra given name → quoted-nickname extraction → hand-verified `NAME_ALIASES` table → surname + first-initial fallback, **accepted only when unambiguous** (exactly one same-surname candidate in that roster). A refinement specific to this data: within one fixture, first resolve a surname-only name against that same match's own starting-XI/sub roster (a ~28-name pool) to recover the full name, *then* match that full name to the team's canonical player ID.

**Determinism is a hard requirement, not an aspiration.** If a name still can't be resolved after the full chain, `generate-rankings.js` reports it clearly (matching `gather-guardian-bios.mjs`'s existing `⚠ Unmatched: N`, names-listed convention) and **ignores that event** — it never guesses, never assigns to a "closest" candidate beyond the documented chain's own unambiguous surname-fallback step. This keeps re-runs reproducible and keeps any remaining data-quality work explicit rather than silently absorbed into a fuzzy match. Verified this is already how the reused logic behaves, not an assumption: `scripts/gather-guardian-bios.mjs`'s surname fallback (lines ~215-218) is explicitly gated on the same-surname candidate set having exactly one entry; failures go into an `unmatched` array reported in the run summary, never dropped silently and never fuzzy-assigned.

**Why this design was tightened, not just proposed:** aggregating real data during this session surfaced "Lionel Messi" (from `homeStarting`/`motm`, `{starts:3, subApps:1, motm:3}`) and "Messi" (from `scorer`, `{goals:7}`) as two separate fragments of the same player, purely from a naive exact-string match with no fallback chain applied. This is direct, concrete proof — not a hypothetical risk — that the matching chain is load-bearing for correctness, not optional polish. **This exact scenario becomes a required regression test fixture** (§6), not just a lesson noted in this doc.

---

## 4. Architecture & Data Flow

**Files** (following the established `scripts/` + `scripts/lib/` pattern, same shape as Sprint 42's `knockout-merge.mjs`):
- `scripts/generate-rankings.js` — orchestrator. Replaces the empty stub kept through Sprint 40 deliberately for this design (Sprint 40's retrospective explicitly flagged this file as a placeholder for Sprint 39, not dead code).
- `scripts/lib/ranking-formula.mjs` — new. (The previous `scripts/lib/ranking-formula.js` was correctly deleted in Sprint 40 as unimported dead code; this is fresh code against this design, not a resurrection of that stub.) Pure, exported functions: Form aggregation from match-events, the name-matching chain, percentile normalization with tie-breaking, consensus computation with renormalization. Designed for direct Sprint-37-style unit testing — no DOM/fetch mocking needed.

**Data flow, two stages:**
1. **Manual entry, directly in `data/rankings.json`.** A human researches and edits `transfermarkt`/`ea`/`awards`/`media` directly on a player's entry — no separate overrides file, no merge script (unlike the H2H stats pattern from Sprint 36, deliberately: that pattern protects a manual correction from being overwritten by an *automated* pipeline that re-runs periodically; there's no automated writer here to protect against, so a human just edits the field, matching how `broadcaster` is handled in Sprint 43).
2. **`generate-rankings.js` seeds + recomputes, idempotently, on every run:**
   - Ensures every player in `data/ranking-scope.json`'s teams has at least a stub entry (with manual fields `null` if not yet researched).
   - Recomputes `form`/`formBreakdown` for every entry, fresh, from `match-events.json` (cheap; see §2's `formVersion` reasoning).
   - Recomputes `consensus` for every entry, **renormalizing weights across whichever of the 4 manual components are actually non-null.** This isn't a phased-rollout mechanism (§1 already decided against phasing by category) — it's a practical necessity, because 312 players' worth of manual research will genuinely arrive over real time, not atomically. The original spec's own renormalization logic (Phase 1: TM 50%/EA 25%/Awards 25% with 3 components) turns out to still be needed, just for a different reason than originally intended.
   - Sets `provisional: true` whenever any manual component is still `null`.

**Provisional entries are ranked and visible, but not eligible for automatic hero-card/top-player selection until `provisional` is false.** (Simpler than an earlier considered alternative — a minimum-component threshold or tie-break rule — deliberately rejected in favor of this cleaner binary rule.) This prevents an incompletely-researched player's renormalized score (potentially inflated, since renormalizing over 1 present component gives it 100% of the manual weight) from out-ranking a genuinely stronger, fully-researched player in a user-facing "best of the tournament" selection, purely because their research gap hasn't been filled in yet.

**Ties into two already-established project conventions, not new ones:** `scripts/validate-data.js` gains a third non-fatal warning-check (alongside squads and Sprint 43's broadcaster check) reporting how many in-scope players are still `provisional` and which components are missing — same "detect and report, never fail validation" idiom.

---

## 5. UI Surfacing

**Hero Cards** (`js/modules/overview-tab.js`, currently `sort by caps desc, take top 5`, lines 47-48): switches to sort by consensus score, **excluding `provisional` entries entirely**. Fallback, to avoid ever breaking a page:
- A team with zero `data/rankings.json` entries (the 36 not-yet-in-scope teams): hero cards behave exactly as today. Zero regression risk for teams this sprint doesn't touch.
- An in-scope team with fewer than 5 non-provisional entries (expected for a while, since manual research arrives gradually): fill remaining slots via the existing caps-based sort.
- **The fallback must be visible, not invisible** — and this resolves a small pre-existing gap rather than adding new UI chrome: the original product spec already specifies hero cards should display "Consensus Score" (`01_PRODUCT_SPEC.md`, "TOP 5 HERO PLAYERS" section), but the current code always shows caps in that stat slot — that field was placeholdered, never actually built to spec. The fix serves both purposes at once: a consensus-ranked card's stat line shows **"Consensus 82"**; a caps-fallback card keeps showing **"126 caps"**. Which criterion produced each card becomes self-evident from what's printed, with no separate badge system needed.

**Profile Panel — new "Ranking Breakdown" section**, confirmed not yet built (`profile-panel.js` has zero references to ranking/consensus). Per the original spec's layout, it sits between Biography and Similar Players. Shows:
- Consensus Score, prominently, with a **"Provisional"** marker whenever `provisional: true` — a missing component must never read as a silent `0` (which would imply "assessed and found lacking" rather than the true "not yet researched").
- Each of the 5 components as a 0–100 value, or *"not yet researched"* for a null manual field.
- `formBreakdown`'s raw counts (starts/subApps/goals/assists/motm) in a collapsed `<details>` — reusing Match Centre's existing disclosure pattern for H2H stats and lineups, not a new UI idiom.

**Club/League Explorer "Average Consensus Rating":** computed only from non-provisional ranked players for that club/league (same exclusion rule as hero cards, so a club's average isn't skewed by an incomplete entry). Most clubs will have zero ranked players at first (312 players are spread across ~450 clubs) — when that's the case, **omit the stat entirely**, matching this app's existing empty-state conventions, rather than showing a misleading "N/A" or "0."

---

## 6. Testing & Error Handling

**Unit tests** (`scripts/lib/ranking-formula.mjs`, pure functions, Sprint 37-style — no DOM/fetch mocking):
- Consensus formula, including renormalization over non-null manual components.
- Percentile normalization, including the tie-break rule (identical raw scores → identical percentile).
- **A fixture shaped exactly like the real Messi bug found during this design session** — a player appearing as both a full name and a surname-only string across different event types within one match — asserting the matching chain resolves them to a single combined stat line, not two fragments. The bug that was found becomes the regression test, not just a note in this document.
- A fixture with a genuinely unresolvable name (no exact/alias/unambiguous-surname match available) — asserting it's reported and the event is skipped, not guessed.

**Unmatched names: always reported, never silent, never guessed.** Reusing `gather-guardian-bios.mjs`'s existing convention (matched/unmatched counts per team, unmatched names listed, capped at 30 with a "+N more" summary), `generate-rankings.js` logs every event name it couldn't resolve even after the full fallback chain, with a run-end summary — matching the "detect and report" idiom this project now uses everywhere (H2H capped pairs, broadcaster gaps, and now this).

**Manual verification, before trusting the output:** re-run the same kind of real-data sanity check performed during this design session — aggregate real match-events stats for a handful of recognizable players, hand-verify the computed Form/consensus matches expectation (the Messi/Salah/Mbappé/Bellingham/Kane/Ronaldo/Haaland top-of-list result, once name-matching is applied, is the acceptance bar to reproduce). This design session's own verification method *is* the intended acceptance check for Sprint 39, not a one-off exercise.

**Browser regression check** (Playwright, matching every prior sprint's pattern): a team with full ranking data, a team with partial/provisional data, and one of the 36 out-of-scope teams (confirming zero change). Hero cards, the new Profile Panel section, and Club/League Explorer all need checking across those three states.

---

## Decisions log (for anyone picking this up cold)

| Decision | Resolution |
|---|---|
| What gets ranked | Players only |
| Initial player scope | 12 currently-alive teams, full squads (~312 players), one-time cut |
| Component phasing | None — all 5 components sourced together from day one |
| Form source | Computed from `data/match-events.json` (this tournament's real data), not external lookup |
| Form model | Event-driven performance score (starts, sub-apps, goals, assists, MOTM), not just goals+assists — meaningful across positions |
| Disciplinary events (cards) | Excluded entirely from Form |
| Normalization | Percentile rank, not min-max — verified against real, right-skewed data from this session |
| Name matching | Reuse `gather-guardian-bios.mjs`'s fallback chain, team-scoped, unambiguous-only |
| Determinism | Hard requirement — unresolved names are reported and the event ignored, never guessed |
| `formVersion` field | Not needed — full recompute every run guarantees internal consistency; bump the envelope `version` instead if the formula changes |
| Ranking scope storage | `data/ranking-scope.json`, bare (no envelope), matching `data/api-team-map.json`'s precedent |
| Manual component storage | Direct edits to `data/rankings.json`, no overrides file (no automated writer to protect against) |
| Incomplete manual data | `consensus` still computed (renormalized), but `provisional: true` — visible in schema, UI, and validation |
| Provisional entries + hero cards | Ranked and visible everywhere, but excluded from automatic hero-card/top-player selection until `provisional` is false |
| Hero-card fallback visibility | Stat line shows "Consensus N" for ranked cards vs. "N caps" for fallback cards — also fixes a pre-existing gap versus the original spec |
| Testing | Pure-function unit tests including a Messi-shaped name-collision fixture; reused unmatched-reporting convention; browser regression across 3 team states |

## Explicitly out of scope for Sprint 39

- Backfilling eliminated teams' rankings.
- Statistics-page features (Most Valuable XI, etc.) built on top of ranking data.
- Any change to `data/fixtures.json`/group-stage data.
