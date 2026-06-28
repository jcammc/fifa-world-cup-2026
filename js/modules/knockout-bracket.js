import { DataManager } from '../data.js';
import { formatKickoff } from '../time.js';
import { escapeHtml } from '../utils.js';
import { buildBracketProjection } from '../tournament-state.js';

export class KnockoutBracket {
  #container;
  #rounds        = [];
  #countryMap    = new Map();
  #projectionMap = new Map();

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

  // Re-fetch and update just the bracket rounds content, preserving scroll position.
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
  }

  // ─── Round column ─────────────────────────────────────────

  #buildRound(round) {
    // When every match in the round has both teams confirmed, collapse the
    // per-slot ✓ ticks into a single footer banner for a cleaner view.
    const allTeamsSet = round.matches.length > 0 &&
      round.matches.every(m => m.homeTeamId && m.awayTeamId);

    const isSingle = round.matches.length === 1;
    let matchesHtml;

    if (isSingle) {
      matchesHtml = round.matches.map(m => this.#buildMatch(m, allTeamsSet)).join('');
    } else {
      const pairs = [];
      for (let i = 0; i < round.matches.length; i += 2) {
        const a = round.matches[i];
        const b = round.matches[i + 1];
        pairs.push(b
          ? `<div class="bracket-pair">${this.#buildMatch(a, allTeamsSet)}${this.#buildMatch(b, allTeamsSet)}</div>`
          : this.#buildMatch(a, allTeamsSet));
      }
      matchesHtml = pairs.join('');
    }

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

  // Formats a concise date range from match kickoffs: "28 Jun–3 Jul", "14–15 Jul", "18 Jul"
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

  // ─── Slot label resolution ────────────────────────────────
  // knockout.json uses compact labels: "1A", "2B", "3rd C/E/F/H/I".
  // buildBracketProjection() keys: "Winner Group A", "Runner-up Group A", "best-third-r32-m7".

  #projectionKey(label, matchId) {
    if (!label) return null;
    if (/^1[A-L]$/.test(label)) return `Winner Group ${label[1]}`;
    if (/^2[A-L]$/.test(label)) return `Runner-up Group ${label[1]}`;
    if (label.startsWith('3rd')) return `best-third-${matchId}`;
    return null;
  }

  // ─── Match card ───────────────────────────────────────────

  #buildMatch(match, hideUnplayedTick = false) {
    const matchLabelHtml = match.matchLabel
      ? `<div class="bracket-match__label">${escapeHtml(match.matchLabel)}</div>`
      : '';
    const homeKey  = this.#projectionKey(match.homeLabel, match.id);
    const awayKey  = this.#projectionKey(match.awayLabel, match.id);
    const homeProj = !match.homeTeamId ? (this.#projectionMap.get(homeKey) ?? null) : null;
    const awayProj = !match.awayTeamId ? (this.#projectionMap.get(awayKey) ?? null) : null;
    const meta = this.#buildMeta(match);
    return `
      <a href="#match/${escapeHtml(match.id)}" class="bracket-match" data-match="${escapeHtml(match.id)}">
        ${matchLabelHtml}
        ${this.#buildTeamSlot(match.homeTeamId, match.homeLabel, match.homeScore, homeProj, hideUnplayedTick)}
        <div class="bracket-divider"></div>
        ${this.#buildTeamSlot(match.awayTeamId, match.awayLabel, match.awayScore, awayProj, hideUnplayedTick)}
        ${meta}
      </a>`;
  }

  #buildTeamSlot(teamId, label, score, projection = null, hideUnplayedTick = false) {
    // Confirmed — real team locked into this bracket slot
    if (teamId) {
      const country   = this.#countryMap.get(teamId);
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
        <div class="bracket-team bracket-team--confirmed">
          ${flagHtml}
          <span class="bracket-team__name">${name}</span>
          ${scoreHtml}
        </div>`;
    }

    // Projected — standings tell us who's currently in this slot
    if (projection) {
      const country   = this.#countryMap.get(projection.teamId);
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

    // Pending — no teamId and no projection (best-third slots, pre-tournament slots)
    const name = label ? escapeHtml(label) : 'TBD';
    return `
      <div class="bracket-team bracket-team--pending">
        <span class="bracket-team__flag-placeholder" aria-hidden="true"></span>
        <span class="bracket-team__name">${name}</span>
        <span class="bracket-team__score bracket-team__score--empty">–</span>
      </div>`;
  }

  #buildMeta(match) {
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
  }

  teardown() {}
}
