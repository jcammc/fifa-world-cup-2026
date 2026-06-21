import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';
import { Charts } from '../charts.js';

const POSITIONS       = ['GK', 'DF', 'MF', 'FW'];
const POSITION_LABELS = { GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' };

export class CompareView {
  #container;
  #countries = [];
  #teamAId   = null;
  #teamBId   = null;

  constructor(container, params = {}) {
    this.#container = container;
    this.#teamAId   = params.teamA ?? null;
    this.#teamBId   = params.teamB ?? null;
  }

  async render() {
    this.#countries = await DataManager.loadCountries();
    this.#container.innerHTML = this.#buildShell();
    if (this.#teamAId && this.#teamBId) await this.#runComparison();
  }

  init() {
    const selA = this.#container.querySelector('#cv-select-a');
    const selB = this.#container.querySelector('#cv-select-b');
    if (selA && this.#teamAId) selA.value = this.#teamAId;
    if (selB && this.#teamBId) selB.value = this.#teamBId;
    selA?.addEventListener('change', () => this.#onSelectionChange());
    selB?.addEventListener('change', () => this.#onSelectionChange());
  }

  teardown() {}

  // ─── Shell ────────────────────────────────────────────────────

  #buildShell() {
    const options = this.#buildOptions();
    return `
      <div class="cv-page page-content">
        <h1 class="cv-title">Compare Teams</h1>
        <div class="cv-selectors">
          <select class="cv-select" id="cv-select-a" aria-label="Select first team">
            <option value="">Select a team…</option>
            ${options}
          </select>
          <span class="cv-vs" aria-hidden="true">vs</span>
          <select class="cv-select" id="cv-select-b" aria-label="Select second team">
            <option value="">Select a team…</option>
            ${options}
          </select>
        </div>
        <div id="cv-result">
          ${this.#teamAId && this.#teamBId
            ? '<p class="cv-loading">Loading comparison…</p>'
            : this.#buildPrompt()}
        </div>
      </div>`;
  }

  #buildOptions() {
    const byGroup = new Map();
    for (const c of this.#countries) {
      const g = c.groupId ?? 'Other';
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(c);
    }
    let html = '';
    for (const [g, teams] of [...byGroup.entries()].sort()) {
      html += `<optgroup label="Group ${escapeHtml(g)}">`;
      for (const t of teams) {
        html += `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`;
      }
      html += `</optgroup>`;
    }
    return html;
  }

  // ─── Selection change ─────────────────────────────────────────

  async #onSelectionChange() {
    this.#teamAId = this.#container.querySelector('#cv-select-a')?.value || null;
    this.#teamBId = this.#container.querySelector('#cv-select-b')?.value || null;
    const resultEl = this.#container.querySelector('#cv-result');

    if (this.#teamAId && this.#teamBId) {
      if (this.#teamAId === this.#teamBId) {
        resultEl.innerHTML = `<p class="cv-same-team">Select two different teams to compare.</p>`;
        return;
      }
      history.replaceState(null, '', `#compare/${this.#teamAId}/${this.#teamBId}`);
      resultEl.innerHTML = '<p class="cv-loading">Loading comparison…</p>';
      await this.#runComparison();
    } else {
      history.replaceState(null, '', '#compare');
      resultEl.innerHTML = this.#buildPrompt();
    }
  }

  // ─── Data loading ─────────────────────────────────────────────

  async #runComparison() {
    const [playersA, playersB] = await Promise.all([
      DataManager.loadPlayersForTeam(this.#teamAId),
      DataManager.loadPlayersForTeam(this.#teamBId),
    ]);

    const countryA = this.#countries.find(c => c.id === this.#teamAId);
    const countryB = this.#countries.find(c => c.id === this.#teamBId);
    if (!countryA || !countryB) {
      const resultEl = this.#container.querySelector('#cv-result');
      if (resultEl) resultEl.innerHTML = this.#buildPrompt();
      return;
    }

    const resultEl = this.#container.querySelector('#cv-result');
    resultEl.innerHTML = this.#buildComparison(countryA, playersA, countryB, playersB);

    if (countryA.teamStrength && countryB.teamStrength) {
      const radarA = resultEl.querySelector('#cv-radar-a');
      const radarB = resultEl.querySelector('#cv-radar-b');
      if (radarA) Charts.renderRadar(radarA, countryA.teamStrength);
      if (radarB) Charts.renderRadar(radarB, countryB.teamStrength);
    }
  }

  // ─── Comparison sections ──────────────────────────────────────

  #buildComparison(cA, pA, cB, pB) {
    return `
      <div class="cv-comparison">
        ${this.#buildHeaders(cA, cB)}
        ${this.#buildExperience(pA, pB)}
        ${this.#buildGoals(pA, pB)}
        ${this.#buildProfile(pA, pB)}
        ${this.#buildMakeup(pA, pB)}
        ${(cA.teamStrength && cB.teamStrength) ? this.#buildRadarSection() : ''}
      </div>`;
  }

  #buildHeaders(cA, cB) {
    return `<div class="cv-headers">${this.#buildHeader(cA)}${this.#buildHeader(cB)}</div>`;
  }

  #buildHeader(country) {
    const id   = escapeHtml(country.id);
    const name = escapeHtml(country.name);
    const meta = [
      country.groupId  ? `Group ${escapeHtml(country.groupId)}` : '',
      country.fifaRanking ? `#${country.fifaRanking} FIFA` : '',
      escapeHtml(country.confederation ?? ''),
    ].filter(Boolean).join(' · ');
    return `
      <div class="cv-team-header">
        <img class="cv-team-header__flag" src="assets/flags/${id}.svg" alt="${name} flag"
             width="48" height="32" onerror="this.style.display='none'">
        <div>
          <p class="cv-team-header__name">${name}</p>
          ${meta ? `<p class="cv-team-header__meta">${meta}</p>` : ''}
        </div>
      </div>`;
  }

  #buildExperience(pA, pB) {
    const totalA = pA.reduce((s, p) => s + (p.caps ?? 0), 0);
    const totalB = pB.reduce((s, p) => s + (p.caps ?? 0), 0);
    const avgA   = pA.length ? Math.round(totalA / pA.length) : 0;
    const avgB   = pB.length ? Math.round(totalB / pB.length) : 0;
    const uncA   = pA.filter(p => !(p.caps > 0)).length;
    const uncB   = pB.filter(p => !(p.caps > 0)).length;

    return `
      <div class="cv-section">
        <p class="cv-section__title">Experience</p>
        ${this.#duelRow('Total caps', totalA.toLocaleString(), totalB.toLocaleString(), totalA, totalB, 'higher')}
        ${this.#duelRow('Avg caps',   avgA,  avgB,  avgA,  avgB,  'higher')}
        ${this.#duelRow('Uncapped',   uncA,  uncB,  uncA,  uncB,  'lower')}
      </div>`;
  }

  #buildGoals(pA, pB) {
    const scorersA = pA.filter(p => (p.goals ?? 0) > 0);
    const scorersB = pB.filter(p => (p.goals ?? 0) > 0);
    const goalsA   = scorersA.reduce((s, p) => s + p.goals, 0);
    const goalsB   = scorersB.reduce((s, p) => s + p.goals, 0);
    const topA     = scorersA.length ? Math.max(...scorersA.map(p => p.goals)) : 0;
    const topB     = scorersB.length ? Math.max(...scorersB.map(p => p.goals)) : 0;

    return `
      <div class="cv-section">
        <p class="cv-section__title">International Goals</p>
        ${this.#duelRow('Squad goals',  goalsA,          goalsB,          goalsA,          goalsB,          'higher')}
        ${this.#duelRow('Goalscorers',  scorersA.length, scorersB.length, scorersA.length, scorersB.length, 'higher')}
        ${this.#duelRow('Top scorer',   topA,            topB,            topA,            topB,            'higher')}
      </div>`;
  }

  #buildProfile(pA, pB) {
    const ageA = pA.filter(p => p.age > 0);
    const ageB = pB.filter(p => p.age > 0);
    if (!ageA.length && !ageB.length) return '';

    const avg = arr => arr.length ? (arr.reduce((s, p) => s + p.age, 0) / arr.length).toFixed(1) : '—';
    const min = arr => arr.length ? Math.min(...arr.map(p => p.age)) : '—';
    const max = arr => arr.length ? Math.max(...arr.map(p => p.age)) : '—';

    const posRows = POSITIONS.map(pos => {
      const gA = ageA.filter(p => p.position === pos);
      const gB = ageB.filter(p => p.position === pos);
      return this.#duelRow(POSITION_LABELS[pos], avg(gA), avg(gB), null, null, 'neutral');
    }).join('');

    return `
      <div class="cv-section">
        <p class="cv-section__title">Squad Profile</p>
        ${this.#duelRow('Avg age',  avg(ageA), avg(ageB), null, null, 'neutral')}
        ${this.#duelRow('Youngest', min(ageA),  min(ageB),  null, null, 'neutral')}
        ${this.#duelRow('Oldest',   max(ageA),  max(ageB),  null, null, 'neutral')}
        ${posRows}
      </div>`;
  }

  #buildMakeup(pA, pB) {
    const countPos = (players, pos) => players.filter(p => p.position === pos).length;
    const rows = POSITIONS.map(pos =>
      this.#duelRow(POSITION_LABELS[pos], countPos(pA, pos), countPos(pB, pos), null, null, 'neutral')
    ).join('');
    return `
      <div class="cv-section">
        <p class="cv-section__title">Squad Makeup</p>
        ${rows}
      </div>`;
  }

  #buildRadarSection() {
    return `
      <div class="cv-section">
        <p class="cv-section__title">Team Strength</p>
        <div class="cv-radar-row">
          <div id="cv-radar-a"></div>
          <div id="cv-radar-b"></div>
        </div>
      </div>`;
  }

  // ─── Duel row ─────────────────────────────────────────────────

  #duelRow(label, displayA, displayB, numA, numB, mode) {
    let clsA = 'cv-duel__val cv-duel__val--a';
    let clsB = 'cv-duel__val cv-duel__val--b';

    if (mode !== 'neutral' && numA != null && numB != null && numA !== numB) {
      const aWins = mode === 'higher' ? numA > numB : numA < numB;
      if (aWins) clsA += ' cv-duel__val--winner';
      else       clsB += ' cv-duel__val--winner';
    }

    return `
      <div class="cv-duel__row">
        <span class="${clsA}">${escapeHtml(String(displayA))}</span>
        <span class="cv-duel__label">${escapeHtml(label)}</span>
        <span class="${clsB}">${escapeHtml(String(displayB))}</span>
      </div>`;
  }

  // ─── Prompt ───────────────────────────────────────────────────

  #buildPrompt() {
    return `
      <div class="cv-prompt">
        <p class="cv-prompt__icon" aria-hidden="true">⚖️</p>
        <p class="cv-prompt__title">Select two teams to compare</p>
        <p class="cv-prompt__hint">Compare squad experience, goals, age profile and team strength</p>
      </div>`;
  }
}
