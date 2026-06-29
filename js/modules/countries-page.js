import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';

export class CountriesPage {
  #container;

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    const countries = await DataManager.loadCountries();

    const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name));

    const confCount = new Set(countries.map(c => c.confederation).filter(Boolean)).size;

    this.#container.innerHTML = `
      <div class="cp-page">
        <h1 class="cp-page__title">All Nations</h1>
        <p class="cp-page__subtitle">${countries.length} teams · ${confCount} confederations · alphabetical</p>
        <div class="cp-grid">
          ${sorted.map(c => this.#renderCard(c)).join('')}
        </div>
      </div>`;
  }

  #renderCard(c) {
    const id      = escapeHtml(c.id);
    const name    = escapeHtml(c.name);
    const ranking = c.fifaRanking ? `#${c.fifaRanking}` : '';
    const conf    = escapeHtml(c.confederation ?? '');
    const meta    = [ranking, conf].filter(Boolean).join(' · ');

    return `
      <a href="#${id}" class="cp-card">
        <div class="cp-card__flag">
          <img src="assets/flags/${id}.svg" alt="${name} flag" width="48" height="32"
               onerror="this.style.display='none'">
        </div>
        <div class="cp-card__body">
          <span class="cp-card__name">${name}</span>
          ${meta ? `<span class="cp-card__meta">${escapeHtml(meta)}</span>` : ''}
        </div>
      </a>`;
  }

  init() {}
  teardown() {}
}
