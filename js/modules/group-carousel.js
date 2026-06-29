import { escapeHtml } from '../utils.js';
import { formatKickoff } from '../time.js';

export class GroupCarousel {
  #container;
  #groups;
  #standings;
  #fixtures;
  #countryMap;
  #carouselEl = null;
  #scrollRaf  = null;

  constructor(container, groups, standings, fixtures, countryMap) {
    this.#container  = container;
    this.#groups     = groups;
    this.#standings  = standings;
    this.#fixtures   = fixtures;
    this.#countryMap = countryMap;
  }

  render() {
    const standingsMap = new Map(this.#standings.map(s => [s.groupId, s.teams]));
    const fixturesMap  = new Map();
    for (const f of this.#fixtures) {
      if (!fixturesMap.has(f.groupId)) fixturesMap.set(f.groupId, []);
      fixturesMap.get(f.groupId).push(f);
    }

    const total = this.#groups.length;
    const cards = this.#groups
      .map(g => this.#buildGroupCard(g, standingsMap.get(g.id), fixturesMap.get(g.id) ?? []))
      .join('');

    this.#container.innerHTML = `
      <div class="group-stage-carousel">
        <div class="carousel-nav">
          <button class="carousel-arrow carousel-arrow--prev" id="group-prev"
                  aria-label="Previous group" type="button" disabled>&#8249;</button>
          <span class="carousel-counter" aria-live="polite">1 / ${total}</span>
          <button class="carousel-arrow carousel-arrow--next" id="group-next"
                  aria-label="Next group" type="button">&#8250;</button>
        </div>
        <div class="group-carousel" id="group-carousel"
             role="region" aria-label="Group standings carousel">
          ${cards}
        </div>
      </div>`;
  }

  init() {
    this.#carouselEl = this.#container.querySelector('#group-carousel');
    this.#initArrows();
    this.#initDragScroll();
    this.#initWheelScroll();
  }

  // ─── Card builders ────────────────────────────────────────

  #buildGroupCard(group, teams, groupFixtures) {
    const hasData = teams?.length > 0;
    return `
      <article class="group-card" data-group="${escapeHtml(group.id)}" aria-label="${escapeHtml(group.name)}">
        <h2 class="group-card__title">${escapeHtml(group.name)}</h2>
        ${hasData ? this.#buildStandingsTable(teams) : this.#buildNoData()}
        ${hasData ? this.#buildFixturesStrip(groupFixtures) : ''}
      </article>`;
  }

  #qualBadge(status) {
    if (status === 'qualified')  return `<span class="badge badge--qualified badge--compact" title="Qualified">Q</span>`;
    if (status === 'eliminated') return `<span class="badge badge--eliminated badge--compact" title="Eliminated">E</span>`;
    if (status === 'playoff')    return `<span class="badge badge--possible badge--compact" title="Playoff">PO</span>`;
    return '';
  }

  #buildStandingsTable(teams) {
    const rows = teams.map(t => {
      const country = this.#countryMap.get(t.teamId);
      const name    = escapeHtml(country?.name ?? t.teamId);
      const id      = escapeHtml(t.teamId);
      const gd      = t.goalDifference >= 0 ? `+${t.goalDifference}` : String(t.goalDifference);
      const badge   = this.#qualBadge(t.qualificationStatus);
      return `
        <tr>
          <td class="standings-col--pos">${t.position}</td>
          <td class="standings-col--team">
            <img src="assets/flags/${id}.svg" alt="" width="16" height="11"
                 class="standings-flag" aria-hidden="true"
                 onerror="this.style.display='none'">
            <a href="#${id}" class="standings-team-name">${name}</a>
            ${badge}
          </td>
          <td>${t.played}</td>
          <td>${t.won}</td>
          <td>${t.drawn}</td>
          <td>${t.lost}</td>
          <td>${t.goalsFor}</td>
          <td>${t.goalsAgainst}</td>
          <td class="standings-col--gd">${gd}</td>
          <td class="standings-col--pts"><strong>${t.points}</strong></td>
        </tr>`;
    }).join('');

    return `
      <table class="standings-table" aria-label="Group standings">
        <thead>
          <tr>
            <th></th>
            <th class="standings-col--team">Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Goals For">GF</th>
            <th title="Goals Against">GA</th>
            <th title="Goal Difference">GD</th>
            <th title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  #buildFixturesStrip(groupFixtures) {
    const completed = groupFixtures.filter(f => f.status === 'FT');
    const upcoming  = groupFixtures.filter(f => f.status !== 'FT').slice(0, 2);
    const toShow    = completed.length ? [...completed, ...upcoming] : upcoming;
    if (!toShow.length) return '';
    return `<div class="group-card__fixtures">${toShow.map(f => this.#buildFixtureLine(f)).join('')}</div>`;
  }

  #buildFixtureLine(f) {
    const home     = this.#countryMap.get(f.homeTeamId);
    const away     = this.#countryMap.get(f.awayTeamId);
    const homeName = escapeHtml(home?.name ?? f.homeTeamId);
    const awayName = escapeHtml(away?.name ?? f.awayTeamId);
    const homeId   = escapeHtml(f.homeTeamId);
    const awayId   = escapeHtml(f.awayTeamId);

    const middle = f.status === 'FT'
      ? `<span class="gc-fixture__score">${f.homeScore}&ndash;${f.awayScore}</span>`
      : `<span class="gc-fixture__time">${escapeHtml(formatKickoff(f.kickoff))}</span>`;

    const extras = [
      f.status === 'FT' ? `<span class="badge badge--ft gc-fixture__badge">FT</span>` : '',
      f.broadcaster
        ? `<span class="badge badge--broadcaster badge--${escapeHtml(f.broadcaster.toLowerCase())}">${escapeHtml(f.broadcaster)}</span>`
        : '',
    ].filter(Boolean).join('');

    return `
      <a href="#match/${escapeHtml(f.id)}" class="gc-fixture">
        <span class="gc-fixture__team gc-fixture__team--home">${homeName}</span>
        ${middle}
        <span class="gc-fixture__team gc-fixture__team--away">${awayName}</span>
        ${extras ? `<span class="gc-fixture__extras">${extras}</span>` : ''}
      </a>`;
  }

  #buildNoData() {
    return `<div class="group-card__no-data"><p>Fixtures &amp; standings available soon</p></div>`;
  }

  // ─── Arrow navigation ─────────────────────────────────────

  #initArrows() {
    const carousel = this.#carouselEl;
    const prev     = this.#container.querySelector('#group-prev');
    const next     = this.#container.querySelector('#group-next');
    const counter  = this.#container.querySelector('.carousel-counter');
    if (!carousel) return;

    const go = (dir) => {
      const cards = carousel.querySelectorAll('.group-card');
      const gap   = parseFloat(getComputedStyle(carousel).columnGap) || 16;
      const cardW = (cards[0]?.offsetWidth ?? 0) + gap;
      const cur   = cardW > 0 ? Math.round(carousel.scrollLeft / cardW) : 0;
      const tgt   = Math.max(0, Math.min(cards.length - 1, cur + dir));
      carousel.scrollTo({ left: tgt * cardW, behavior: 'smooth' });
    };

    const update = () => {
      const cards = carousel.querySelectorAll('.group-card');
      const gap   = parseFloat(getComputedStyle(carousel).columnGap) || 16;
      const cardW = (cards[0]?.offsetWidth ?? 0) + gap;
      const idx   = cardW > 0 ? Math.round(carousel.scrollLeft / cardW) : 0;
      if (prev)    prev.disabled       = idx === 0;
      if (next)    next.disabled       = idx === cards.length - 1;
      if (counter) counter.textContent = `${idx + 1} / ${cards.length}`;
    };

    prev?.addEventListener('click', () => go(-1));
    next?.addEventListener('click', () => go(1));

    carousel.addEventListener('scroll', () => {
      cancelAnimationFrame(this.#scrollRaf);
      this.#scrollRaf = requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  // ─── Drag scroll ──────────────────────────────────────────

  #initDragScroll() {
    const carousel = this.#carouselEl;
    if (!carousel) return;

    let isDown = false, isDragging = false, startX = 0, scrollLeft = 0, activePointerId = null;

    carousel.addEventListener('pointerdown', e => {
      isDown          = true;
      isDragging      = false;
      activePointerId = e.pointerId;
      startX          = e.pageX - carousel.offsetLeft;
      scrollLeft      = carousel.scrollLeft;
      // Capture and drag-class deferred to first pointermove past threshold,
      // so that clicks on child links are not suppressed by scroll mutation.
    });

    carousel.addEventListener('pointermove', e => {
      if (!isDown) return;
      const x    = e.pageX - carousel.offsetLeft;
      const dist = Math.abs(x - startX);
      if (!isDragging) {
        if (dist < 5) return;
        isDragging = true;
        carousel.setPointerCapture(activePointerId);
        carousel.classList.add('is-dragging');
      }
      carousel.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });

    const stop = () => {
      isDown          = false;
      isDragging      = false;
      activePointerId = null;
      carousel.classList.remove('is-dragging');
    };
    carousel.addEventListener('pointerup',     stop);
    carousel.addEventListener('pointercancel', stop);
  }

  // ─── Public API ──────────────────────────────────────────

  /**
   * Refresh standings and fixtures without losing the user's scroll position.
   * Option B: controlled re-render that preserves position by restoring scrollLeft.
   * Evolves naturally toward Option A (targeted DOM updates) per-card later.
   */
  update(standings, fixtures) {
    if (!this.#carouselEl) return;
    this.#standings = standings;
    this.#fixtures  = fixtures;

    const savedScroll = this.#carouselEl.scrollLeft;

    const standingsMap = new Map(standings.map(s => [s.groupId, s.teams]));
    const fixturesMap  = new Map();
    for (const f of fixtures) {
      if (!fixturesMap.has(f.groupId)) fixturesMap.set(f.groupId, []);
      fixturesMap.get(f.groupId).push(f);
    }

    const cards = this.#carouselEl.querySelectorAll('.group-card');
    for (const card of cards) {
      const groupId = card.dataset.group;
      const group   = this.#groups.find(g => g.id === groupId);
      if (!group) continue;
      const teams         = standingsMap.get(groupId);
      const groupFixtures = fixturesMap.get(groupId) ?? [];
      const hasData       = teams?.length > 0;
      card.innerHTML = `
        <h2 class="group-card__title">${escapeHtml(group.name)}</h2>
        ${hasData ? this.#buildStandingsTable(teams) : this.#buildNoData()}
        ${hasData ? this.#buildFixturesStrip(groupFixtures) : ''}`;
    }

    this.#carouselEl.scrollLeft = savedScroll;
  }

  scrollToGroup(groupId) {
    const carousel = this.#carouselEl;
    if (!carousel) return;
    const cards = [...carousel.querySelectorAll('.group-card')];
    const card  = carousel.querySelector(`.group-card[data-group="${groupId}"]`);
    if (!card) return;
    const idx  = cards.indexOf(card);
    if (idx === -1) return;
    const gap  = parseFloat(getComputedStyle(carousel).columnGap) || 16;
    const cardW = (cards[0]?.offsetWidth ?? 0) + gap;
    carousel.scrollTo({ left: idx * cardW, behavior: 'instant' });
  }

  // ─── Wheel redirect to horizontal ─────────────────────────

  #initWheelScroll() {
    this.#carouselEl?.addEventListener('wheel', e => {
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        this.#carouselEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  teardown() {
    cancelAnimationFrame(this.#scrollRaf);
    this.#scrollRaf = null;
  }
}
