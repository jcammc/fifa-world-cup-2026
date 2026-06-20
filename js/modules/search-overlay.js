import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';

export class SearchOverlay {
  #index     = [];
  #overlayEl = null;
  #inputEl   = null;
  #resultsEl = null;
  #prevFocus = null;
  #isOpen    = false;

  async init() {
    this.#index = await DataManager.loadSearchIndex();
    this.#build();
    this.#wire();
  }

  #build() {
    const el = document.createElement('div');
    el.className = 'search-overlay';
    el.setAttribute('hidden', '');
    el.innerHTML = `
      <div class="search-backdrop"></div>
      <div class="search-modal" role="dialog" aria-modal="true" aria-label="Search">
        <div class="search-input-row">
          <svg class="search-icon" aria-hidden="true" width="18" height="18"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input class="search-input" type="search" autocomplete="off" spellcheck="false"
                 placeholder="Search teams and players…" aria-label="Search">
          <kbd class="search-esc-hint">Esc</kbd>
        </div>
        <div class="search-results" role="listbox" aria-label="Search results"></div>
      </div>`;
    document.body.appendChild(el);
    this.#overlayEl = el;
    this.#inputEl   = el.querySelector('.search-input');
    this.#resultsEl = el.querySelector('.search-results');
  }

  #wire() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.#isOpen ? this.close() : this.open();
        return;
      }
      if (e.key === 'Escape' && this.#isOpen) {
        e.stopPropagation();
        this.close();
      }
    });

    this.#overlayEl.querySelector('.search-backdrop')
      .addEventListener('click', () => this.close());

    this.#inputEl.addEventListener('input', () => this.#filter(this.#inputEl.value));

    this.#resultsEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-href]');
      if (btn?.dataset.href) this.#navigate(btn.dataset.href);
    });

    document.getElementById('search-trigger')
      ?.addEventListener('click', () => this.open());
  }

  open() {
    if (this.#isOpen) return;
    this.#prevFocus = document.activeElement;
    this.#isOpen    = true;
    this.#overlayEl.removeAttribute('hidden');
    this.#inputEl.value = '';
    this.#resultsEl.innerHTML = '';
    requestAnimationFrame(() => this.#inputEl.focus());
  }

  close() {
    if (!this.#isOpen) return;
    this.#isOpen = false;
    this.#overlayEl.setAttribute('hidden', '');
    this.#prevFocus?.focus?.();
    this.#prevFocus = null;
  }

  // ─── Filtering ────────────────────────────────────────────

  #norm(str) {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  #filter(query) {
    const q = this.#norm(query.trim());
    if (!q) { this.#resultsEl.innerHTML = ''; return; }

    const hits = this.#index.filter(item =>
      this.#norm(item.label).includes(q) || this.#norm(item.meta).includes(q)
    );

    const teams   = hits.filter(h => h.type === 'team').slice(0, 6);
    const players = hits.filter(h => h.type === 'player').slice(0, 8);

    if (!teams.length && !players.length) {
      this.#resultsEl.innerHTML =
        `<p class="search-empty">No results for <strong>${escapeHtml(query)}</strong></p>`;
      return;
    }

    let html = '';
    if (teams.length)   html += this.#group('Teams',   teams);
    if (players.length) html += this.#group('Players', players);
    this.#resultsEl.innerHTML = html;
  }

  #group(heading, items) {
    const rows = items.map(item => `
      <button class="search-result" type="button" data-href="${escapeHtml(item.href)}">
        <span class="search-result__label">${escapeHtml(item.label)}</span>
        <span class="search-result__meta">${escapeHtml(item.meta)}</span>
      </button>`).join('');
    return `<div class="search-group">
      <p class="search-group__heading">${escapeHtml(heading)}</p>
      ${rows}
    </div>`;
  }

  // ─── Navigation ───────────────────────────────────────────

  #navigate(href) {
    this.close();
    window.location.hash = href.startsWith('#') ? href.slice(1) : href;
  }
}
