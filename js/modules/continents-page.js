import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';

const CONF_ORDER = ['UEFA', 'CONMEBOL', 'CAF', 'AFC', 'CONCACAF', 'OFC'];

const CONF_LABELS = {
  UEFA:      'UEFA — Europe',
  CAF:       'CAF — Africa',
  AFC:       'AFC — Asia & Pacific',
  CONCACAF:  'CONCACAF — North & Central America',
  CONMEBOL:  'CONMEBOL — South America',
  OFC:       'OFC — Oceania',
};

export class ContinentsPage {
  #container;

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    const countries = await DataManager.loadCountries();

    const byConf = new Map(CONF_ORDER.map(c => [c, []]));
    for (const country of countries) {
      const conf = country.confederation ?? 'Other';
      if (!byConf.has(conf)) byConf.set(conf, []);
      byConf.get(conf).push(country);
    }

    byConf.forEach(teams =>
      teams.sort((a, b) => (a.fifaRanking ?? 999) - (b.fifaRanking ?? 999))
    );

    const sectionsHtml = [...byConf.entries()]
      .filter(([, teams]) => teams.length > 0)
      .map(([conf, teams]) => `
        <section class="cp-group">
          <h2 class="cp-group__title">
            ${escapeHtml(CONF_LABELS[conf] ?? conf)}
            <span class="cp-group__badge">${teams.length}</span>
          </h2>
          <div class="cp-grid">
            ${teams.map(c => this.#renderCard(c)).join('')}
          </div>
        </section>`).join('');

    this.#container.innerHTML = `
      <div class="cp-page">
        <h1 class="cp-page__title">Nations by Confederation</h1>
        <p class="cp-page__subtitle">${countries.length} teams · 6 confederations</p>
        <div class="cp-groups">${sectionsHtml}</div>
      </div>`;
  }

  #renderCard(c) {
    const id      = escapeHtml(c.id);
    const name    = escapeHtml(c.name);
    const ranking = c.fifaRanking ? `#${c.fifaRanking}` : '';

    return `
      <a href="#${id}" class="cp-card">
        <div class="cp-card__flag">
          <img src="assets/flags/${id}.svg" alt="${name} flag" width="48" height="32"
               onerror="this.style.display='none'">
        </div>
        <div class="cp-card__body">
          <span class="cp-card__name">${name}</span>
          ${ranking ? `<span class="cp-card__meta">${escapeHtml(ranking)}</span>` : ''}
        </div>
      </a>`;
  }

  init() {}
  teardown() {}
}
