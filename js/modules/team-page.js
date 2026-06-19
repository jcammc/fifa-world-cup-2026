import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';

export class TeamPage {
  #container;
  #params;

  constructor(container, params = {}) {
    this.#container = container;
    this.#params    = params;
  }

  async render() {
    const { countryId } = this.#params;

    const countries = await DataManager.loadCountries();
    const country   = countries.find(c => c.id === countryId);

    if (!country) {
      this.#container.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <div class="empty-state__icon">🔍</div>
            <p class="empty-state__title">Team not found</p>
            <p class="empty-state__message">
              No data for &ldquo;${escapeHtml(countryId ?? '')}&rdquo;.
            </p>
            <a href="#tournament" class="btn-link">← Tournament Centre</a>
          </div>
        </div>`;
      return;
    }

    const name          = escapeHtml(country.name);
    const id            = escapeHtml(country.id);
    const group         = country.groupId ? `Group ${escapeHtml(country.groupId)}` : 'Group TBC';
    const ranking       = country.fifaRanking ? `#${country.fifaRanking} FIFA` : '';
    const confederation = country.confederation ? escapeHtml(country.confederation) : '';
    const manager       = country.manager ? escapeHtml(country.manager) : 'Manager TBC';

    const metaParts = [group, ranking, confederation].filter(Boolean);

    this.#container.innerHTML = `
      <div class="page-content">
        <div class="team-stub">
          <div class="team-stub__flag">
            <img src="assets/flags/${id}.svg"
                 alt="${name} flag"
                 width="72" height="48"
                 onerror="this.style.display='none'">
          </div>
          <h1 class="team-stub__name">${name}</h1>
          <p class="team-stub__meta">${metaParts.join(' &middot; ')}</p>
          <p class="team-stub__manager">Manager: ${manager}</p>
          <div class="team-stub__notice">
            <p>Full team page (Overview, Squad, Fixtures, Stats tabs) arrives in Sprint 3.</p>
          </div>
        </div>
      </div>`;
  }

  init() {}

  teardown() {}
}
