import { DataManager } from './data.js';
import { TournamentCentre } from './modules/tournament-centre.js';
import { TeamPage } from './modules/team-page.js';
import { escapeHtml } from './utils.js';

// ─── Placeholder for unimplemented routes ──────────────────

class PlaceholderModule {
  #container; #params;
  constructor(container, params = {}) { this.#container = container; this.#params = params; }
  async render() {
    const route = escapeHtml(this.#params.route ?? 'this page');
    this.#container.innerHTML = `
      <div class="page-content">
        <div class="empty-state">
          <div class="empty-state__icon">🚧</div>
          <p class="empty-state__title">Coming Soon</p>
          <p class="empty-state__message">${route} is not yet implemented.</p>
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

const STUB_ROUTES = new Set([
  'countries', 'groups', 'continents',
  'compare', 'statistics',
  'club-explorer', 'league-explorer',
]);

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
    const isTc = !hash || hash === 'tournament' || hash === 'today' || hash === 'knockout' || /^group-[a-l]$/.test(hash);
    const href = isTc ? '#tournament' : `#${hash}`;
    document.querySelector(`.nav-link[href="${href}"]`)?.classList.add('nav-link--active');
  }
}

export const Router = new _Router();
