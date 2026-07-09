import { DataManager } from '../data.js';
import { formatKickoff } from '../time.js';
import { escapeHtml } from '../utils.js';
import { buildBracketProjection } from '../tournament-state.js';
import { getFeederMatchIds, getSidePartition, deriveWinnerId, bracketSortKey } from '../bracket-topology.js';

// ─── Pure match-card builders ────────────────────────────────
//
// Extracted to module scope (rather than private class methods) so
// Sprint 37's regression tests can exercise the per-match confirmation
// tick logic directly, without instantiating the class or mocking
// DataManager. No behavior change from the extraction itself — these
// take countryMap/projectionMap as parameters instead of reading
// instance fields.

export function projectionKey(label, matchId) {
  if (!label) return null;
  if (/^1[A-L]$/.test(label)) return `Winner Group ${label[1]}`;
  if (/^2[A-L]$/.test(label)) return `Runner-up Group ${label[1]}`;
  if (label.startsWith('3rd')) return `best-third-${matchId}`;
  return null;
}

export function buildMeta(match) {
  if (match.status === 'FT') {
    return `<div class="bracket-match__meta"><span class="badge badge--ft">FT</span></div>`;
  }
  if (match.status === 'live') {
    return `<div class="bracket-match__meta"><span class="badge badge--live"><span class="live-dot live-dot--sm" aria-hidden="true"></span> LIVE</span></div>`;
  }
  if (match.kickoff) {
    return `<div class="bracket-match__meta">${escapeHtml(formatKickoff(match.kickoff))}</div>`;
  }
  return '';
}

export function buildTeamSlot(teamId, label, score, projection = null, hideUnplayedTick = false, countryMap = new Map()) {
  if (teamId) {
    const country   = countryMap.get(teamId);
    const name      = country ? escapeHtml(country.name) : escapeHtml(teamId);
    const flagHtml  = `<img src="assets/flags/${escapeHtml(teamId)}.svg" alt=""
            width="20" height="14" class="bracket-team__flag" aria-hidden="true"
            onerror="this.style.display='none'">`;
    const hasScore  = score !== null && score !== undefined;
    const scoreHtml = hasScore
      ? `<span class="bracket-team__score">${score}</span>`
      : hideUnplayedTick
        ? ''
        : `<span class="bracket-team__score bracket-team__score--confirmed">&#10003;</span>`;
    return `
      <div class="bracket-team ${hideUnplayedTick ? '' : 'bracket-team--confirmed'}">
        ${flagHtml}
        <span class="bracket-team__name">${name}</span>
        ${scoreHtml}
      </div>`;
  }

  if (projection) {
    const country   = countryMap.get(projection.teamId);
    const name      = country ? escapeHtml(country.name) : escapeHtml(projection.teamId);
    const flagHtml  = `<img src="assets/flags/${escapeHtml(projection.teamId)}.svg" alt=""
            width="20" height="14" class="bracket-team__flag" aria-hidden="true"
            onerror="this.style.display='none'">`;
    const c         = projection.confidence;
    const confCls   = c === 'confirmed' ? 'bracket-conf--confirmed'
                    : c === 'likely'    ? 'bracket-conf--likely'
                    : 'bracket-conf--open';
    const confLabel = c === 'confirmed' ? 'Confirmed' : c === 'likely' ? 'Likely' : 'Open';
    return `
      <div class="bracket-team bracket-team--projected">
        ${flagHtml}
        <span class="bracket-team__name">${name}</span>
        <span class="bracket-conf ${confCls}">${confLabel}</span>
      </div>`;
  }

  const name = label ? escapeHtml(label) : 'TBD';
  return `
    <div class="bracket-team bracket-team--pending">
      <span class="bracket-team__flag-placeholder" aria-hidden="true"></span>
      <span class="bracket-team__name">${name}</span>
      <span class="bracket-team__score bracket-team__score--empty">–</span>
    </div>`;
}

export function buildMatch(match, projectionMap = new Map(), countryMap = new Map()) {
  // Per-match, not per-round: a team's "confirmed" tick disappears as
  // soon as ITS OWN match has both sides known, independent of whether
  // sibling matches in the same round are still TBD.
  const matchFullySet = Boolean(match.homeTeamId && match.awayTeamId);
  const matchLabelHtml = match.matchLabel
    ? `<div class="bracket-match__label">${escapeHtml(match.matchLabel)}</div>`
    : '';
  const homeKey  = projectionKey(match.homeLabel, match.id);
  const awayKey  = projectionKey(match.awayLabel, match.id);
  const homeProj = !match.homeTeamId ? (projectionMap.get(homeKey) ?? null) : null;
  const awayProj = !match.awayTeamId ? (projectionMap.get(awayKey) ?? null) : null;
  const meta = buildMeta(match);
  return `
    <a href="#match/${escapeHtml(match.id)}" class="bracket-match" data-match="${escapeHtml(match.id)}">
      ${matchLabelHtml}
      ${buildTeamSlot(match.homeTeamId, match.homeLabel, match.homeScore, homeProj, matchFullySet, countryMap)}
      <div class="bracket-divider"></div>
      ${buildTeamSlot(match.awayTeamId, match.awayLabel, match.awayScore, awayProj, matchFullySet, countryMap)}
      ${meta}
    </a>`;
}

// ─── Wallchart column builder (Sprint 44) ──────────────────────
//
// A "column" is one of the 9 slots in the mirrored layout:
// R32-L, R16-L, QF-L, SF-L, CENTER (Final/3rd Place), SF-R, QF-R, R16-R, R32-R.
// Every column — including the center one — goes through this same
// builder; the center column's only difference is `extraHtml` (the
// Champion box, prepended inside .bracket-round__matches as ordinary
// column content, not a separate render path) and matches being
// [final-m1, 3rd-place] instead of a filtered side of a round.

export function roundDateRange(matches) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const kickoffs = matches.map(m => m.kickoff).filter(Boolean).sort();
  if (!kickoffs.length) return '';

  // Kickoff strings are either date-only ("2026-07-10") or full ISO
  // timestamps ("2026-06-28T19:00:00Z") — strip any time component
  // before splitting so the day doesn't parse as NaN.
  const parse = s => { const [, m, d] = s.split('T')[0].split('-').map(Number); return { m, d }; };
  const first = parse(kickoffs[0]);
  const last  = parse(kickoffs[kickoffs.length - 1]);

  if (first.m === last.m && first.d === last.d) return `${first.d} ${MONTHS[first.m - 1]}`;
  if (first.m === last.m)  return `${first.d}–${last.d} ${MONTHS[first.m - 1]}`;
  return `${first.d} ${MONTHS[first.m - 1]}–${last.d} ${MONTHS[last.m - 1]}`;
}

export function buildColumn(descriptor, projectionMap = new Map(), countryMap = new Map()) {
  const { id, label, matches, mirrored = false, extraHtml = '' } = descriptor;

  const allTeamsSet = matches.length > 0 && matches.every(m => m.homeTeamId && m.awayTeamId);
  const matchesHtml = matches.map(m => buildMatch(m, projectionMap, countryMap)).join('');
  const dateRange = roundDateRange(matches);
  const confirmedBanner = allTeamsSet
    ? `<p class="bracket-round__confirmed">&#10003; All ${escapeHtml(label)} teams confirmed</p>`
    : '';

  return `
    <div class="bracket-round${mirrored ? ' bracket-round--mirrored' : ''}" data-round="${escapeHtml(id)}">
      <div class="bracket-round__header">
        <span class="bracket-round__label">${escapeHtml(label)}</span>
        ${dateRange ? `<span class="bracket-round__dates">${escapeHtml(dateRange)}</span>` : ''}
      </div>
      <div class="bracket-round__matches">${extraHtml}${matchesHtml}</div>
      ${confirmedBanner}
    </div>`;
}

// ─── Champion box (Sprint 44) ───────────────────────────────────
//
// Deliberately minimal: before the Final is FT, a trophy + "CHAMPION"
// placeholder. After, relies SOLELY on the existing deriveWinnerId() —
// no separate winner-derivation logic lives here.

export function buildChampionBox(finalMatch, countryMap = new Map()) {
  const winnerId = finalMatch ? deriveWinnerId(finalMatch) : null;

  if (winnerId) {
    const country  = countryMap.get(winnerId);
    const name     = country ? escapeHtml(country.name) : escapeHtml(winnerId);
    const flagHtml = `<img src="assets/flags/${escapeHtml(winnerId)}.svg" alt=""
            width="28" height="20" class="bracket-champion__flag" aria-hidden="true"
            onerror="this.style.display='none'">`;
    return `
      <div class="bracket-champion bracket-champion--resolved" data-champion="${escapeHtml(winnerId)}">
        <span class="bracket-champion__icon" aria-hidden="true">&#127942;</span>
        ${flagHtml}
        <span class="bracket-champion__name">${name}</span>
      </div>`;
  }

  return `
    <div class="bracket-champion" data-champion="">
      <span class="bracket-champion__icon" aria-hidden="true">&#127942;</span>
      <span class="bracket-champion__name bracket-champion__name--tbd">CHAMPION</span>
    </div>`;
}

// ─── Connector geometry (Sprint 44) ─────────────────────────────
//
// Pure, zero-DOM-dependency math — directly unit-testable. Returns 4
// line segments (2 feeder stubs, 1 vertical spine, 1 outgoing stub to
// the child card) as [x1,y1,x2,y2] tuples, in the local coordinate
// space of a single inter-column gap (0..gapPx).
//
// mirrored=false (left half, L->R flow): feeders sit at x=0 (the
// right edge of the feeding column), the child sits at x=gapPx (the
// left edge of the next column) — this reproduces Sprint 42's
// already-verified coordinates exactly.
// mirrored=true (right half, R->L flow): the same shape, horizontally
// flipped — feeders at x=gapPx, child at x=0. One implementation,
// parameterized, not two maintained in parallel.

export function computeConnectorGeometry({ fromA, fromB, toY, gapPx, mirrored = false }) {
  const midX    = gapPx / 2;
  const feederX = mirrored ? gapPx : 0;
  const childX  = mirrored ? 0 : gapPx;
  return [
    [feederX, fromA, midX, fromA],
    [feederX, fromB, midX, fromB],
    [midX,    fromA, midX, fromB],
    [midX,    toY,   childX, toY],
  ];
}

export class KnockoutBracket {
  #container;
  #rounds         = [];
  #countryMap     = new Map();
  #projectionMap  = new Map();
  #resizeObserver = null;

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    const [rounds, countries, standings, annexC] = await Promise.all([
      DataManager.loadKnockout(),
      DataManager.loadCountries(),
      DataManager.loadStandings(),
      DataManager.loadAnnexC(),
    ]);
    this.#rounds        = rounds;
    this.#countryMap    = new Map(countries.map(c => [c.id, c]));
    this.#projectionMap = buildBracketProjection(standings, annexC ?? { combinations: {} });

    if (!this.#rounds.length) {
      this.#container.innerHTML = `
        <div class="empty-state empty-state--compact">
          <div class="empty-state__icon">&#127942;</div>
          <p class="empty-state__title">Knockout Stage</p>
          <p class="empty-state__message">Bracket will appear once group stage is complete.</p>
        </div>`;
      return;
    }

    const roundsHtml = this.#buildColumns()
      .map(col => buildColumn(col, this.#projectionMap, this.#countryMap))
      .join('');
    this.#container.innerHTML = `
      <div class="knockout-bracket">
        <div class="bracket-scroll">
          <div class="bracket-rounds">${roundsHtml}</div>
        </div>
        <div class="bracket-footer">
          <a href="#best-thirds" class="bracket-footer__link">
            Best third-place teams &#8594;
          </a>
        </div>
      </div>`;
  }

  async update() {
    const scrollEl = this.#container.querySelector('.bracket-scroll');
    const roundsEl = this.#container.querySelector('.bracket-rounds');
    if (!roundsEl) { await this.render(); this.init(); return; }

    const savedX = scrollEl?.scrollLeft ?? 0;
    const [rounds, standings, annexC] = await Promise.all([
      DataManager.loadKnockout(),
      DataManager.loadStandings(),
      DataManager.loadAnnexC(),
    ]);
    this.#rounds        = rounds;
    this.#projectionMap = buildBracketProjection(standings, annexC ?? { combinations: {} });

    roundsEl.innerHTML = this.#buildColumns()
      .map(col => buildColumn(col, this.#projectionMap, this.#countryMap))
      .join('');
    if (scrollEl) scrollEl.scrollLeft = savedX;
    requestAnimationFrame(() => this.#positionBracket());
  }

  // ─── Wallchart column descriptors ─────────────────────────
  //
  // Splits the 4 non-terminal rounds into left/right halves via
  // getSidePartition() (fully derived from PROPAGATION, no hardcoded
  // match-ID lists) and returns the 9 column descriptors in DOM order:
  // R32-L, R16-L, QF-L, SF-L, CENTER, SF-R, QF-R, R16-R, R32-R.

  #buildColumns() {
    const { left, right } = getSidePartition(this.#rounds);
    const leftSet  = new Set(left);
    const rightSet = new Set(right);
    const byRoundId = new Map(this.#rounds.map(r => [r.id, r]));

    const sideMatches = (roundId, sideSet) =>
      (byRoundId.get(roundId)?.matches ?? [])
        .filter(m => sideSet.has(m.id))
        .sort((a, b) => bracketSortKey(a.id) - bracketSortKey(b.id));

    const ROUND_ORDER = ['r32', 'r16', 'qf', 'sf'];
    const columns = [];

    for (const roundId of ROUND_ORDER) {
      columns.push({
        id: `${roundId}-l`,
        label: byRoundId.get(roundId)?.label ?? roundId,
        matches: sideMatches(roundId, leftSet),
        mirrored: false,
      });
    }

    const finalRound = byRoundId.get('final');
    const finalMatch = finalRound?.matches.find(m => m.id === 'final-m1') ?? null;
    columns.push({
      id: 'final',
      label: finalRound?.label ?? 'Final',
      // Copy before sorting — finalRound.matches is the live shared data
      // array and must not be mutated in place across re-renders.
      matches: [...(finalRound?.matches ?? [])].sort((a, b) => bracketSortKey(a.id) - bracketSortKey(b.id)),
      mirrored: false,
      extraHtml: buildChampionBox(finalMatch, this.#countryMap),
    });

    for (const roundId of [...ROUND_ORDER].reverse()) {
      columns.push({
        id: `${roundId}-r`,
        label: byRoundId.get(roundId)?.label ?? roundId,
        matches: sideMatches(roundId, rightSet),
        mirrored: true,
      });
    }

    return columns;
  }

  // ─── Lifecycle ────────────────────────────────────────────

  init() {
    const scroll = this.#container.querySelector('.bracket-scroll');
    if (!scroll) return;

    scroll.addEventListener('wheel', e => {
      if (e.deltaY !== 0 && e.deltaX === 0 && scroll.scrollWidth > scroll.clientWidth) {
        e.preventDefault();
        scroll.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    requestAnimationFrame(() => this.#positionBracket());

    this.#resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.#positionBracket());
    });
    this.#resizeObserver.observe(scroll);
  }

  teardown() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  // ─── Spacing (CSS-variable-driven, Sprint 44) ──────────────

  #cardGapPx() {
    const v = parseFloat(getComputedStyle(this.#container).getPropertyValue('--bracket-card-gap'));
    return Number.isFinite(v) ? v : 8;
  }

  #championGapPx() {
    const v = parseFloat(getComputedStyle(this.#container).getPropertyValue('--bracket-champion-gap'));
    return Number.isFinite(v) ? v : 12;
  }

  // ─── Algorithmic bracket positioning (Sprint 44 — wallchart) ──
  //
  // Each half (left: R32-L..SF-L, right: R32-R..SF-R) is positioned by
  // the SAME per-half algorithm (#computeHalfCenters), called twice —
  // not two parallel implementations. The center column (Final/3rd
  // Place/Champion) is positioned from the combined SF centers of both
  // halves, extending the same feeder-midpoint approach Sprint 42
  // already established.

  #positionBracket() {
    const bracketEl = this.#container.querySelector('.bracket-rounds');
    if (!bracketEl) return;

    const allRoundEls = Array.from(bracketEl.querySelectorAll(':scope > .bracket-round'));
    if (allRoundEls.length !== 9) return; // expects the full wallchart shape

    const [r32l, r16l, qfl, sfl, center, sfr, qfr, r16r, r32r] = allRoundEls;

    // Right half processed in DATA-flow order (leaf R32-R -> root SF-R),
    // even though its DOM order is reversed (SF-R sits next to center,
    // R32-R sits at the far edge) — #computeHalfCenters doesn't care
    // which physical side it's rendering, only feeder relationships.
    const leftResult  = this.#computeHalfCenters([r32l, r16l, qfl, sfl]);
    const rightResult = this.#computeHalfCenters([r32r, r16r, qfr, sfr]);

    if (!leftResult.totalH || !rightResult.totalH) return;

    const totalH = Math.max(leftResult.totalH, rightResult.totalH);
    for (const el of allRoundEls) {
      const matchesEl = el.querySelector('.bracket-round__matches');
      if (matchesEl) matchesEl.style.height = totalH + 'px';
    }

    const leftSfMap  = leftResult.centerMapPerRound.at(-1)  ?? new Map();
    const rightSfMap = rightResult.centerMapPerRound.at(-1) ?? new Map();
    const combinedSfMap = new Map([...leftSfMap, ...rightSfMap]);

    const { finalCard, finalY } = this.#positionCenterColumn(center, combinedSfMap, totalH);

    const color = getComputedStyle(this.#container).getPropertyValue('--color-border').trim() || '#444';
    const gapPx = parseFloat(getComputedStyle(bracketEl).columnGap) || 32;

    // Left half: internal connectors, then SF-L -> Final (winning path only;
    // 3rd Place has no bracket connector, per Sprint 42's original decision).
    const leftEls = [r32l, r16l, qfl, sfl];
    for (let r = 0; r < leftEls.length - 1; r++) {
      this.#drawConnectors(
        leftEls[r].querySelector('.bracket-round__matches'),
        leftResult.centerMapPerRound[r],
        Array.from(leftEls[r + 1].querySelectorAll('.bracket-match')),
        leftResult.centerMapPerRound[r + 1],
        totalH, gapPx, color, false,
      );
    }
    if (finalCard) {
      this.#drawConnectors(
        sfl.querySelector('.bracket-round__matches'),
        leftResult.centerMapPerRound.at(-1),
        [finalCard],
        new Map([[finalCard.dataset.match, finalY]]),
        totalH, gapPx, color, false,
      );
    }

    // Right half: same shape, mirrored — internal connectors run in
    // DATA order (R32-R -> ... -> SF-R), then SF-R -> Final.
    const rightEls = [r32r, r16r, qfr, sfr];
    for (let r = 0; r < rightEls.length - 1; r++) {
      this.#drawConnectors(
        rightEls[r].querySelector('.bracket-round__matches'),
        rightResult.centerMapPerRound[r],
        Array.from(rightEls[r + 1].querySelectorAll('.bracket-match')),
        rightResult.centerMapPerRound[r + 1],
        totalH, gapPx, color, true,
      );
    }
    if (finalCard) {
      this.#drawConnectors(
        sfr.querySelector('.bracket-round__matches'),
        rightResult.centerMapPerRound.at(-1),
        [finalCard],
        new Map([[finalCard.dataset.match, finalY]]),
        totalH, gapPx, color, true,
      );
    }
  }

  // One half (4 rounds: leaf -> root, in data-flow order) — identical
  // algorithm for the left half (already in DOM order) and the right
  // half (called with its rounds reversed into data-flow order). Each
  // later-round card sits at the mean of its true feeders' centers,
  // looked up by match ID via getFeederMatchIds — never by array index.
  #computeHalfCenters(roundElsInDataOrder) {
    const roundData = roundElsInDataOrder.map(el => ({
      el,
      matchesEl: el.querySelector('.bracket-round__matches'),
      cards:     Array.from(el.querySelectorAll('.bracket-match')),
    }));

    if (!roundData.length || !roundData[0].cards.length) return { totalH: 0, centerMapPerRound: [] };

    const cardH = roundData[0].cards[0].getBoundingClientRect().height;
    if (!cardH) return { totalH: 0, centerMapPerRound: [] };

    const cardGap = this.#cardGapPx();
    const slotH   = cardH + cardGap;
    const firstN  = roundData[0].cards.length;
    const totalH  = firstN * slotH - cardGap;

    const centerMapPerRound = [];

    for (let r = 0; r < roundData.length; r++) {
      const { matchesEl, cards } = roundData[r];
      let centers;

      if (r === 0) {
        centers = cards.map((_, i) => i * slotH + cardH / 2);
      } else {
        const prevMap = centerMapPerRound[r - 1];
        centers = cards.map(card => {
          const feederIds = getFeederMatchIds(card.dataset.match);
          const feederYs  = feederIds.map(id => prevMap.get(id)).filter(y => y != null);
          return feederYs.length
            ? feederYs.reduce((a, b) => a + b, 0) / feederYs.length
            : totalH / 2;
        });
      }

      centerMapPerRound.push(new Map(cards.map((c, i) => [c.dataset.match, centers[i]])));
      matchesEl.style.height = totalH + 'px';

      cards.forEach((card, i) => {
        const h = card.getBoundingClientRect().height || cardH;
        card.style.position = 'absolute';
        card.style.top      = Math.round(centers[i] - h / 2) + 'px';
        card.style.left     = '0';
        card.style.right    = '0';
      });
    }

    return { totalH, centerMapPerRound };
  }

  // Center column: Final + 3rd Place + Champion box — all three are
  // simply the contents of this one column, positioned from the
  // combined left/right SF centers. Returns the Final card + its Y so
  // #positionBracket can draw the two incoming SF->Final connectors.
  #positionCenterColumn(center, combinedSfMap, totalH) {
    const centerCards = Array.from(center.querySelectorAll('.bracket-match'));
    const championEl  = center.querySelector('.bracket-champion');
    if (!centerCards.length) return { finalCard: null, finalY: null };

    const fi        = centerCards.findIndex(c => c.dataset.match?.startsWith('final'));
    const finalCard = fi >= 0 ? centerCards[fi] : centerCards[0];
    const thirdCard = centerCards.find(c => c !== finalCard) ?? null;

    const feederIds = getFeederMatchIds(finalCard.dataset.match);
    const feederYs  = feederIds.map(id => combinedSfMap.get(id)).filter(y => y != null);
    const finalY = feederYs.length
      ? feederYs.reduce((a, b) => a + b, 0) / feederYs.length
      : totalH / 2;

    const finalH   = finalCard.getBoundingClientRect().height || 0;
    const finalTop = finalY - finalH / 2;
    finalCard.style.position = 'absolute';
    finalCard.style.top      = Math.round(finalTop) + 'px';
    finalCard.style.left     = '0';
    finalCard.style.right    = '0';

    if (championEl) {
      const champH   = championEl.getBoundingClientRect().height || 0;
      const champGap = this.#championGapPx();
      championEl.style.position = 'absolute';
      championEl.style.top      = Math.round(finalTop - champGap - champH) + 'px';
      championEl.style.left     = '0';
      championEl.style.right    = '0';
    }

    if (thirdCard) {
      const cardGap = this.#cardGapPx();
      thirdCard.style.position = 'absolute';
      thirdCard.style.top      = Math.round(finalTop + finalH + cardGap) + 'px';
      thirdCard.style.left     = '0';
      thirdCard.style.right    = '0';
    }

    return { finalCard, finalY };
  }

  // Draws one SVG element per round, attached to that round's
  // .bracket-round__matches, spanning the gap toward the next round —
  // left:100% for the normal L->R flow (left half), right:100% for the
  // mirrored R->L flow (right half). The stub/spine coordinates
  // themselves come from computeConnectorGeometry() — one pure
  // implementation shared by both directions.
  #drawConnectors(matchesEl, fromCenterMap, toCards, toCenterMap, totalH, gapPx, color, mirrored) {
    matchesEl.querySelectorAll('.bracket-svg-connector').forEach(s => s.remove());

    const ns  = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('bracket-svg-connector');
    svg.setAttribute('width',   String(gapPx));
    svg.setAttribute('height',  String(totalH));
    svg.setAttribute('viewBox', `0 0 ${gapPx} ${totalH}`);
    svg.style.cssText = mirrored
      ? 'position:absolute;right:100%;top:0;pointer-events:none;overflow:visible'
      : 'position:absolute;left:100%;top:0;pointer-events:none;overflow:visible';

    for (const toCard of toCards) {
      const toY = toCenterMap.get(toCard.dataset.match);
      const feederIds = getFeederMatchIds(toCard.dataset.match);
      const fromA = fromCenterMap.get(feederIds[0]);
      const fromB = fromCenterMap.get(feederIds[1]);
      if (toY == null || fromA == null || fromB == null) continue;

      for (const [x1, y1, x2, y2] of computeConnectorGeometry({ fromA, fromB, toY, gapPx, mirrored })) {
        const el = document.createElementNS(ns, 'line');
        el.setAttribute('x1', String(x1)); el.setAttribute('y1', String(y1));
        el.setAttribute('x2', String(x2)); el.setAttribute('y2', String(y2));
        el.setAttribute('stroke', color);
        el.setAttribute('stroke-width', '1.5');
        svg.appendChild(el);
      }
    }

    matchesEl.appendChild(svg);
  }
}
