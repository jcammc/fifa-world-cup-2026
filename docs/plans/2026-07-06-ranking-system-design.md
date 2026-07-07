# Ranking System Design (Sprint 38)

**Status:** Design complete, approved. Infrastructure implemented (Sprint 39, first pass, 2026-07-06/07). This document was revised on 2026-07-07, before the manual data-entry phase began, once real-world source-access testing (see "Acquisition strategy revision" below) showed the originally-planned sourcing for 3 of the 4 manual components didn't hold up.
**Produced:** 2026-07-06, via a `/brainstorming` design session (per the Sprint 38 decision to run this as a dedicated conversation, not an inline draft).

---

## 0. Acquisition strategy revision (2026-07-07, pre-manual-entry)

Before starting the manual data-entry phase, each of the four components' originally-planned source (§4 of `DATA_ACQUISITION_STRATEGY.md`) was tested directly against the live sites, not assumed. Three of the four didn't hold up:

- **Transfermarkt** (40% weight): fully blocked to any automated/agent fetch — `curl` returns 403, and Claude Code's own WebFetch tool returns a hard error, not just a blocked-content page. Same failure class this project already hit and ruled out for WorldFootball.net (see `scripts/gather-head-to-head-stats.mjs`'s header comment).
- **EA ratings**: `ea.com/games/ea-sports-fc/ratings` only renders ~15-20 global "featured" superstars in static content — tested against a real, non-superstar squad player (Norway's Sondre Langås) and got zero results, because the actual per-player search is JS-driven. Both common scriptable mirrors (FUTBIN, SoFIFA) return a hard 403.
- **Media**: Instagram is login-walled — tested against Messi's own profile (the best-case control) and no follower count is visible without authenticating.
- **Awards**: the one exception. Wikipedia is reachable, and `DATA_ACQUISITION_STRATEGY.md` §4 already has a usable scoring rubric — but see the further limitation below.

**Revised acquisition strategy, adopted going forward:**

| Component | Original plan | Revised plan |
|---|---|---|
| Transfermarkt | Agent fetches transfermarkt.com | **User supplies the raw market value (€)** from their own browser session (one Transfermarkt squad page shows all ~26 players at once — this is one lookup per team, not 26); the 0–100 score is then **derived automatically** |
| EA | Agent fetches ea.com/FUTBIN | **User supplies the raw OVR rating** (0–99) per player; the 0–100 score is a **direct passthrough**, no agent fetch |
| Awards | Agent fully automates from Wikipedia | **Partially automated**: World Cup winner status is reliably auto-detectable (see below); everything else (individual-award tiers, CL/domestic title counts) is a **manual structured field**, same reasoning as Transfermarkt/EA — free-text award mentions aren't reliably parseable, see below |
| Media | Instagram follower count | **Replaced entirely** with the **Wikimedia Pageviews API** (`wikimedia.org/api/rest_v1/metrics/pageviews/...`) — public, no-auth, verified reachable for both a global superstar (Messi: 771,996 May-2026 views) and an obscure squad player (Langås: 4,946 views), with a clean 404 for a nonexistent article rather than a silent wrong answer |

**New architectural principle: raw data in, derived scores out.** No human ever hand-computes or hand-enters a final 0–100 score for any of the four manual components. A human (or an automated fetch, where one reliably exists) supplies the **raw** signal — market value in €, EA's own 0–99 rating, a structured honours record, a pageview count — and a pure function in `scripts/lib/ranking-formula.mjs` derives the 0–100 score from it, deterministically, every time `generate-rankings.js` runs. This replaces the original design's "a human just edits the 0–100 field directly" convention (§4, below) for these four fields specifically; `provisional` and `consensus` are unaffected.

**Further limitation found while implementing Awards automation:** Wikipedia footballer infoboxes have a `medaltemplates` field that reliably captures **team competition results** (`{{Medal|W|[[2022 FIFA World Cup|2022 Qatar]]}}` — structured, deterministic, confirmed against Messi's actual infobox wikitext) — enough to auto-detect the rubric's "World Cup winner: +15" bonus. But the rubric's highest-value signals — Ballon d'Or tier, FIFA Best Player, UEFA Player of the Year, World Cup Golden Ball, TOTY — live in free-flowing prose in a separate article section (confirmed: no `individualhonours` infobox field exists on this template variant), not a structured template. Parsing free prose into a specific tier deterministically isn't reliably achievable without risking a silent misclassification, which conflicts with this project's hard determinism requirement (§3, below). So Awards auto-detection is scoped to World Cup winner only; the rest of `awardsRaw` (see §2) is a manual structured field, same as Transfermarkt/EA.

---

## 0b. Wikidata Awards extension + manual-entry workflow (2026-07-08)

Before starting the manual data-entry phase, one further automatable source was found and verified: **Wikidata's structured `P166` ("award received") claims.** Tested directly, not assumed:
- Messi (`Q615`) has 66 `P166` claims, including exact Q-ids for **Ballon d'Or** (`Q166177`), **FIFA Ballon d'Or** (`Q2291862`, the 2010-2015 merged era), **FIFA World Player of the Year** (`Q182529`) / **The Best FIFA Men's Player** (`Q28156245`, the post-2016 name for the same lineage), **UEFA Men's Player of the Year Award** (`Q260117`), and **World Cup Golden Ball** (`Q17355204`).
- A control check against an obscure squad player (Norway's Sondre Langås, `Q102330606`) returned a real, resolved entity with **0** award claims — the correct, honest answer, not a lookup failure.
- Crucially, this is queried with an **exact, deterministic lookup** (`action=wbgetentities&sites=enwiki&titles=<title>`), reusing the article title `gather-rankings-signals.mjs` already resolved and verified for Media/World-Cup-winner — no new fuzzy name-matching risk introduced.

**Coverage limit, by design, not oversight:** `P166` only reliably captures **wins**, never placements — it has no concept of "Ballon d'Or runner-up" or "top 10". So Ballon d'Or top-3/top-10 tiers, Champions League win counts, domestic title counts, and TOTY (a video-game industry award, not tracked the same way on Wikidata) are **not** covered by this extension and remain manual. An award Q-id not in the small, individually-verified mapping table (`BALLON_DOR_QIDS`/`UEFA_POTY_QID`/`WC_GOLDEN_BALL_QID` in `scripts/gather-rankings-signals.mjs`) is simply not touched — never guessed.

**FIFA Best Player was tried and removed the same day, after a confirmed false positive.** Wikidata's `P166` claims for Egypt's Mohamed Salah include `Q28156245` ("The Best FIFA Men's Player") — but Salah only ever **finished 3rd** for that award (2018, 2021; confirmed against the actual Wikipedia prose). Wikidata includes podium finalists under "award received" for this specific award with no queryable qualifier distinguishing a finalist from an actual winner (checked: the claim carries only a `P585` date qualifier, nothing else). Spot-checked the three remaining mappings against real non-winners already in this project's scope — Ballon d'Or: Mbappé (a genuine multi-time runner-up); UEFA POTY: Bellingham (a real 2023-24 finalist who didn't win) and Kane; World Cup Golden Ball: Mbappé again (the real 2022 Silver Ball/runner-up) — all three correctly show no claim, so this risk appears isolated to FIFA Best Player specifically, not systemic. (One unrelated false *negative* surfaced during this check: Spain's Rodri genuinely won UEFA POTY 2023-24, but Wikidata doesn't yet have that claim — an acceptable gap, since under-detection just defers to manual entry rather than asserting a wrong fact.) Per this project's determinism principle — a field that can produce even one wrong answer gets removed entirely, not patched with an unverified heuristic — `fifaBestPlayer` is fully manual again, and the two already-written values this bug produced (Messi, Egypt's Salah) were stripped from `data/rankings.json` even though Messi's happened to be correct by coincidence.

**Manual-entry workflow, revised to avoid hand-editing JSON:** `scripts/import-ranking-raw.mjs` (`npm run import-ranking-raw`) bulk-imports one team's worth of researched values at a time from a pasted CSV (no header row) via stdin:

```
--field transfermarkt : playerId,valueEUR
--field ea            : playerId,ratingRaw                (0-99, EA's own scale)
--field awards        : playerId,ballonDorTier,fifaBestPlayer,uefaPoty,totyEaFc,clWins,domesticTitles
                         (worldCupWinner, ballonDorTier[winner-only], uefaPoty, and
                          wcGoldenBall are auto-detected where reliable and don't need
                          a manual entry unless correcting/supplementing one; fifaBestPlayer
                          is fully manual — see above)
```

A blank cell means "not researched/not applicable" and is left untouched — never coerced to 0/false. For `--field awards`, a player's row appearing in the CSV at all marks `awardsRaw` as researched (a real object, not `null`) even when every optional column is blank, so a player who was genuinely checked and has none of these correctly resolves to a computed score of 0, not stuck forever on "not yet researched" (matching the same "researched-and-found-nothing is 0, not null" rule `deriveAwardsScore()` already enforces). Never overwrites a field that's already non-null unless `--force` is passed (a deliberate correction) — same conservative default as this project's other hand-maintained fields (`broadcaster`, H2H manual overrides).

**Lightweight provenance, added from the outset rather than retrofitted:** every entry gains an optional `rawProvenance` object recording, per raw-field-group (`transfermarktValueEUR` / `eaRatingRaw` / `awardsRaw`), the `source` (a URL, or `"manual research"`) and `enteredAt` date supplied to the import run — see §2's schema example. This is deliberately one provenance note per field group per import pass, not per individual `awardsRaw` sub-field — "source plus entered date" is enough to answer "where did this come from and when," without the bookkeeping overhead of tracking provenance at the sub-field level. The auto-populated fields (`mediaPageviews`, and the Wikidata/`medaltemplates`-derived `awardsRaw` sub-fields) don't need provenance — they're always freshly re-verifiable by re-running `gather-rankings-signals.mjs`, unlike a human's one-time claim.

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

Per-player entry (revised 2026-07-07 for raw-in/derived-out, revised again 2026-07-08 for `rawProvenance` — see §0/§0b for why):

```json
{
  "playerId": "argentina-messi",
  "transfermarktValueEUR": 15000000,
  "eaRatingRaw": 91,
  "awardsRaw": {
    "ballonDorTier": "winner",
    "fifaBestPlayer": true,
    "uefaPoty": false,
    "wcGoldenBall": true,
    "totyEaFc": true,
    "worldCupWinner": true,
    "clWins": 4,
    "domesticTitles": 10
  },
  "mediaPageviews": 771996,
  "rawProvenance": {
    "transfermarktValueEUR": { "source": "https://www.transfermarkt.com/lionel-messi/profil/spieler/28003", "enteredAt": "2026-07-08" },
    "eaRatingRaw": { "source": "https://www.ea.com/games/ea-sports-fc/ratings", "enteredAt": "2026-07-08" },
    "awardsRaw": { "source": "manual research", "enteredAt": "2026-07-08" }
  },
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

- **Raw fields** — `transfermarktValueEUR`, `eaRatingRaw`, `awardsRaw`, `mediaPageviews`. Written by a human (via `scripts/import-ranking-raw.mjs`, see §0b — never hand-edited JSON directly) for `transfermarktValueEUR`/`eaRatingRaw`/`fifaBestPlayer`/most of `awardsRaw`, or by `gather-rankings-signals.mjs` for `mediaPageviews` and the `awardsRaw` sub-fields Wikipedia/Wikidata reliably support (`worldCupWinner`, `ballonDorTier` [winner tier only], `uefaPoty`, `wcGoldenBall` — see §0b for why `fifaBestPlayer` was tried and reverted). `awardsRaw` is `null` until first touched, then a structured object mirroring the rubric's own shape (tier + boolean flags + counts) — never a free-text blob, so `deriveAwardsScore()` can stay a deterministic pure function.
- **`rawProvenance`** (added 2026-07-08, see §0b) — optional per-entry object, one `{ source, enteredAt }` note per raw-field-group (`transfermarktValueEUR` / `eaRatingRaw` / `awardsRaw`) that was manually supplied via the import script. Not present for auto-populated fields (`mediaPageviews`, and the Wikidata/`medaltemplates`-derived `awardsRaw` sub-fields) — those are always freshly re-verifiable by re-running `gather-rankings-signals.mjs`, so a one-time provenance note doesn't apply the same way it does to a human's claim.
- **Derived fields** — `transfermarkt` / `ea` / `awards` / `media`, flat 0–100 numbers. **Never hand-edited.** `generate-rankings.js` recomputes each one, every run, from its corresponding raw field via a pure `derive*Score()` function in `ranking-formula.mjs` (see §3a) — exactly the same "recompute fresh every run, no version marker needed" treatment `form` already gets, just extended to all four components instead of one. A `null` raw field means the derived field stays `null` too (not 0 — a missing score must never look like an assessed, poor one).
- `form` / `formBreakdown` — computed, not manually entered, unchanged from the original design. See §3.
- `consensus` — computed by `generate-rankings.js`, renormalizing weights across whichever of the 4 derived components are actually non-null (see §4).
- `provisional` — `true` whenever any of the 4 derived components is still `null` (equivalently: whenever its raw field is still `null`). Stored rather than re-derived by every consumer, matching the same reasoning as `formBreakdown` (compute once, don't make downstream code recompute a derived value). See §4 and §5 for how this gates hero-card eligibility and UI display.

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

## 3a. Component Derivation Methodology (added 2026-07-07, see §0)

Four pure functions in `ranking-formula.mjs`, each taking a raw signal and returning a 0–100 score (or `null` if the raw input is `null`). **These three different derivation methods are deliberately not unified into one rule** — applying percentile rank to EA's already-0–100-scaled rating, for instance, would compress it in a way the original spec never intended.

- **`deriveTransfermarktScore(entries)`** — `entries: [{ key, raw }]`, `raw` = market value in EUR. A thin wrapper over the existing `percentileRank()` (same function Form already uses). **Percentile scope is the subset of in-scope players who currently have a non-null `transfermarktValueEUR`, not the full 286-player scope** — unlike Form, which always has a numeric raw value for every player (zero tracked events still yields raw score 0), a not-yet-researched player has no raw Transfermarkt value at all. The percentile is recomputed fresh every run and will shift slightly as more raw values arrive — expected, same "always recompute" philosophy as Form.
- **`deriveMediaScore(entries)`** — identical shape and same non-null-subset percentile treatment, over `mediaPageviews`.
- **`deriveEaScore(rawOvr)`** — **direct passthrough, not percentile.** `DATA_ACQUISITION_STRATEGY.md` §4's own wording is "0–99 scale → treat as 0–100," i.e. use the number as-is (a 91 OVR becomes score 91) — no proportional rescale, no percentile step.
- **`deriveAwardsScore(awardsRaw)`** — applies the existing rubric (`DATA_ACQUISITION_STRATEGY.md` §4) mechanically: take the highest base tier reached across Ballon d'Or (winner 100 / top 3: 85 / top 10: 70), FIFA Best Player (95), UEFA Player of the Year (90), World Cup Golden Ball (90), TOTY (80); add the capped bonuses (World Cup winner +15, CL wins ×10 capped at +20, domestic titles ×5 capped at +15); cap the total at 100.

**Wikipedia article-title resolution** (needed for both Media pageviews and Awards' World Cup Winner auto-detection) is a different problem from the existing match-events name-matching chain (§3) — that chain resolves a free-text event name to a team-roster player ID; this resolves a player's name to an actual Wikipedia **article title**. Strategy, same "unambiguous or refuse" determinism principle as everywhere else in this project: try the direct title (`Firstname_Lastname`) first — confirmed this resolves correctly for both a global superstar and an obscure squad player during testing; if that 404s, fall back to Wikipedia's own search API and accept a candidate only if it's an unambiguous single match, otherwise report the player as unresolved and leave the raw field `null` — never guess.

---

## 4. Architecture & Data Flow

**Files** (following the established `scripts/` + `scripts/lib/` pattern, same shape as Sprint 42's `knockout-merge.mjs`):
- `scripts/generate-rankings.js` — orchestrator. Replaces the empty stub kept through Sprint 40 deliberately for this design (Sprint 40's retrospective explicitly flagged this file as a placeholder for Sprint 39, not dead code).
- `scripts/lib/ranking-formula.mjs` — new. (The previous `scripts/lib/ranking-formula.js` was correctly deleted in Sprint 40 as unimported dead code; this is fresh code against this design, not a resurrection of that stub.) Pure, exported functions: Form aggregation from match-events, the name-matching chain, percentile normalization with tie-breaking, consensus computation with renormalization. Designed for direct Sprint-37-style unit testing — no DOM/fetch mocking needed.

**Data flow, revised 2026-07-07 (see §0) — three stages now, not two:**
1. **Raw signal entry, one team at a time via `scripts/import-ranking-raw.mjs`** (§0b) — not hand-edited JSON. For `transfermarktValueEUR` and `eaRatingRaw`: a human supplies the raw value, sourced from their own browser session (no automated fetch — see §0). For `awardsRaw`: the sub-fields Wikidata/Wikipedia can't reach (Ballon d'Or top-3/top-10, CL wins, domestic titles, TOTY). For `mediaPageviews`: fully automated, see below. No separate overrides file — the import script still writes directly into `data/rankings.json`, same target as a hand-edit would (unlike the H2H stats pattern from Sprint 36, deliberately: that pattern protects a manual correction from being overwritten by an *automated* pipeline that re-runs periodically; there's no automated writer here to protect the manual raw fields against). Every import records a lightweight `rawProvenance` note (§0b/§2).
2. **`gather-rankings-signals.mjs` (new, optional, re-runnable):** for each in-scope player, resolves their Wikipedia article title, fetches Wikimedia Pageviews to populate `mediaPageviews`, checks the infobox `medaltemplates` field for `awardsRaw.worldCupWinner`, and queries Wikidata's structured `P166` claims (via the same resolved title) for `awardsRaw.ballonDorTier`/`uefaPoty`/`wcGoldenBall` (§0b — `fifaBestPlayer` was tried the same way and reverted after a confirmed false positive) — merged in without touching any other `awardsRaw` sub-field a human may have already filled in. Reports unresolved players clearly; never guesses. Never overwrites a raw field a human already supplied.
3. **`generate-rankings.js` seeds + derives + recomputes, idempotently, on every run:**
   - Ensures every player in `data/ranking-scope.json`'s teams has at least a stub entry (raw fields `null` if not yet researched).
   - Recomputes `form`/`formBreakdown` for every entry, fresh, from `match-events.json` (cheap; see §2's `formVersion` reasoning).
   - Recomputes `transfermarkt`/`ea`/`awards`/`media` for every entry, fresh, from whichever raw fields are currently non-null, via the four `derive*Score()` functions (§3a) — never hand-edited, same "always recompute" treatment Form already gets.
   - Recomputes `consensus` for every entry, **renormalizing weights across whichever of the 4 derived components are actually non-null.** This isn't a phased-rollout mechanism (§1 already decided against phasing by category) — it's a practical necessity, because 286 players' worth of manual research will genuinely arrive over real time, not atomically. The original spec's own renormalization logic (Phase 1: TM 50%/EA 25%/Awards 25% with 3 components) turns out to still be needed, just for a different reason than originally intended.
   - Sets `provisional: true` whenever any of the 4 derived components is still `null`.

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
- **(Added 2026-07-07)** `deriveTransfermarktScore()` / `deriveMediaScore()`: percentile behavior over a subset with some `null` raw values excluded, not just a full pool.
- `deriveEaScore()`: direct passthrough (91 → 91), `null` → `null`, no percentile/rescale applied.
- `deriveAwardsScore()`: the tier-plus-bonus rubric — a Ballon d'Or winner with World Cup + CL + domestic bonuses capping at 100; a player with no honours at all (`awardsRaw` all-false/zero, but non-null) scoring 0, not `null` — the distinction between "researched, genuinely has nothing" (0) and "not yet researched" (`null`) must hold.
- **(Added 2026-07-08, `test/gather-rankings-signals.test.mjs`)** `detectWorldCupWinner()`: the real Messi medaltemplates fixture (win), a youth-tournament fixture (must NOT count), a runner-up fixture (must NOT count). `mapWikidataAwardsToRaw()`: the real Messi Q-id set mapping to all four covered fields; an empty claim list (the real Langås fixture) mapping to `{}`; unrelated real award Q-ids Messi also has (European Golden Shoe, etc.) NOT leaking into the result. `mostRecentCompletedMonth()`: the day-28-fails-for-30-day-months bug as a fixture, plus a January-rollback-to-December-of-prior-year edge case.

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
| **(2026-07-07) Transfermarkt/EA acquisition** | **Revised**: agent-side fetch confirmed blocked for both (Transfermarkt 403/WebFetch hard error; EA static content only covers ~15-20 superstars, FUTBIN/SoFIFA both 403) — user supplies raw values, `derive*Score()` computes the 0–100 score |
| **(2026-07-07) Media acquisition** | **Revised**: Instagram confirmed login-walled even for a control superstar profile — replaced entirely with the Wikimedia Pageviews API (public, no-auth, verified against both a superstar and an obscure squad player) |
| **(2026-07-07) Awards acquisition** | **Revised**: only World Cup winner status is reliably auto-detectable from Wikipedia's structured infobox `medaltemplates` field; individual-award tiers (Ballon d'Or, FIFA Best, UEFA POTY, WC Golden Ball, TOTY) live in free prose, not a structured field, and aren't reliably parseable without risking a silent misclassification — kept as a manual structured field, same as Transfermarkt/EA |
| **(2026-07-07) Architecture principle** | **Added**: "raw data in, derived scores out" — no human ever hand-maintains a final 0–100 score for any of the 4 manual components; schema extended with `transfermarktValueEUR`/`eaRatingRaw`/`awardsRaw`/`mediaPageviews`; `computeConsensus()` itself is unchanged and still only ever consumes 0–100 derived scores |
| **(2026-07-08) Awards automation, extended** | Wikidata's structured `P166` claims automate `ballonDorTier` (winner only), `uefaPoty`, and `wcGoldenBall` — verified via an exact sitelinks lookup reusing the already-resolved article title, no new name-matching risk. Ballon d'Or top-3/top-10, CL wins, domestic titles, and TOTY remain manual — `P166` only captures wins, never placements |
| **(2026-07-08) `fifaBestPlayer` automation, tried and reverted** | Confirmed false positive: Egypt's Salah shows a `P166` claim for "The Best FIFA Men's Player" despite only finishing 3rd (2018, 2021) — Wikidata includes finalists here with no distinguishing qualifier. Spot-checked the other three mappings clean against real non-winners (Mbappé, Bellingham, Kane); removed `fifaBestPlayer` entirely rather than build an unverified heuristic, and stripped the two already-written values (Messi, Salah) from `data/rankings.json` |
| **(2026-07-08) Manual-entry mechanism** | `scripts/import-ranking-raw.mjs` bulk-imports one team's pasted CSV at a time directly into `data/rankings.json`'s raw fields, instead of hand-editing JSON. Conservative by default (never overwrites a non-null raw field without `--force`) |
| **(2026-07-08) Provenance** | Added from the outset, not retrofitted: `rawProvenance` records `{source, enteredAt}` per raw-field-group for manually-supplied values only — auto-populated fields don't need it, since they're always freshly re-verifiable |

## Explicitly out of scope for Sprint 39

- Backfilling eliminated teams' rankings.
- Statistics-page features (Most Valuable XI, etc.) built on top of ranking data.
- Any change to `data/fixtures.json`/group-stage data.
