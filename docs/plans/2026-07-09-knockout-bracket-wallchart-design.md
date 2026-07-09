# Knockout Bracket Wallchart Redesign — Design

**Date:** 2026-07-09
**Status:** Approved — ready for implementation (Sprint 44)
**Supersedes:** No prior design doc for this component. Builds on top of Sprint 42 (`js/bracket-topology.js`'s `PROPAGATION` map, per-match confirmation ticks, topology-derived connectors — all still correct and reused, not rebuilt).

---

## 0. Why

The user provided two images: the current live bracket (a single left-to-right cascade — Round of 32 down to Final all in one column sequence) versus a target reference — a classic symmetric double-sided "wallchart" bracket (Round of 32 on both far edges, rounds nesting inward, Final + Champion + Third Place in the center where the two draw halves converge).

The current cascade layout's core flaw: total column height is dictated by Round of 32's 16 matches, but Quarter-finals (4), Semi-finals (2), and the Final (2) each have far fewer cards — so later rounds' cards float at their feeder-midpoint position inside a mostly-empty column, reading as sparse and disconnected even though the underlying positioning math is correct. (Separately, the screenshot that prompted this was confirmed to be from production, which was 38 commits behind local and still running the pre-Sprint-42 connector bug — already fixed by pushing to `origin/master` on 2026-07-09, before this redesign work began. This design is about the *layout shape*, not a data-correctness bug.)

Splitting the bracket into two 8-match halves (confirmed clean via the existing `PROPAGATION` graph — see §1) caps every column at 8 slots instead of 16, which is what makes the wallchart shape read as proportionate.

**Sprint 39 (rankings data acquisition) is paused** by explicit user direction to prioritize this redesign. Resume Sprint 39 (EA ratings manual CSV import) once this sprint lands.

---

## 1. Data grouping — fully derived, no hardcoded lists

`js/bracket-topology.js` gains:

```js
export function getBracketSide(matchId) {
  // Walks PROPAGATION[matchId].winner.match forward until it reaches
  // 'sf-m1' (-> 'left') or 'sf-m2' (-> 'right'). Terminal matches
  // ('final-m1', '3rd-place') return null — they belong to the center
  // column, not a side.
}
```

This is a pure forward-walk of the existing `PROPAGATION` map — no new data, no second list of match IDs maintained by hand. Verified against the current map: Left = R32 `m1,m2,m3,m5,m9,m10,m11,m12` → R16 `m1,m2,m5,m6` → QF `m1,m2` → `sf-m1`. Right = the other 8/4/2 → `sf-m2`. Both halves are exactly 8/4/2/1, confirming the graph really does split symmetrically before any rendering code depends on that assumption.

A second helper, `getSidePartition(rounds)`, returns `{ left: [...matchIds], right: [...matchIds] }` for all non-terminal rounds (r32/r16/qf/sf) — used both by the renderer (§2) and directly by the propagation-integrity test (§6), so the test exercises the exact same function the app uses, not a re-implementation of the split logic.

---

## 2. Column pipeline — the centre is a column, not a special case

Rendering builds a single ordered list of **9 column descriptors**: `[R32-L, R16-L, QF-L, SF-L, CENTER, SF-R, QF-R, R16-R, R32-R]`. Every descriptor has the same shape — `{ id, label, matches, mirrored }` — and goes through the same column-building function (today's `#buildRound`, generalized to take an explicit `matches` array instead of a whole round object, since each side column now holds a filtered subset). Left-side and right-side instances of the same round share one label (e.g. "ROUND OF 32") but compute their own date range independently (`#roundDateRange()`, called per column — the two halves' kickoff windows can genuinely differ), and their own per-half "all confirmed" banner.

`CENTER`'s `matches` array stays exactly what it is today — `[final-m1, 3rd-place]` — with one addition: a Champion element (§4) is prepended inside the same `.bracket-round__matches` container HTML, so it is literally *content of that column*, not a separately-positioned overlay glued on outside the render pipeline. The positioning pass (§3) still special-cases the center column the way today's code already special-cases the "final round" (`isFinalRound` branch) — that special-casing was already confined to the positioning math, not a parallel render path, so this doesn't introduce a new pattern, it extends the existing one.

---

## 3. Positioning — one shared algorithm, called per half

The vertical-center computation (`each card's center = average of its true feeders' centers, looked up by match ID via getFeederMatchIds`) is direction-agnostic — averaging two numbers doesn't care whether the result is drawn flowing left-to-right or right-to-left. So `#positionBracket()`'s existing per-round loop runs **unchanged, called twice** — once over `[R32-L, R16-L, QF-L, SF-L]`, once over `[R32-R, R16-R, QF-R, SF-R]` — producing two independent center-maps. Both halves have equal R32 counts (8 each), so both naturally produce identical `totalH`; `Math.max()` of the two is used defensively for the shared column height.

`CENTER`'s position is computed the same way the current "final round" branch already does: `final-m1`'s center = average of `sf-m1`'s center (from the left half's map) and `sf-m2`'s center (from the right half's map) — directly comparable since both halves share the same `totalH`. `3rd-place` sits below it, same offset logic as today.

**Connector geometry becomes a single pure function, not two implementations:**

```js
export function computeConnectorGeometry({ fromA, fromB, toY, gapPx, mirrored = false }) {
  // Returns an array of 4 line segments: two stubs from the feeders,
  // one vertical spine, one outgoing stub to the child card.
  // mirrored=false: feeders sit at x=0, child at x=gapPx (today's L->R flow).
  // mirrored=true:  feeders sit at x=gapPx, child at x=0 (R->L flow for the right half).
}
```

This has zero DOM dependency — pure numeric input, numeric output — extracted out of `#drawConnectors` (which becomes a thin wrapper: look up true feeders via `getFeederMatchIds`, call `computeConnectorGeometry`, draw each returned segment as an SVG `<line>`). The *only* thing that differs between the left half's connectors and the right half's is the `mirrored` flag and which edge the SVG attaches to (`left:100%` vs `right:100%`) — there is exactly one connector implementation, parameterized, not two maintained in parallel.

---

## 4. Champion box — deliberately minimal

New pure builder, module-scope and testable like `buildMatch`:

```js
export function buildChampionBox(finalMatch, countryMap) {
  // Before finalMatch is FT: trophy icon + "TBD" placeholder.
  // After: deriveWinnerId(finalMatch) (existing function, bracket-topology.js)
  // resolves the winning teamId; render its flag + name. No separate
  // winner-derivation logic — this is the ONLY thing that decides the winner.
}
```

Positioned directly above the Final card: `top = finalCardTop − championBoxHeight − var(--bracket-champion-gap)`, computed in the same positioning pass as the rest of the center column, so it tracks automatically if Final's Y shifts as data fills in.

---

## 5. CSS variables — spacing becomes tunable, not hardcoded

- `gapPx` (inter-column spacing) is already CSS-driven today (`getComputedStyle(bracketEl).columnGap`, backed by `.bracket-rounds { gap: var(--space-8); }` in `styles/knockout.css`) — no change needed there.
- `CARD_GAP = 8` (currently a hardcoded JS constant controlling vertical spacing between stacked cards) becomes `--bracket-card-gap`, read via `getComputedStyle` the same way `gapPx` already is.
- New `--bracket-champion-gap` custom property drives the Champion-box-to-Final spacing introduced in §4.
- Column `min-width` for the now-9-column layout is tuned in `styles/knockout.css`; the horizontal-scroll container (`.bracket-scroll`) is otherwise unchanged — single scroll row for all viewport sizes, per the earlier agreed responsive approach.

---

## 6. Testing

- **`getBracketSide()` / `getSidePartition()`** (new, `test/bracket-topology.test.mjs`): correctness for all 30 non-terminal match IDs, plus a **propagation-integrity test** — asserts the partition is exhaustive and disjoint with the exact known sizes (R32 8/8, R16 4/4, QF 2/2, `sf-m1`∈left, `sf-m2`∈right). This runs against the real `PROPAGATION` map, not a fixture, so a future edit that breaks the graph's symmetry fails CI immediately instead of silently shipping a lopsided wallchart.
- **`computeConnectorGeometry()`** (new): pure numeric tests — non-mirrored case reproduces today's already-verified Sprint 42 line coordinates exactly (regression safety), mirrored case produces the horizontally-flipped equivalent, plus an edge case where `fromA === fromB` (flat stub pair, zero-length spine).
- **`buildChampionBox()`** (new): placeholder before FT, correct flag/name after FT via `deriveWinnerId`.
- **Manual browser verification** (Playwright, following the Sprint 33/42 pattern): real pixel-geometry confirmation across three states — current live partial data, a synthetic fully-resolved bracket (temporary injected fixture, reverted after, same technique Sprint 42 used), and the pre-group-stage empty state (unchanged empty-state path). `jsdom` cannot verify true rendered layout end-to-end — only the extracted pure math — so this manual pass remains the source of truth for actual pixel correctness, same as it was for Sprint 42.

---

## 7. Files touched

- `js/bracket-topology.js` — `getBracketSide()`, `getSidePartition()`.
- `js/modules/knockout-bracket.js` — `buildChampionBox()`, `computeConnectorGeometry()` (both exported, module-scope, testable), generalized column builder (9 descriptors), `#positionBracket()` calling the shared per-half loop twice, `#drawConnectors()` reduced to a thin wrapper around `computeConnectorGeometry()`.
- `styles/knockout.css` — `--bracket-card-gap`, `--bracket-champion-gap`, 9-column width tuning, `.bracket-champion` styles.
- `test/bracket-topology.test.mjs` — new tests per §6.
- `test/knockout-bracket-tick.test.mjs` (or a new `test/knockout-bracket-wallchart.test.mjs`) — `computeConnectorGeometry()` and `buildChampionBox()` tests.
- `docs/ROADMAP.md` — new Sprint 44 entry; Sprint 39 marked paused.

**Explicitly unchanged:** match-card internals (flags, scores, ✓ ticks, live/FT badges, broadcaster badges), `buildBracketProjection`, the best-thirds footer link, all data files, Sprint 42's per-match confirmation-tick logic (already correct, reused as-is).

---

## 8. Rollout

Implement → `npm test` → `npm run validate` → manual Playwright pass across the three states in §6 → report back before any deploy decision (separate from this design).
