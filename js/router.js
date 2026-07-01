import { DataManager } from './data.js';
import { TournamentCentre } from './modules/tournament-centre.js';
import { TeamPage } from './modules/team-page.js';
import { CompareView } from './modules/compare-view.js';
import { CountriesPage } from './modules/countries-page.js';
import { ContinentsPage } from './modules/continents-page.js';
import { StatisticsPage } from './modules/statistics-page.js';
import { LeagueExplorer } from './modules/league-explorer.js';
import { ClubExplorer } from './modules/club-explorer.js';
import { MatchCentre } from './modules/match-centre.js';
import { BestThirds } from './modules/best-thirds.js';
import { ManagerPage } from './modules/manager-page.js';
import { escapeHtml } from './utils.js';

// ─── Placeholder for unimplemented routes ──────────────────

class PlaceholderModule {
  #container; #params;
  constructor(container, params = {}) { this.#container = container; this.#params = params; }
  async render() {
    this.#container.innerHTML = `
      <div class="page-content">
        <div class="empty-state">
          <p class="empty-state__title">Coming Soon</p>
          <p class="empty-state__message">This page will be available shortly.</p>
          <a href="#tournament" class="btn-link">← Tournament Centre</a>
        </div>
      </div>`;
  }
  init() {}
  teardown() {}
}

// ─── 404 ───────────────────────────────────────────────────

class NotFoundModule {
  #container; #params;
  constructor(container, params = {}) { this.#container = container; this.#params = params; }
  async render() {
    const hash = escapeHtml(this.#params.hash ?? '');
    this.#container.innerHTML = `
      <div class="page-content">
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <p class="empty-state__title">Page not found</p>
          <p class="empty-state__message">"${hash}" doesn't match any known route.</p>
          <a href="#tournament" class="btn-primary">Go to Tournament Centre</a>
        </div>
      </div>`;
  }
  init() {}
  teardown() {}
}

// ─── Named stub routes ─────────────────────────────────────

const STUB_ROUTES = new Set([]);

// ─── Router ────────────────────────────────────────────────

class _Router {
  #currentModule = null;
  #contentEl     = null;
  #countryIds    = null;

  async init() {
    this.#contentEl = document.getElementById('app-content');
    window.addEventListener('hashchange', () => this.#resolve());
    await this.#resolve();
  }

  navigate(hash) {
    window.location.hash = hash;
  }

  async #resolve() {
    const hash = window.location.hash.slice(1);

    this.#currentModule?.teardown();
    this.#currentModule = null;

    try {
      if (!this.#countryIds) {
        const countries = await DataManager.loadCountries();
        this.#countryIds = new Set(countries.map(c => c.id));
      }

      const { Module, params } = this.#parseRoute(hash);
      const mod = new Module(this.#contentEl, params);
      this.#currentModule = mod;
      await mod.render();
      mod.init();
      this.#updateActiveLink(hash);
    } catch (err) {
      console.error('Router: navigation error', err);
      this.#contentEl.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <p class="empty-state__title">Something went wrong</p>
            <p class="empty-state__message">An error occurred loading this page.</p>
          </div>
        </div>`;
    }
  }

  #parseRoute(hash) {
    // Home / Tournament Centre
    if (!hash || hash === 'tournament') {
      return { Module: TournamentCentre, params: {} };
    }

    // Deep-linked tournament tabs
    if (hash === 'today') {
      return { Module: TournamentCentre, params: { initialTab: 'today' } };
    }
    if (hash === 'knockout') {
      return { Module: TournamentCentre, params: { initialTab: 'knockout' } };
    }
    // Group deep-link: #group-a through #group-l
    if (/^group-[a-l]$/.test(hash)) {
      return {
        Module: TournamentCentre,
        params: { initialTab: 'groups', groupId: hash.slice(6).toUpperCase() },
      };
    }

    // Countries browse
    if (hash === 'countries') {
      return { Module: CountriesPage, params: {} };
    }

    // Continents browse
    if (hash === 'continents') {
      return { Module: ContinentsPage, params: {} };
    }

    // Global statistics dashboard
    if (hash === 'statistics') {
      return { Module: StatisticsPage, params: {} };
    }

    // League explorer
    if (hash === 'league-explorer') {
      return { Module: LeagueExplorer, params: {} };
    }

    // Club explorer
    if (hash === 'club-explorer') {
      return { Module: ClubExplorer, params: {} };
    }

    // Groups — alias for Tournament Centre group stage tab
    if (hash === 'groups') {
      return { Module: TournamentCentre, params: { initialTab: 'groups' } };
    }

    // Compare route: #compare or #compare/teamA/teamB
    if (hash === 'compare' || hash.startsWith('compare/')) {
      const parts = hash.split('/');
      return { Module: CompareView, params: { teamA: parts[1] ?? null, teamB: parts[2] ?? null } };
    }

    // Match Centre route: #match/{fixtureId} — must be before player deep-link loop
    if (hash.startsWith('match/')) {
      return { Module: MatchCentre, params: { fixtureId: hash.slice(6) } };
    }

    // Best-thirds race page
    if (hash === 'best-thirds') {
      return { Module: BestThirds, params: {} };
    }

    // Manager profile route: #manager/{countryId}
    if (hash.startsWith('manager/')) {
      return { Module: ManagerPage, params: { countryId: hash.slice(8) } };
    }

    // Player route: must check before country route (e.g. #france-mbappe)
    for (const id of (this.#countryIds ?? [])) {
      if (hash.startsWith(id + '-')) {
        return {
          Module: TeamPage,
          params: { countryId: id, scrollToPlayer: hash.slice(id.length + 1) },
        };
      }
    }

    // Country route
    if (this.#countryIds?.has(hash)) {
      return { Module: TeamPage, params: { countryId: hash } };
    }

    // Named stub routes
    if (STUB_ROUTES.has(hash)) {
      return { Module: PlaceholderModule, params: { route: hash } };
    }

    // Prefixed routes (club-, league-, search-)
    if (hash.startsWith('club-') || hash.startsWith('league-') || hash.startsWith('search-')) {
      return { Module: PlaceholderModule, params: { route: hash } };
    }

    return { Module: NotFoundModule, params: { hash } };
  }

  #updateActiveLink(hash) {
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('nav-link--active'));
    const isTc = !hash || hash === 'tournament' || hash === 'today' || hash === 'knockout'
      || /^group-[a-l]$/.test(hash) || hash.startsWith('match/') || hash === 'best-thirds';
    const href = isTc ? '#tournament'
      : hash.startsWith('compare/') ? '#compare'
      : hash.startsWith('manager/') ? `#${hash.slice(8)}`
      : `#${hash}`;
    document.querySelector(`.nav-link[href="${href}"]`)?.classList.add('nav-link--active');
  }
}

export const Router = new _Router();
