import { DataManager } from '../data.js';
import { escapeHtml } from '../utils.js';

export class StatisticsPage {
  #container;

  constructor(container, params = {}) {
    this.#container = container;
  }

  async render() {
    this.#container.innerHTML = `
      <div class="sp-page">
        <div class="sp-loading">
          <p class="sp-loading__text">Loading tournament data…</p>
        </div>
      </div>`;

    const [countries, clubs, leagues, allPlayers] = await Promise.all([
      DataManager.loadCountries(),
      DataManager.loadClubs(),
      DataManager.loadLeagues(),
      DataManager.loadAllPlayers(),
    ]);

    const countryMap = new Map(countries.map(c => [c.id, c]));
    const clubMap    = new Map(clubs.map(c => [c.id, c]));
    const leagueMap  = new Map(leagues.map(l => [l.id, l]));

    this.#container.innerHTML = `
      <div class="sp-page">
        <div class="sp-header">
          <h1 class="sp-header__title">Tournament Statistics</h1>
          <p class="sp-header__sub">World Cup 2026 · ${allPlayers.length.toLocaleString()} players · 48 nations</p>
        </div>
        <div class="sp-sections">
          ${this.#renderExperience(allPlayers, countries)}
          ${this.#renderScorers(allPlayers, countryMap)}
          ${this.#renderDemographics(allPlayers, countryMap)}
          ${this.#renderRepresentation(allPlayers, clubMap, leagueMap)}
        </div>
      </div>`;
  }

  // ─── Section 1: Squad Experience ──────────────────────────

  #renderExperience(allPlayers, countries) {
    const totalCaps  = allPlayers.reduce((s, p) => s + (p.caps ?? 0), 0);
    const avgCaps    = (totalCaps / allPlayers.length).toFixed(1);
    const topCapped  = [...allPlayers].sort((a, b) => (b.caps ?? 0) - (a.caps ?? 0))[0];

    // Top 10 squads by total caps
    const squadCaps = countries
      .map(c => ({
        country: c,
        total: allPlayers
          .filter(p => p.countryId === c.id)
          .reduce((s, p) => s + (p.caps ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total);

    const squadRows = squadCaps.slice(0, 10).map((s, i) => `
      <div class="sp-squad-row">
        <span class="sp-squad-row__rank">${i + 1}</span>
        <img src="assets/flags/${escapeHtml(s.country.id)}.svg" alt="" class="sp-squad-row__flag"
             width="20" height="14" onerror="this.style.display='none'">
        <span class="sp-squad-row__name">${escapeHtml(s.country.name)}</span>
        <span class="sp-squad-row__value">${s.total.toLocaleString()}</span>
      </div>`).join('');

    // Top 15 most-capped players
    const topPlayers = [...allPlayers]
      .sort((a, b) => (b.caps ?? 0) - (a.caps ?? 0))
      .slice(0, 15);

    const playerRows = topPlayers.map((p, i) =>
      this.#playerRow(i + 1, p, (p.caps ?? 0).toLocaleString())).join('');

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">Squad Experience</h2>
        <div class="ts-headlines">
          ${this.#statCard(totalCaps.toLocaleString(), 'Total caps')}
          ${this.#statCard(avgCaps, 'Avg caps / player')}
          ${this.#statCard((topCapped?.caps ?? 0).toLocaleString(), 'Highest capped')}
        </div>
        <div class="sp-two-col">
          <div>
            <p class="sp-col-label">Most experienced squads</p>
            <div class="sp-squad-list">${squadRows}</div>
          </div>
          <div>
            <p class="sp-col-label">Most capped players</p>
            <div class="ts-list">${playerRows}</div>
          </div>
        </div>
      </section>`;
  }

  // ─── Section 2: Career Scorers ─────────────────────────────

  #renderScorers(allPlayers, countryMap) {
    const scorers = [...allPlayers]
      .filter(p => (p.goals ?? 0) > 0)
      .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));

    if (!scorers.length) return '';

    const totalGoals = scorers.reduce((s, p) => s + (p.goals ?? 0), 0);
    const topScorer  = scorers[0];

    const squadGoals = [...countryMap.values()]
      .map(c => ({
        country: c,
        total: allPlayers.filter(p => p.countryId === c.id).reduce((s, p) => s + (p.goals ?? 0), 0),
      }))
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);

    const squadRows = squadGoals.slice(0, 10).map((s, i) => `
      <div class="sp-squad-row">
        <span class="sp-squad-row__rank">${i + 1}</span>
        <img src="assets/flags/${escapeHtml(s.country.id)}.svg" alt="" class="sp-squad-row__flag"
             width="20" height="14" onerror="this.style.display='none'">
        <span class="sp-squad-row__name">${escapeHtml(s.country.name)}</span>
        <span class="sp-squad-row__value">${s.total.toLocaleString()}</span>
      </div>`).join('');

    const playerRows = scorers.slice(0, 15)
      .map((p, i) => this.#playerRow(i + 1, p, (p.goals ?? 0).toLocaleString()))
      .join('');

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">Career International Scorers</h2>
        <p class="sp-caveat">Career goals in international football — not WC 2026 match goalscorers</p>
        <div class="ts-headlines">
          ${this.#statCard(totalGoals.toLocaleString(), 'Combined goals')}
          ${this.#statCard(scorers.length.toLocaleString(), 'Goalscorers')}
          ${this.#statCard((topScorer?.goals ?? 0).toLocaleString(), 'Top scorer')}
        </div>
        <div class="sp-two-col">
          <div>
            <p class="sp-col-label">Goals by squad</p>
            <div class="sp-squad-list">${squadRows}</div>
          </div>
          <div>
            <p class="sp-col-label">Top individual scorers</p>
            <div class="ts-list">${playerRows}</div>
          </div>
        </div>
      </section>`;
  }

  // ─── Section 3: Demographics ───────────────────────────────

  #renderDemographics(allPlayers, countryMap) {
    const withAge = allPlayers.filter(p => p.age > 0);
    if (!withAge.length) return '';

    const avgAge  = (withAge.reduce((s, p) => s + p.age, 0) / withAge.length).toFixed(1);
    const byAge   = [...withAge].sort((a, b) => a.age - b.age);
    const youngest = byAge[0];
    const oldest   = byAge[byAge.length - 1];

    // Position breakdown across all 1248 players
    const posCounts = { GK: 0, DF: 0, MF: 0, FW: 0 };
    allPlayers.forEach(p => { if (p.position in posCounts) posCounts[p.position]++; });
    const posTotal = Object.values(posCounts).reduce((s, n) => s + n, 0) || 1;

    const posRows = Object.entries(posCounts).map(([pos, count]) => {
      const pct = Math.round((count / posTotal) * 100);
      return `
        <div class="tp-makeup__row">
          <span class="tp-pos tp-pos--${pos.toLowerCase()}">${pos}</span>
          <div class="tp-makeup__bar-track">
            <div class="tp-makeup__bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="tp-makeup__label">${count} players</span>
          <span class="tp-makeup__count">${pct}%</span>
        </div>`;
    }).join('');

    const youngestCountry = countryMap.get(youngest.countryId);
    const oldestCountry   = countryMap.get(oldest.countryId);

    const flagHtml = (country) => country
      ? `<img src="assets/flags/${escapeHtml(country.id)}.svg" width="16" height="11" alt=""
              onerror="this.style.display='none'">`
      : '';

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">Tournament Demographics</h2>
        <div class="ts-headlines">
          ${this.#statCard(avgAge, 'Avg age')}
          ${this.#statCard(youngest.age, 'Youngest player')}
          ${this.#statCard(oldest.age, 'Oldest player')}
        </div>
        <div class="sp-two-col">
          <div>
            <p class="sp-col-label">Position breakdown · all 48 squads</p>
            <div class="tp-makeup">${posRows}</div>
          </div>
          <div>
            <p class="sp-col-label">Age records</p>
            <div class="sp-notes">
              <div class="sp-note-row">
                <span class="sp-note-row__label">Youngest</span>
                <div class="sp-note-row__val">
                  ${flagHtml(youngestCountry)}
                  <strong>${escapeHtml(youngest.name)}</strong>
                  <span class="sp-note-row__detail">${youngest.age} · ${escapeHtml(youngestCountry?.name ?? '')}</span>
                </div>
              </div>
              <div class="sp-note-row">
                <span class="sp-note-row__label">Oldest</span>
                <div class="sp-note-row__val">
                  ${flagHtml(oldestCountry)}
                  <strong>${escapeHtml(oldest.name)}</strong>
                  <span class="sp-note-row__detail">${oldest.age} · ${escapeHtml(oldestCountry?.name ?? '')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  }

  // ─── Section 4: Club & League Representation ───────────────

  #renderRepresentation(allPlayers, clubMap, leagueMap) {
    const clubCounts   = new Map();
    const leagueCounts = new Map();

    allPlayers.forEach(p => {
      if (p.clubId) {
        clubCounts.set(p.clubId, (clubCounts.get(p.clubId) ?? 0) + 1);
        const club = clubMap.get(p.clubId);
        if (club?.leagueId) {
          leagueCounts.set(club.leagueId, (leagueCounts.get(club.leagueId) ?? 0) + 1);
        }
      }
    });

    const topClubs = [...clubCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ name: clubMap.get(id)?.name ?? id, count }));

    const topLeagues = [...leagueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ name: leagueMap.get(id)?.name ?? id, count }));

    const distRows = (items) => items.map(({ name, count }) => `
      <div class="tp-dist__row">
        <span class="tp-dist__label">${escapeHtml(name)}</span>
        <span class="tp-dist__count">${count}</span>
      </div>`).join('');

    return `
      <section class="tp-section">
        <h2 class="tp-section__title">Club & League Representation</h2>
        <div class="sp-two-col">
          <div>
            <p class="sp-col-label">Top clubs</p>
            <div class="tp-dist">${distRows(topClubs)}</div>
          </div>
          <div>
            <p class="sp-col-label">Top leagues</p>
            <div class="tp-dist">${distRows(topLeagues)}</div>
          </div>
        </div>
      </section>`;
  }

  // ─── Shared helpers ────────────────────────────────────────

  #statCard(value, label) {
    return `
      <div class="ts-stat-card">
        <span class="ts-stat-card__value">${escapeHtml(String(value))}</span>
        <span class="ts-stat-card__label">${escapeHtml(label)}</span>
      </div>`;
  }

  #playerRow(rank, player, value) {
    const pos  = escapeHtml(player.position ?? '');
    const name = escapeHtml(player.name ?? '');
    const flagHtml = player.countryId
      ? `<img src="assets/flags/${escapeHtml(player.countryId)}.svg" alt=""
              class="sp-row__flag" width="20" height="14"
              onerror="this.style.display='none'">`
      : `<span class="sp-row__flag-ph"></span>`;

    return `
      <a href="#${escapeHtml(player.id)}" class="sp-player-row">
        <span class="ts-player-row__rank">${rank}</span>
        ${flagHtml}
        <span class="tp-pos tp-pos--${pos.toLowerCase()}">${pos}</span>
        <span class="ts-player-row__name">${name}</span>
        <span class="ts-player-row__value">${escapeHtml(String(value))}</span>
      </a>`;
  }

  init() {}
  teardown() {}
}
