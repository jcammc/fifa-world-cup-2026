// ─── Radar chart ─────────────────────────────────────────────
// Renders a 5-axis spider chart into a container element.
// data: { attack, midfield, defence, goalkeeping, depth } (values 0–100)

const RADAR_AXES = ['attack', 'midfield', 'defence', 'goalkeeping', 'depth'];
const AXIS_LABELS = {
  attack:      'Attack',
  midfield:    'Midfield',
  defence:     'Defence',
  goalkeeping: 'Keeping',
  depth:       'Depth',
};

function toCart(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function polygonPoints(cx, cy, r, n, offsetDeg = 0) {
  return Array.from({ length: n }, (_, i) => {
    const p = toCart(cx, cy, r, offsetDeg + (360 / n) * i);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');
}

export const Charts = {
  renderRadar(container, data) {
    const SIZE   = 280;
    const CX     = SIZE / 2;
    const CY     = SIZE / 2;
    const MAX_R  = 95;
    const LBL_R  = MAX_R * 1.28;
    const n      = RADAR_AXES.length;
    const step   = 360 / n;

    // Background grid rings at 25 / 50 / 75 / 100 %
    const rings = [0.25, 0.5, 0.75, 1].map(frac =>
      `<polygon points="${polygonPoints(CX, CY, MAX_R * frac, n)}"
               fill="none" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="${frac < 1 ? '3 3' : ''}"/>`
    ).join('');

    // Axis spokes
    const spokes = RADAR_AXES.map((_, i) => {
      const p = toCart(CX, CY, MAX_R, step * i);
      return `<line x1="${CX}" y1="${CY}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}"
                   stroke="var(--color-border)" stroke-width="1"/>`;
    }).join('');

    // Labels
    const labels = RADAR_AXES.map((key, i) => {
      const p      = toCart(CX, CY, LBL_R, step * i);
      const anchor = p.x < CX - 6 ? 'end' : p.x > CX + 6 ? 'start' : 'middle';
      const dy     = p.y < CY ? '-0.3em' : '0.85em';
      return `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" dy="${dy}"
                   text-anchor="${anchor}"
                   font-size="11" font-family="inherit"
                   fill="var(--color-text-secondary)">${AXIS_LABELS[key]}</text>`;
    }).join('');

    // Data polygon
    const dataPts = RADAR_AXES.map((key, i) => {
      const val = Math.min(100, Math.max(0, data[key] ?? 0)) / 100;
      const p   = toCart(CX, CY, MAX_R * val, step * i);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(' ');

    // Data dots
    const dots = RADAR_AXES.map((key, i) => {
      const val = Math.min(100, Math.max(0, data[key] ?? 0)) / 100;
      const p   = toCart(CX, CY, MAX_R * val, step * i);
      return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="4"
                     fill="var(--color-accent)" stroke="var(--color-bg-card)" stroke-width="2"/>`;
    }).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="Team strength radar chart">
        ${rings}
        ${spokes}
        <polygon points="${dataPts}"
                 fill="var(--color-accent)" fill-opacity="0.18"
                 stroke="var(--color-accent)" stroke-width="2" stroke-linejoin="round"/>
        ${dots}
        ${labels}
      </svg>`;
  },

  renderBar(container, data) {},
  renderSparkline(container, data) {},
};
