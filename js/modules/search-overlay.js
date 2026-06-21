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

    const scored = this.#index
      .map(item => ({ item, score: this.#score(item, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const teams   = scored.filter(x => x.item.type === 'team').slice(0, 6).map(x => x.item);
    const players = scored.filter(x => x.item.type === 'player').slice(0, 8).map(x => x.item);

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

  #score(item, q) {
    const label = this.#norm(item.label);
    const meta  = this.#norm(item.meta);

    if (label === q)                                        return 100;
    if (label.startsWith(q))                                return 90;
    if (label.includes(q))                                  return 80;
    if (label.split(/\s+/).some(w => w.startsWith(q)))     return 75;
    if (meta.includes(q))                                   return 60;

    if (q.length >= 4) {
      if (this.#isSubsequence(q, label))                    return 35;
      const words = label.split(/\s+/);
      const maxD  = q.length >= 6 ? 2 : 1;
      if (words.some(w => this.#levenshtein(q, w) <= maxD)) return 25;
    }

    return 0;
  }

  #isSubsequence(q, str) {
    let j = 0;
    for (let i = 0; i < str.length && j < q.length; i++) {
      if (str[i] === q[j]) j++;
    }
    return j === q.length;
  }

  #levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 3) return 99;
    const row = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      let prev = i;
      for (let j = 1; j <= n; j++) {
        const val = a[i - 1] === b[j - 1]
          ? row[j - 1]
          : 1 + Math.min(prev, row[j], row[j - 1]);
        row[j - 1] = prev;
        prev = val;
      }
      row[n] = prev;
    }
    return row[n];
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
