import { DataManager } from '../data.js';
import { formatKickoff, isToday } from '../time.js';
import { escapeHtml } from '../utils.js';
import { GroupCarousel } from './group-carousel.js';
import { KnockoutBracket } from './knockout-bracket.js';

export class TournamentCentre {
  #container;
  #params     = {};
  #activeTab  = 'today';
  #tabEl      = null;
  #tabModule  = null;
  #countries  = [];
  #fixtures   = [];
  #standings  = [];
  #groups     = [];
  #countryMap = new Map();

  constructor(container, params = {}) {
    this.#container = container;
    this.#params    = params;
  }

  async render() {
    [this.#fixtures, this.#standings, this.#countries, this.#groups] = await Promise.all([
      DataManager.loadFixtures(),
      DataManager.loadStandings(),
      DataManager.loadCountries(),
      DataManager.loadGroups(),
    ]);
    this.#countryMap = new Map(this.#countries.map(c => [c.id, c]));

    this.#container.innerHTML = `
      <div class="page-content tournament-centre">
        ${this.#renderSnapshot()}
        <div class="tc-tabs" role="tablist">
          <button class="tc-tab tc-tab--active" data-tab="today"
                  role="tab" aria-selected="true" type="button">Today's Matches</button>
          <button class="tc-tab" data-tab="groups"
                  role="tab" aria-selected="false" type="button">Group Stage</button>
          <button class="tc-tab" data-tab="knockout"
                  role="tab" aria-selected="false" type="button">Knockout Stage</button>
        </div>
        <div class="tc-tab-content"></div>
      </div>`;

    this.#tabEl = this.#container.querySelector('.tc-tab-content');
    await this.#loadTab(this.#params.initialTab ?? 'today');

    // Attach to inner element (re-created each render) to avoid listener accumulation
    this.#container.querySelector('.tournament-centre').addEventListener('click', async e => {
      const btn = e.target.closest('[data-tab]');
      if (!btn || btn.dataset.tab === this.#activeTab) return;
      await this.#loadTab(btn.dataset.tab);
    });
  }

  // ─── Tab loading ──────────────────────────────────────────

  async #loadTab(tab) {
    this.#tabModule?.teardown?.();
    this.#tabModule = null;
    this.#tabEl.innerHTML = '';
    this.#activeTab = tab;

    this.#container.querySelectorAll('.tc-tab').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('tc-tab--active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    if (tab === 'today') {
      this.#tabEl.innerHTML = this.#renderTodayTab();
    } else if (tab === 'groups') {
      this.#tabModule = new GroupCarousel(
        this.#tabEl,
        this.#groups,
        this.#standings,
        this.#fixtures,
        this.#countryMap,
      );
      this.#tabModule.render();
      this.#tabModule.init();
      const groupId = this.#params.groupId;
      if (groupId) {
        this.#params.groupId = null;
        setTimeout(() => this.#tabModule?.scrollToGroup(groupId), 0);
      }
    } else if (tab === 'knockout') {
      this.#tabModule = new KnockoutBracket(this.#tabEl);
      await this.#tabModule.render();
      this.#tabModule.init();
    }
  }

  // ─── Snapshot (always visible above tabs) ─────────────────

  #renderSnapshot() {
    const played    = this.#fixtures.filter(f => f.status === 'FT').length;
    const remaining = this.#fixtures.length ? this.#fixtures.length - played : '—';
    const teams     = this.#countries.length || 48;

    return `
      <section class="tc-snapshot">
        <h1 class="tc-title">World Cup 2026</h1>
        <p class="tc-subtitle">48 teams &middot; 12 groups &middot; 104 matches</p>
        <div class="tc-snapshot__stats">
          <div class="tc-stat">
            <span class="tc-stat__value">${teams}</span>
            <span class="tc-stat__label">Teams</span>
          </div>
          <div class="tc-stat">
            <span class="tc-stat__value">${played}</span>
            <span class="tc-stat__label">Played</span>
          </div>
          <div class="tc-stat">
            <span class="tc-stat__value">${remaining}</span>
            <span class="tc-stat__label">Remaining</span>
          </div>
        </div>
      </section>`;
  }

  // ─── Today tab ────────────────────────────────────────────

  #renderTodayTab() {
    const todayFixtures    = this.#fixtures.filter(f => isToday(f.kickoff));
    const isNext           = todayFixtures.length === 0;
    const displayFixtures  = isNext
      ? this.#fixtures.filter(f => f.status === 'scheduled').slice(0, 6)
      : todayFixtures;

    return `
      <div class="tc-today-tab">
        ${this.#renderMatchSection(displayFixtures, isNext)}
        ${this.#renderGroupLeaders()}
      </div>`;
  }

  // ─── Match section ────────────────────────────────────────

  #renderMatchSection(displayFixtures, isNext) {
    const heading = isNext ? 'Next Matches' : "Today's Matches";
    const note    = isNext
      ? `<span class="tc-section__note">(no matches today)</span>`
      : '';

    if (!displayFixtures.length) {
      return `
        <section class="tc-section">
          <h2 class="tc-section__title">${heading}</h2>
          <div class="empty-state empty-state--compact">
            <p class="empty-state__message">No fixtures available yet.</p>
          </div>
        </section>`;
    }

    const cards = displayFixtures.map(f => this.#matchCard(f)).join('');
    return `
      <section class="tc-section">
        <h2 class="tc-section__title">${heading}${note}</h2>
        <div class="match-cards">${cards}</div>
      </section>`;
  }

  #matchCard(f) {
    const home     = this.#countryMap.get(f.homeTeamId);
    const away     = this.#countryMap.get(f.awayTeamId);
    const homeName = escapeHtml(home?.name ?? f.homeTeamId ?? 'TBD');
    const awayName = escapeHtml(away?.name ?? f.awayTeamId ?? 'TBD');
    const kickoff  = escapeHtml(formatKickoff(f.kickoff));
    const venue    = f.venue ? escapeHtml(f.venue) : '';

    const middle = f.status === 'FT' || f.status === 'live'
      ? `<span class="match-card__score">${f.homeScore}&nbsp;&ndash;&nbsp;${f.awayScore}</span>`
      : `<span class="match-card__time">${kickoff}</span>`;

    const statusBadge = f.status === 'live'
      ? `<span class="badge badge--live" aria-label="Live match">&#128308; LIVE</span>`
      : f.status === 'FT'
      ? `<span class="badge badge--ft">FT</span>`
      : '';

    const broadcaster = f.broadcaster
      ? `<span class="badge badge--broadcaster badge--${escapeHtml(f.broadcaster.toLowerCase())}">${escapeHtml(f.broadcaster)}</span>`
      : '';

    return `
      <div class="match-card">
        <div class="match-card__teams">
          <span class="match-card__team">${homeName}</span>
          ${middle}
          <span class="match-card__team match-card__team--away">${awayName}</span>
        </div>
        <div class="match-card__meta">
          ${statusBadge}
          ${broadcaster}
          ${venue ? `<span class="match-card__venue">${venue}</span>` : ''}
        </div>
      </div>`;
  }

  // ─── Group leaders (quick-glance, Today tab) ─────────────

  #renderGroupLeaders() {
    if (!this.#standings.length) {
      return `
        <section class="tc-section">
          <h2 class="tc-section__title">Group Leaders</h2>
          <div class="empty-state empty-state--compact">
            <p class="empty-state__message">Standings will appear once matches begin.</p>
          </div>
        </section>`;
    }

    const cards = [...this.#standings]
      .sort((a, b) => a.groupId.localeCompare(b.groupId))
      .map(group => {
        const leader = group.teams?.[0];
        if (!leader) return '';
        const country = this.#countryMap.get(leader.teamId);
        const name    = escapeHtml(country?.name ?? leader.teamId);
        const id      = escapeHtml(leader.teamId);
        return `
          <div class="leader-card">
            <span class="leader-card__group">Group ${escapeHtml(group.groupId)}</span>
            <a href="#${id}" class="leader-card__team">${name}</a>
            <span class="leader-card__pts">${leader.points} pts</span>
          </div>`;
      }).filter(Boolean).join('');

    return `
      <section class="tc-section">
        <div class="tc-section__header">
          <h2 class="tc-section__title">Group Leaders</h2>
          <button class="btn-link tc-section__link" type="button"
                  data-tab="groups">View all groups &rarr;</button>
        </div>
        <div class="leader-cards">${cards}</div>
      </section>`;
  }

  init() {}

  teardown() {
    this.#tabModule?.teardown?.();
    this.#tabModule = null;
  }
}
