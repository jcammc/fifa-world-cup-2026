/* ─── XSS-safe HTML template tag ────────────────────────── */

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Tagged template literal for safe HTML generation.
 * Escapes all interpolated values. Use for leaf renders where
 * values come from data. Compose larger templates with plain
 * string concatenation, calling escapeHtml() on data values.
 */
export function html(strings, ...values) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += escapeHtml(String(values[i] ?? ''));
    result += strings[i + 1];
  }
  return result;
}

/* ─── String / formatting ────────────────────────────────── */

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getInitials(name) {
  if (!name) return '?';
  return String(name).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatCurrency(value) {
  if (value == null || value === 0) return '—';
  if (value >= 1_000_000_000) return `€${(value / 1_000_000_000).toFixed(2)}bn`;
  if (value >= 1_000_000)     return `€${(value / 1_000_000).toFixed(0)}m`;
  return `€${value.toLocaleString('en-GB')}`;
}

/* ─── Function helpers ───────────────────────────────────── */

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/* ─── Scroll helpers ─────────────────────────────────────── */

export function waitForScrollEnd(el) {
  return new Promise(resolve => {
    let timer;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        el.removeEventListener('scroll', handler);
        resolve();
      }, 100);
    };
    el.addEventListener('scroll', handler, { passive: true });
    // Resolve immediately if no scroll starts within 100ms
    timer = setTimeout(() => {
      el.removeEventListener('scroll', handler);
      resolve();
    }, 100);
  });
}
