export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString();
}

export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(value) {
  if (!value) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);
}

export function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
