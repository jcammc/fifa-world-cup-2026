import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';
import { OverviewTab } from './overview-tab.js';
import { SquadTab } from './squad-tab.js';

const TABS = ['overview', 'squad', 'fixtures', 'statistics'];

export class TeamPage {
  #container;
  #params;
  #country    = null;
  #players    = [];
  #clubs      = [];
  #leagues    = [];
  #activeTab  = 'overview';
  #tabModule  = null;
  #tabEl      = null;

  constructor(container, params = {}) {
    this.#container = container;
    this.#params    = params;
  }

  async render() {
    const { countryId, scrollToPlayer } = this.#params;

    const [countries, clubs, leagues] = await Promise.all([
      DataManager.loadCountries(),
      DataManager.loadClubs(),
      DataManager.loadLeagues(),
    ]);

    const country = countries.find(c => c.id === countryId);

    if (!country) {
      this.#container.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <div class="empty-state__icon">🔍</div>
            <p class="empty-state__title">Team not found</p>
            <p class="empty-state__message">No data for &ldquo;${escapeHtml(countryId ?? '')}&rdquo;.</p>
            <a href="#tournament" class="btn-link">← Tournament Centre</a>
          </div>
        </div>`;
      return;
    }

    this.#country = country;
    this.#clubs   = clubs;
    this.#leagues = leagues;
    this.#players = await DataManager.loadPlayersForTeam(countryId);

    if (scrollToPlayer) this.#activeTab = 'squad';

    this.#container.innerHTML = this.#renderShell(country);
    this.#tabEl = this.#container.querySelector('.tp-tab-content');

    await this.#loadTab(this.#activeTab);

    // Tab bar click delegation
    this.#container.querySelector('.tp-tabs')
      .addEventListener('click', async e => {
        const btn = e.target.closest('[data-tab]');
        if (!btn || btn.dataset.tab === this.#activeTab) return;
        await this.#loadTab(btn.dataset.tab);
      });

    // Hero player deep-link navigation
    if (scrollToPlayer) {
      const playerId = `${countryId}-${scrollToPlayer}`;
      this.#tabModule?.scrollToPlayer?.(playerId);
    }
  }

  // ─── Shell HTML (header + tab bar + content slot) ─────────────

  #renderShell(country) {
    const id      = escapeHtml(country.id);
    const name    = escapeHtml(country.name);
    const group   = country.groupId ? `Group ${escapeHtml(country.groupId)}` : 'TBC';
    const ranking = country.fifaRanking ? `#${country.fifaRanking} FIFA` : '';
    const conf    = escapeHtml(country.confederation ?? '');
    const manager = escapeHtml(country.manager ?? 'TBC');
    const meta    = [group, ranking, conf].filter(Boolean).join(' · ');

    const tabs = TABS.map(t => {
      const label  = t.charAt(0).toUpperCase() + t.slice(1);
      const active = t === this.#activeTab;
      return `<button class="tp-tab${active ? ' tp-tab--active' : ''}"
                      data-tab="${t}" type="button"
                      role="tab" aria-selected="${active}">${label}</button>`;
    }).join('');

    return `
      <div class="tp-page">
        <div class="tp-header">
          <div class="tp-header__flag">
            <img src="assets/flags/${id}.svg" alt="${name} flag" width="72" height="48"
                 onerror="this.style.display='none'">
          </div>
          <div class="tp-header__info">
            <h1 class="tp-header__name">${name}</h1>
            <p class="tp-header__meta">${meta}</p>
            <p class="tp-header__manager">Manager: ${manager}</p>
          </div>
        </div>
        <div class="tp-tabs" role="tablist">${tabs}</div>
        <div class="tp-tab-content"></div>
      </div>`;
  }

  // ─── Load a tab module ────────────────────────────────────────

  async #loadTab(tab) {
    this.#tabModule?.teardown?.();
    this.#tabModule  = null;
    this.#tabEl.innerHTML = '';
    this.#activeTab  = tab;

    this.#container.querySelectorAll('.tp-tab').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('tp-tab--active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    if (tab === 'overview') {
      this.#tabModule = new OverviewTab(
        this.#tabEl,
        this.#country,
        this.#players,
        this.#clubs,
        this.#leagues,
        playerId => this.#navigateToPlayer(playerId),
      );
    } else if (tab === 'squad') {
      this.#tabModule = new SquadTab(
        this.#tabEl,
        this.#country,
        this.#players,
        this.#clubs,
      );
    } else {
      const label = tab.charAt(0).toUpperCase() + tab.slice(1);
      this.#tabEl.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <div class="empty-state__icon">🚧</div>
            <p class="empty-state__title">Coming soon</p>
            <p class="empty-state__message">${escapeHtml(label)} tab is on the roadmap.</p>
          </div>
        </div>`;
      return;
    }

    await this.#tabModule.render();
    this.#tabModule.init?.();
  }

  // ─── Hero player navigation (Overview → Squad) ────────────────

  async #navigateToPlayer(playerId) {
    await this.#loadTab('squad');
    this.#tabModule?.scrollToPlayer?.(playerId);
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  init() {}

  teardown() {
    this.#tabModule?.teardown?.();
    this.#tabModule = null;
  }
}
