import { DataManager } from '../data.js';
import { formatKickoff } from '../time.js';
import { escapeHtml } from '../utils.js';

export class KnockoutBracket {
  #container;
  #rounds     = [];
  #countryMap = new Map();

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    const [rounds, countries] = await Promise.all([
      DataManager.loadKnockout(),
      DataManager.loadCountries(),
    ]);
    this.#rounds     = rounds;
    this.#countryMap = new Map(countries.map(c => [c.id, c]));

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
      </div>`;
  }

  // ─── Round column ─────────────────────────────────────────

  #buildRound(round) {
    // Wrap pairs of matches so CSS connector lines can link them visually.
    // Single-match rounds (Final) skip pairing.
    const isSingle = round.matches.length === 1;
    let matchesHtml;

    if (isSingle) {
      matchesHtml = round.matches.map(m => this.#buildMatch(m)).join('');
    } else {
      const pairs = [];
      for (let i = 0; i < round.matches.length; i += 2) {
        const a = round.matches[i];
        const b = round.matches[i + 1];
        pairs.push(b
          ? `<div class="bracket-pair">${this.#buildMatch(a)}${this.#buildMatch(b)}</div>`
          : this.#buildMatch(a));
      }
      matchesHtml = pairs.join('');
    }

    return `
      <div class="bracket-round" data-round="${escapeHtml(round.id)}">
        <div class="bracket-round__header">${escapeHtml(round.label)}</div>
        <div class="bracket-round__matches">${matchesHtml}</div>
      </div>`;
  }

  // ─── Match card ───────────────────────────────────────────

  #buildMatch(match) {
    const matchLabelHtml = match.matchLabel
      ? `<div class="bracket-match__label">${escapeHtml(match.matchLabel)}</div>`
      : '';
    const meta = this.#buildMeta(match);
    return `
      <div class="bracket-match" data-match="${escapeHtml(match.id)}">
        ${matchLabelHtml}
        ${this.#buildTeamSlot(match.homeTeamId, match.homeLabel, match.homeScore)}
        <div class="bracket-divider"></div>
        ${this.#buildTeamSlot(match.awayTeamId, match.awayLabel, match.awayScore)}
        ${meta}
      </div>`;
  }

  #buildTeamSlot(teamId, label, score) {
    const country   = teamId ? this.#countryMap.get(teamId) : null;
    const name      = country
      ? escapeHtml(country.name)
      : (label ? escapeHtml(label) : 'TBD');
    const isPending = !country;

    const flagHtml = country
      ? `<img src="assets/flags/${escapeHtml(teamId)}.svg" alt=""
              width="20" height="14" class="bracket-team__flag" aria-hidden="true"
              onerror="this.style.display='none'">`
      : `<span class="bracket-team__flag-placeholder" aria-hidden="true"></span>`;

    const scoreHtml = score !== null && score !== undefined
      ? `<span class="bracket-team__score">${score}</span>`
      : `<span class="bracket-team__score bracket-team__score--empty">–</span>`;

    return `
      <div class="bracket-team${isPending ? ' bracket-team--pending' : ''}">
        ${flagHtml}
        <span class="bracket-team__name">${name}</span>
        ${scoreHtml}
      </div>`;
  }

  #buildMeta(match) {
    if (match.status === 'FT') {
      return `<div class="bracket-match__meta"><span class="badge badge--ft">FT</span></div>`;
    }
    if (match.status === 'live') {
      return `<div class="bracket-match__meta"><span class="badge badge--live">&#128308; LIVE</span></div>`;
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
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        scroll.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  teardown() {}
}
