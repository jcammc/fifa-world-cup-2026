import { DataManager } from '../data.js';
import { escapeHtml, getInitials } from '../utils.js';

export class ManagerPage {
  #container;
  #countryId;

  constructor(container, params = {}) {
    this.#container = container;
    this.#countryId = params.countryId ?? '';
  }

  async render() {
    const [countries, managerData, photoMap, fixtures] = await Promise.all([
      DataManager.loadCountries(),
      DataManager.loadManager(this.#countryId),
      DataManager.loadPlayerPhotos(),
      DataManager.loadFixtures(),
    ]);

    const country = countries.find(c => c.id === this.#countryId);
    if (!country) {
      this.#container.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <p class="empty-state__title">Manager not found</p>
            <a href="#${escapeHtml(this.#countryId)}" class="btn-link">← Back to team</a>
          </div>
        </div>`;
      return;
    }

    const record = this.#computeRecord(fixtures, this.#countryId);
    const html   = this.#buildPage(country, managerData, photoMap, record);
    this.#container.innerHTML = html;
  }

  #computeRecord(fixtures, countryId) {
    const r = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    for (const f of fixtures) {
      if (f.status !== 'FT') continue;
      const isHome = f.homeTeamId === countryId;
      const isAway = f.awayTeamId === countryId;
      if (!isHome && !isAway) continue;
      const gf = isHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
      const ga = isHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
      r.p++;
      r.gf += gf;
      r.ga += ga;
      if (gf > ga) r.w++;
      else if (gf === ga) r.d++;
      else r.l++;
    }
    return r;
  }

  #managerAge(dob) {
    if (!dob) return null;
    const born = new Date(dob);
    const ref  = new Date('2026-06-11');
    let age = ref.getFullYear() - born.getFullYear();
    const m = ref.getMonth() - born.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < born.getDate())) age--;
    return age;
  }

  #buildPage(country, data, photoMap, record) {
    const name     = escapeHtml(country.manager);
    const nat      = escapeHtml(country.managerNationality ?? '');
    const age      = this.#managerAge(country.managerDob);
    const fmrPos   = escapeHtml(country.managerFormerPosition ?? '');
    const tenure   = escapeHtml(country.managerTenure ?? '');
    const bio      = escapeHtml(country.managerBio ?? '');
    const initials = escapeHtml(getInitials(country.manager));
    const teamName = escapeHtml(country.name);
    const teamId   = escapeHtml(country.id);
    const flagSrc  = escapeHtml(`assets/flags/${country.id}.svg`);

    const photoKey = `manager-${country.id}`;
    const photoSrc = photoMap[photoKey];
    const photoInner = photoSrc
      ? `<img src="${escapeHtml(photoSrc)}" alt="${name}"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="mgr-photo__initials" aria-hidden="true">${initials}</div>`
      : `<div class="mgr-photo__initials" style="display:flex" aria-hidden="true">${initials}</div>`;

    const meta = [nat, age != null ? `Age ${age}` : null].filter(Boolean).join(' · ');

    const recordHtml = record.p > 0
      ? `<section class="mgr-section">
          <h2 class="mgr-section__title">WC 2026 Record</h2>
          <div class="mgr-record">
            <div class="mgr-record__stat"><span class="mgr-record__val">${record.p}</span><span class="mgr-record__lbl">Played</span></div>
            <div class="mgr-record__stat"><span class="mgr-record__val">${record.w}</span><span class="mgr-record__lbl">Won</span></div>
            <div class="mgr-record__stat"><span class="mgr-record__val">${record.d}</span><span class="mgr-record__lbl">Drawn</span></div>
            <div class="mgr-record__stat"><span class="mgr-record__val">${record.l}</span><span class="mgr-record__lbl">Lost</span></div>
            <div class="mgr-record__stat"><span class="mgr-record__val">${record.gf}–${record.ga}</span><span class="mgr-record__lbl">Goals</span></div>
          </div>
        </section>`
      : '';

    const careerHtml = data?.career?.length
      ? `<details class="mgr-accordion">
          <summary class="mgr-accordion__toggle">Managerial Career</summary>
          <ul class="mgr-career">
            ${data.career.map(c => `
              <li class="mgr-career__item">
                <span class="mgr-career__years">${escapeHtml(c.years)}</span>
                <span class="mgr-career__club">${escapeHtml(c.club)}</span>
              </li>`).join('')}
          </ul>
        </details>`
      : '';

    const playerClubsHtml = data?.playerClubs?.length
      ? `<details class="mgr-accordion">
          <summary class="mgr-accordion__toggle">Playing Career</summary>
          <p class="mgr-player-clubs">${data.playerClubs.map(c => escapeHtml(c)).join(' · ')}</p>
        </details>`
      : '';

    const honoursHtml = data?.honours?.length
      ? `<section class="mgr-section">
          <h2 class="mgr-section__title">Major Honours</h2>
          <ul class="mgr-honours">
            ${data.honours.map(h => `
              <li class="mgr-honour">
                <div class="mgr-honour__main">
                  <span class="mgr-honour__title">${escapeHtml(h.title)}</span>
                  <span class="mgr-honour__year">${escapeHtml(String(h.year))}</span>
                  <span class="mgr-honour__role mgr-honour__role--${escapeHtml(h.role.toLowerCase())}">${escapeHtml(h.role)}</span>
                </div>
                ${h.club ? `<span class="mgr-honour__club">${escapeHtml(h.club)}</span>` : ''}
              </li>`).join('')}
          </ul>
        </section>`
      : '';

    const wikiName = country.manager.replace(/ /g, '_');
    const wikiUrl  = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiName)}`;

    return `
      <div class="page-content mgr-page">
        <a href="#${teamId}" class="mgr-back">← ${teamName}</a>

        <header class="mgr-header">
          <div class="mgr-photo">${photoInner}</div>
          <div class="mgr-header__info">
            <h1 class="mgr-name">${name}</h1>
            ${meta ? `<div class="mgr-meta">${meta}</div>` : ''}
            ${fmrPos ? `<div class="mgr-former-pos">Played as ${fmrPos}</div>` : ''}
            ${tenure ? `<div class="mgr-tenure">In charge: ${tenure}</div>` : ''}
            <a href="#${teamId}" class="mgr-team-link">
              <img src="${flagSrc}" alt="" class="mgr-team-flag" aria-hidden="true">
              Managing: ${teamName}
            </a>
          </div>
        </header>

        ${bio ? `<section class="mgr-section"><p class="mgr-bio">${bio}</p></section>` : ''}

        ${recordHtml}
        ${honoursHtml}

        ${careerHtml || playerClubsHtml
          ? `<section class="mgr-section">
              <h2 class="mgr-section__title">Career</h2>
              ${careerHtml}
              ${playerClubsHtml}
            </section>`
          : ''}

        <p class="mgr-wiki">
          <a href="${escapeHtml(wikiUrl)}" target="_blank" rel="noopener noreferrer">Wikipedia →</a>
        </p>
      </div>`;
  }

  init() {}
  teardown() {}
}
