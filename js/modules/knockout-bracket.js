import { DataManager } from '../data.js';
import { formatKickoff } from '../time.js';
import { escapeHtml } from '../utils.js';
import { buildBracketProjection } from '../tournament-state.js';
import { getFeederMatchIds } from '../bracket-topology.js';

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

    const roundsHtml = this.#rounds.map(r => this.#buildRound(r)).join('');
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

    roundsEl.innerHTML = this.#rounds.map(r => this.#buildRound(r)).join('');
    if (scrollEl) scrollEl.scrollLeft = savedX;
    requestAnimationFrame(() => this.#positionBracket());
  }

  // ─── Round column ─────────────────────────────────────────

  #buildRound(round) {
    // Round-level "every match confirmed" banner — a standalone milestone
    // indicator, deliberately decoupled from the per-match tick decision
    // in #buildMatch(). A round fills in match-by-match over real days
    // (R32 is the exception, roughly gated by group-stage completion);
    // gating individual ticks on the WHOLE round being done meant a single
    // still-open sibling match kept the tick showing on every other match
    // in that round, including ones resolved days earlier.
    const allTeamsSet = round.matches.length > 0 &&
      round.matches.every(m => m.homeTeamId && m.awayTeamId);

    const matchesHtml = round.matches
      .map(m => buildMatch(m, this.#projectionMap, this.#countryMap))
      .join('');

    const dateRange = this.#roundDateRange(round.matches);
    const confirmedBanner = allTeamsSet
      ? `<p class="bracket-round__confirmed">&#10003; All ${escapeHtml(round.label)} teams confirmed</p>`
      : '';

    return `
      <div class="bracket-round" data-round="${escapeHtml(round.id)}">
        <div class="bracket-round__header">
          <span class="bracket-round__label">${escapeHtml(round.label)}</span>
          ${dateRange ? `<span class="bracket-round__dates">${escapeHtml(dateRange)}</span>` : ''}
        </div>
        <div class="bracket-round__matches">${matchesHtml}</div>
        ${confirmedBanner}
      </div>`;
  }

  #roundDateRange(matches) {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const kickoffs = matches.map(m => m.kickoff).filter(Boolean).sort();
    if (!kickoffs.length) return '';

    const parse = s => { const [, m, d] = s.split('-').map(Number); return { m, d }; };
    const first = parse(kickoffs[0]);
    const last  = parse(kickoffs[kickoffs.length - 1]);

    if (first.m === last.m && first.d === last.d) return `${first.d} ${MONTHS[first.m - 1]}`;
    if (first.m === last.m)  return `${first.d}–${last.d} ${MONTHS[first.m - 1]}`;
    return `${first.d} ${MONTHS[first.m - 1]}–${last.d} ${MONTHS[last.m - 1]}`;
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

  // ─── Algorithmic bracket positioning ──────────────────────
  //
  // Each later-round card is positioned at the exact vertical midpoint
  // of the two cards that feed into it, derived by traversing the
  // tournament tree from R32 outward. Connector lines are drawn as SVG
  // elements spanning each inter-round gap.

  #positionBracket() {
    const bracketEl = this.#container.querySelector('.bracket-rounds');
    if (!bracketEl) return;

    const roundEls = Array.from(bracketEl.querySelectorAll(':scope > .bracket-round'));
    if (!roundEls.length) return;

    const gapPx = parseFloat(getComputedStyle(bracketEl).columnGap) || 32;

    const roundData = roundEls.map(el => ({
      el,
      matchesEl: el.querySelector('.bracket-round__matches'),
      cards:     Array.from(el.querySelectorAll('.bracket-match')),
    }));

    if (!roundData[0].cards.length) return;

    // All cards have the same height — measure from the first R32 card.
    const cardH = roundData[0].cards[0].getBoundingClientRect().height;
    if (!cardH) return;

    // One "slot" = card + gap below it. Total bracket height = N slots minus the
    // trailing gap of the last slot.
    const CARD_GAP = 8;
    const slotH    = cardH + CARD_GAP;
    const firstN   = roundData[0].cards.length;
    const totalH   = firstN * slotH - CARD_GAP;

    const centersPerRound = [];
    // Parallel to centersPerRound: matchId -> center, so later rounds (and
    // connector drawing) can look up a feeder's position by its actual
    // match ID instead of assuming it sits at a specific array index.
    const centerMapPerRound = [];

    for (let r = 0; r < roundData.length; r++) {
      const { matchesEl, cards } = roundData[r];
      let centers;

      if (r === 0) {
        // First round: evenly spaced from the top.
        centers = cards.map((_, i) => i * slotH + cardH / 2);
      } else {
        const prevMap = centerMapPerRound[r - 1];

        // Final column (round.id "final") has 2 entries: 3rd-place and
        // final-m1. Both share the same two SF feeders (topology-derived,
        // not assumed by position) but render at different vertical spots:
        // the Final sits at the SF midpoint, and 3rd Place is derived from
        // the Final card's actual rendered height so there is exactly
        // CARD_GAP between them.
        const isFinalRound = r === roundData.length - 1 && cards.length === 2;

        if (isFinalRound) {
          const fi = cards.findIndex(c => c.dataset.match?.startsWith('final'));
          const validFi = fi >= 0 ? fi : 1;
          const validTi = 1 - validFi;
          const feederIds = getFeederMatchIds(cards[validFi].dataset.match);
          const feederYs = feederIds.map(id => prevMap.get(id)).filter(y => y != null);
          const sfMid = feederYs.length
            ? feederYs.reduce((a, b) => a + b, 0) / feederYs.length
            : totalH / 2;
          const finalH = cards[validFi].getBoundingClientRect().height || cardH;
          const thirdH = cards[validTi].getBoundingClientRect().height || cardH;
          centers = new Array(2);
          centers[validFi] = sfMid;
          centers[validTi] = sfMid + finalH / 2 + CARD_GAP + thirdH / 2;
        } else {
          // Each card sits at the average of its TRUE feeder cards'
          // centers, looked up by match ID via the propagation topology —
          // not by assuming round r's card i is fed by round r-1's cards
          // 2i/2i+1 (that assumption doesn't hold for this bracket's
          // non-sequential R32 pairings; see js/bracket-topology.js).
          centers = cards.map(card => {
            const feederIds = getFeederMatchIds(card.dataset.match);
            const feederYs = feederIds.map(id => prevMap.get(id)).filter(y => y != null);
            return feederYs.length
              ? feederYs.reduce((a, b) => a + b, 0) / feederYs.length
              : totalH / 2;
          });
        }
      }

      centersPerRound.push(centers);
      centerMapPerRound.push(new Map(cards.map((c, i) => [c.dataset.match, centers[i]])));

      // All columns share the same total height so connectors align correctly.
      matchesEl.style.height = totalH + 'px';

      // Use each card's actual rendered height so the computed center Y maps to
      // the visual centre of the card regardless of whether a matchLabel is present.
      cards.forEach((card, i) => {
        const h = card.getBoundingClientRect().height || cardH;
        card.style.position = 'absolute';
        card.style.top      = Math.round(centers[i] - h / 2) + 'px';
        card.style.left     = '0';
        card.style.right    = '0';
      });
    }

    const color = getComputedStyle(this.#container)
      .getPropertyValue('--color-border').trim() || '#444';

    for (let r = 0; r < roundData.length - 1; r++) {
      const isFinalTransition = r === roundData.length - 2;

      if (isFinalTransition) {
        // SF → Final column: only draw the winning path (SF → Final match).
        // The 3rd-place match has no bracket connector — it is positioned below
        // the Final as a losers' branch and labelled accordingly.
        const toCards = roundData[r + 1].cards;
        const fi = toCards.findIndex(c => c.dataset.match?.startsWith('final'));
        if (fi >= 0) {
          this.#drawConnectors(
            roundData[r].matchesEl,
            centerMapPerRound[r],
            [toCards[fi]],
            centerMapPerRound[r + 1],
            totalH, gapPx, color
          );
        }
      } else {
        this.#drawConnectors(
          roundData[r].matchesEl,
          centerMapPerRound[r],
          roundData[r + 1].cards,
          centerMapPerRound[r + 1],
          totalH, gapPx, color
        );
      }
    }
  }

  // Draws one SVG element per round, attached to that round's .bracket-round__matches
  // and positioned at left: 100% (spanning the gap to the next column).
  // Lines: right stub from feeder A → midpoint → right stub from feeder B → vertical
  // spine → outgoing stub to the child card in the next round.
  //
  // `fromCenterMap` is the PREVIOUS round's matchId -> center map (used to look
  // up each toCard's true feeders via the propagation topology, not array
  // position); `toCenterMap` is the DESTINATION round's own matchId -> center
  // map (where each toCard actually sits).
  #drawConnectors(matchesEl, fromCenterMap, toCards, toCenterMap, totalH, gapPx, color) {
    matchesEl.querySelectorAll('.bracket-svg-connector').forEach(s => s.remove());

    const ns  = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('bracket-svg-connector');
    svg.setAttribute('width',   String(gapPx));
    svg.setAttribute('height',  String(totalH));
    svg.setAttribute('viewBox', `0 0 ${gapPx} ${totalH}`);
    svg.style.cssText =
      'position:absolute;left:100%;top:0;pointer-events:none;overflow:visible';

    const midX = gapPx / 2;

    const addLine = (x1, y1, x2, y2) => {
      const el = document.createElementNS(ns, 'line');
      el.setAttribute('x1', String(x1)); el.setAttribute('y1', String(y1));
      el.setAttribute('x2', String(x2)); el.setAttribute('y2', String(y2));
      el.setAttribute('stroke', color);
      el.setAttribute('stroke-width', '1.5');
      svg.appendChild(el);
    };

    for (const toCard of toCards) {
      const toY = toCenterMap.get(toCard.dataset.match);
      const feederIds = getFeederMatchIds(toCard.dataset.match);
      const fromA = fromCenterMap.get(feederIds[0]);
      const fromB = fromCenterMap.get(feederIds[1]);
      if (toY == null || fromA == null || fromB == null) continue;

      addLine(0,    fromA, midX,  fromA); // right stub from feeder A
      addLine(0,    fromB, midX,  fromB); // right stub from feeder B
      addLine(midX, fromA, midX,  fromB); // vertical spine
      addLine(midX, toY,   gapPx, toY);  // outgoing stub to child
    }

    matchesEl.appendChild(svg);
  }
}
