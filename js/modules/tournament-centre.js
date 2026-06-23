import { DataManager } from '../data.js';
import { formatKickoff, isToday } from '../time.js';
import { escapeHtml } from '../utils.js';
import { GroupCarousel } from './group-carousel.js';
import { KnockoutBracket } from './knockout-bracket.js';

export class TournamentCentre {
  #container;
  #params          = {};
  #activeTab       = 'groups';
  #tabEl           = null;
  #tabModule       = null;
  #countries       = [];
  #fixtures        = [];
  #knockoutMatches = [];
  #standings       = [];
  #groups          = [];
  #countryMap      = new Map();

  constructor(container, params = {}) {
    this.#container = container;
    this.#params    = params;
  }

  async render() {
    const [fixtures, standings, countries, groups, knockoutRounds] = await Promise.all([
      DataManager.loadFixtures(),
      DataManager.loadStandings(),
      DataManager.loadCountries(),
      DataManager.loadGroups(),
      DataManager.loadKnockout(),
    ]);
    this.#fixtures        = fixtures;
    this.#standings       = standings;
    this.#countries       = countries;
    this.#groups          = groups;
    this.#knockoutMatches = knockoutRounds.flatMap(r => r.matches ?? []);
    this.#countryMap      = new Map(this.#countries.map(c => [c.id, c]));

    this.#container.innerHTML = `
      <div class="page-content tournament-centre">
        ${this.#renderSnapshot()}
        <div class="tc-layout">
          <div class="tc-main">
            ${this.#renderFixtureStrip()}
            <div class="tc-tabs" role="tablist">
              <button class="tc-tab tc-tab--active" data-tab="groups"
                      role="tab" aria-selected="true" type="button">Group Stage</button>
              <button class="tc-tab" data-tab="knockout"
                      role="tab" aria-selected="false" type="button">Knockout Stage</button>
            </div>
            <div class="tc-tab-content"></div>
          </div>
          ${this.#renderRail()}
        </div>
      </div>`;

    this.#tabEl = this.#container.querySelector('.tc-tab-content');

    const validTabs = ['groups', 'knockout'];
    const initialTab = validTabs.includes(this.#params.initialTab)
      ? this.#params.initialTab
      : 'groups';
    await this.#loadTab(initialTab);

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

    if (tab === 'groups') {
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

  // ─── Snapshot ─────────────────────────────────────────────

  #renderSnapshot() {
    const playedGroup    = this.#fixtures.filter(f => f.status === 'FT').length;
    const playedKnockout = this.#knockoutMatches.filter(m => m.status === 'FT').length;
    const played         = playedGroup + playedKnockout;
    const total          = this.#fixtures.length + this.#knockoutMatches.length;
    const remaining      = total ? total - played : '—';
    const teams          = this.#countries.length || 48;

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

  // ─── Mobile fixture strip ──────────────────────────────────

  #renderFixtureStrip() {
    const allFixtures = this.#allFixturesWithKickoff();
    const todayAll    = allFixtures.filter(f => isToday(f.kickoff));
    const displayFixtures = todayAll.length > 0
      ? todayAll
      : [...allFixtures]
          .filter(f => f.status === 'scheduled')
          .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
          .slice(0, 8);

    if (!displayFixtures.length) return '';
    const cards = displayFixtures.map(f => this.#stripCard(f)).join('');
    return `<div class="tc-fixture-strip">${cards}</div>`;
  }

  #stripCard(f) {
    const home     = this.#countryMap.get(f.homeTeamId);
    const away     = this.#countryMap.get(f.awayTeamId);
    const homeAbbr = escapeHtml((home?.name ?? f.homeLabel ?? f.homeTeamId ?? 'TBD').slice(0, 3).toUpperCase());
    const awayAbbr = escapeHtml((away?.name ?? f.awayLabel ?? f.awayTeamId ?? 'TBD').slice(0, 3).toUpperCase());
    const isLive   = f.status === 'live';
    const isFT     = f.status === 'FT';
    const middle   = (isFT || isLive)
      ? `<span class="tc-strip-card__score">${f.homeScore ?? 0}–${f.awayScore ?? 0}</span>`
      : `<span class="tc-strip-card__time">${escapeHtml(formatKickoff(f.kickoff))}</span>`;
    const badge = isLive
      ? `<span class="tc-strip-card__badge tc-strip-card__badge--live">LIVE</span>`
      : isFT ? `<span class="tc-strip-card__badge">FT</span>` : '';
    return `
      <div class="tc-strip-card${isLive ? ' tc-strip-card--live' : ''}">
        <div class="tc-strip-card__row">
          <span class="tc-strip-card__team">${homeAbbr}</span>
          ${middle}
          <span class="tc-strip-card__team">${awayAbbr}</span>
        </div>
        ${badge}
      </div>`;
  }

  // ─── Fixture rail (desktop) ────────────────────────────────

  #renderRail() {
    const allFixtures = this.#allFixturesWithKickoff();

    const live         = allFixtures.filter(f => f.status === 'live');
    const todayUpcoming = allFixtures.filter(f =>
      f.status === 'scheduled' && isToday(f.kickoff)
    );
    const recentFT = [...allFixtures]
      .filter(f => f.status === 'FT')
      .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff))
      .slice(0, 5);
    const nextScheduled = [...allFixtures]
      .filter(f => f.status === 'scheduled' && !isToday(f.kickoff))
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
      .slice(0, 5);

    const sections = [
      live.length          ? this.#railSection('Live', live, true) : '',
      todayUpcoming.length ? this.#railSection('Today', todayUpcoming) : '',
      recentFT.length      ? this.#railSection('Recent', recentFT) : '',
      nextScheduled.length ? this.#railSection('Coming Up', nextScheduled) : '',
    ].join('');

    const inner = sections || `<p class="tc-rail__empty">No fixtures available</p>`;
    return `<aside class="tc-rail"><div class="tc-rail__inner">${inner}</div></aside>`;
  }

  #railSection(label, fixtures, isLive = false) {
    const labelClass = isLive ? 'tc-rail__label tc-rail__label--live' : 'tc-rail__label';
    const cards = fixtures.map(f => this.#railCard(f)).join('');
    return `
      <div class="tc-rail__section">
        <p class="${labelClass}">${escapeHtml(label)}</p>
        ${cards}
      </div>`;
  }

  #railCard(f) {
    const home     = this.#countryMap.get(f.homeTeamId);
    const away     = this.#countryMap.get(f.awayTeamId);
    const homeName = escapeHtml(home?.name ?? f.homeLabel ?? f.homeTeamId ?? 'TBD');
    const awayName = escapeHtml(away?.name ?? f.awayLabel ?? f.awayTeamId ?? 'TBD');
    const isLive   = f.status === 'live';
    const isFT     = f.status === 'FT';
    const hasScore = isFT || isLive;

    const middle = hasScore
      ? `<span class="tc-rail-card__score">${f.homeScore ?? 0}–${f.awayScore ?? 0}</span>`
      : `<span class="tc-rail-card__time">${escapeHtml(formatKickoff(f.kickoff))}</span>`;

    const metaParts = [];
    if (isFT)        metaParts.push('FT');
    else if (isLive) metaParts.push(`${f.minute ?? 'LIVE'}'`);
    if (f.groupId)   metaParts.push(`Grp ${escapeHtml(f.groupId)}`);

    return `
      <div class="tc-rail-card${isLive ? ' tc-rail-card--live' : ''}">
        <div class="tc-rail-card__teams">
          <span class="tc-rail-card__team">${homeName}</span>
          ${middle}
          <span class="tc-rail-card__team tc-rail-card__team--away">${awayName}</span>
        </div>
        ${metaParts.length ? `<p class="tc-rail-card__meta">${metaParts.join(' · ')}</p>` : ''}
      </div>`;
  }

  // ─── Shared helpers ────────────────────────────────────────

  #allFixturesWithKickoff() {
    return [
      ...this.#fixtures,
      ...this.#knockoutMatches.filter(m => m.kickoff),
    ];
  }

  init() {}

  teardown() {
    this.#tabModule?.teardown?.();
    this.#tabModule = null;
  }
}
