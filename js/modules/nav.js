import { ThemeManager } from '../theme.js';

const NAV_SECTIONS = [
  {
    title: 'Browse',
    links: [
      { href: '#countries',   icon: '🌍', label: 'Countries' },
      { href: '#continents',  icon: '🗺️', label: 'Continents' },
    ],
  },
  {
    title: 'Tournament',
    links: [
      { href: '#tournament',  icon: '🏆', label: 'Tournament Centre' },
    ],
  },
  {
    title: 'Analysis',
    links: [
      { href: '#compare',     icon: '⚖️', label: 'Compare Teams' },
      { href: '#statistics',  icon: '📊', label: 'Statistics' },
    ],
  },
  {
    title: 'Football',
    links: [
      { href: '#club-explorer',   icon: '🏅', label: 'Club Explorer' },
      { href: '#league-explorer', icon: '📋', label: 'League Explorer' },
    ],
  },
];

function buildNavSections() {
  return NAV_SECTIONS.map(section => `
    <div class="nav-section">
      <span class="nav-section__title">${section.title}</span>
      ${section.links.map(link => `
        <a href="${link.href}" class="nav-link">
          <span class="nav-link__icon" aria-hidden="true">${link.icon}</span>
          <span class="nav-link__label">${link.label}</span>
        </a>`).join('')}
    </div>`).join('');
}

class _Nav {
  #backdrop = null;

  render() {
    const headerEl  = document.getElementById('app-header');
    const sidebarEl = document.getElementById('app-sidebar');
    const drawerEl  = document.getElementById('app-drawer');

    if (headerEl) {
      headerEl.innerHTML = `
        <div class="header-inner">
          <button class="hamburger" id="drawer-toggle"
                  aria-label="Open navigation menu" aria-expanded="false">☰</button>
          <a href="#tournament" class="app-logo">
            <span class="app-logo__icon" aria-hidden="true">⚽</span>
            <span class="app-logo__text">World Cup 2026</span>
          </a>
          <div class="header-actions">
            <button class="btn-icon" id="search-trigger"
                    aria-label="Search (Ctrl+K)" title="Search (Ctrl+K)">🔍</button>
            <button class="btn-icon" id="theme-toggle"
                    aria-label="Toggle theme">🌙</button>
          </div>
        </div>`;
    }

    if (sidebarEl) {
      sidebarEl.innerHTML = `<div class="nav-inner">${buildNavSections()}</div>`;
    }

    if (drawerEl) {
      drawerEl.innerHTML = `
        <div class="drawer-header">
          <span class="app-logo">
            <span class="app-logo__icon" aria-hidden="true">⚽</span>
          </span>
          <button class="drawer-close" id="drawer-close" aria-label="Close menu">✕</button>
        </div>
        <div class="nav-inner">${buildNavSections()}</div>`;
    }

    // Backdrop for drawer overlay
    this.#backdrop = document.createElement('div');
    this.#backdrop.className = 'drawer-backdrop';
    this.#backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.#backdrop);

    this.#syncThemeIcon();
  }

  init() {
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      ThemeManager.toggle();
      this.#syncThemeIcon();
    });

    document.getElementById('drawer-toggle')?.addEventListener('click', () => this.#openDrawer());
    document.getElementById('drawer-close')?.addEventListener('click',  () => this.#closeDrawer());
    this.#backdrop?.addEventListener('click', () => this.#closeDrawer());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.#closeDrawer();
    });

    // Close drawer when a nav link is clicked inside it
    document.getElementById('app-drawer')?.addEventListener('click', e => {
      if (e.target.closest('.nav-link')) this.#closeDrawer();
    });

    window.addEventListener('hashchange', () => this.#updateActiveLink());
    this.#updateActiveLink();
  }

  teardown() {}

  #openDrawer() {
    const drawer = document.getElementById('app-drawer');
    const toggle = document.getElementById('drawer-toggle');
    drawer?.classList.add('drawer--open');
    drawer?.removeAttribute('aria-hidden');
    this.#backdrop?.classList.add('backdrop--visible');
    toggle?.setAttribute('aria-expanded', 'true');
    document.getElementById('drawer-close')?.focus();
  }

  #closeDrawer() {
    const drawer = document.getElementById('app-drawer');
    const toggle = document.getElementById('drawer-toggle');
    drawer?.classList.remove('drawer--open');
    drawer?.setAttribute('aria-hidden', 'true');
    this.#backdrop?.classList.remove('backdrop--visible');
    toggle?.setAttribute('aria-expanded', 'false');
  }

  #syncThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const isDark = ThemeManager.current === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
  }

  #updateActiveLink() {
    const hash = window.location.hash.slice(1);
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('nav-link--active'));
    const isTc = !hash || hash === 'tournament' || hash === 'today' || hash === 'knockout' || /^group-[a-l]$/.test(hash);
    const href = isTc ? '#tournament'
      : hash.startsWith('compare/') ? '#compare'
      : hash.startsWith('club/') ? '#club-explorer'
      : `#${hash}`;
    document.querySelector(`.nav-link[href="${href}"]`)?.classList.add('nav-link--active');
  }
}

export const Nav = new _Nav();
