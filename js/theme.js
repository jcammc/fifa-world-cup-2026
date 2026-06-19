export const ThemeManager = {
  init() {
    const saved = localStorage.getItem('theme') ?? 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  },
  get current() {
    return document.documentElement.getAttribute('data-theme');
  }
};
