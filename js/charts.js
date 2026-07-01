// ─── Shared helpers ──────────────────────────────────────────

function xmlEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

  // ─── Lineup pitch graphic ───────────────────────────────────
  // Renders a portrait SVG pitch with player nodes for a single team.
  // formation: "4-3-3" string; players: [{ name, shirt, pos }]
  renderLineup(container, formation, players) {
    if (!formation || !players?.length) { container.innerHTML = ''; return; }

    const W = 240, H = 340, PAD_X = 20, PAD_Y = 24;
    const PITCH_W = W - PAD_X * 2;
    const PITCH_H = H - PAD_Y * 2;
    const R = 13;

    const tierCounts = [1, ...formation.split('-').map(Number)];
    const nTiers = tierCounts.length;

    const POS_TIER = {
      GK: 0,
      CB: 1, CD: 1, SW: 1, LB: 1, RB: 1, LWB: 1, RWB: 1, WB: 1,
      DM: 2, CDM: 2, CM: 2, MF: 2, LM: 2, RM: 2, AM: 2, CAM: 2, OM: 2,
      CF: nTiers - 1, ST: nTiers - 1, SS: nTiers - 1, FW: nTiers - 1,
      LW: nTiers - 1, RW: nTiers - 1, LF: nTiers - 1, RF: nTiers - 1, WF: nTiers - 1,
    };

    const POS_LATERAL = {
      LB: 0, LWB: 0, LW: 0, LM: 0, LF: 0,
      RB: 1, RWB: 1, RW: 1, RM: 1, RF: 1,
    };

    const tiers = tierCounts.map(() => []);
    for (const p of players) {
      const t = Math.min(POS_TIER[p.pos] ?? (nTiers > 2 ? 2 : 1), nTiers - 1);
      tiers[t].push(p);
    }

    for (const tier of tiers) {
      tier.sort((a, b) => (POS_LATERAL[a.pos] ?? 0.5) - (POS_LATERAL[b.pos] ?? 0.5));
    }

    let nodes = '';
    for (let ti = 0; ti < nTiers; ti++) {
      const tierPlayers = tiers[ti];
      if (!tierPlayers.length) continue;
      const n = tierPlayers.length;
      const frac = nTiers > 1 ? ti / (nTiers - 1) : 0.5;
      const y = PAD_Y + PITCH_H * (1 - frac);
      for (let pi = 0; pi < n; pi++) {
        const p = tierPlayers[pi];
        const xFrac = n > 1 ? pi / (n - 1) : 0.5;
        const x = PAD_X + PITCH_W * xFrac;
        const surname = xmlEsc((p.name ?? '').split(' ').pop().slice(0, 11));
        const shirt   = xmlEsc(String(p.shirt ?? ''));
        nodes += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
          <circle r="${R}" fill="var(--color-lineup-pitch)" stroke="#fff" stroke-width="2"/>
          <text y="0.38em" text-anchor="middle" font-size="8" font-weight="700" fill="#fff" font-family="inherit">${shirt}</text>
          <text y="${R + 9}" text-anchor="middle" font-size="6.5" fill="var(--color-text)" font-family="inherit">${surname}</text>
        </g>`;
      }
    }

    const halfY   = (H / 2).toFixed(1);
    const boxL    = (PAD_X + PITCH_W * 0.18).toFixed(1);
    const boxW    = (PITCH_W * 0.64).toFixed(1);
    const boxH    = (PITCH_H * 0.22).toFixed(1);
    const markings = `
      <rect width="${W}" height="${H}" fill="var(--color-lineup-pitch-bg)" rx="4"/>
      <line x1="${PAD_X}" y1="${halfY}" x2="${W - PAD_X}" y2="${halfY}" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
      <rect x="${boxL}" y="${(H - PAD_Y - Number(boxH)).toFixed(1)}" width="${boxW}" height="${boxH}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <rect x="${boxL}" y="${PAD_Y}" width="${boxW}" height="${boxH}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`;

    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Starting lineup">${markings}${nodes}</svg>`;
  },

  renderBar(container, data) {},
  renderSparkline(container, data) {},
};
