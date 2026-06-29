/**
 * Broadcaster configuration and shared rendering helper.
 * Adding a broadcaster = one new entry in BROADCASTERS. No rendering code to touch.
 */

export const BROADCASTERS = {
  BBC: {
    label:    'BBC iPlayer',
    href:     'https://www.bbc.co.uk/iplayer/live/bbcone',
    liveHref: 'https://www.bbc.co.uk/iplayer/live/bbcone',
    logo:     'assets/broadcasters/bbc-iplayer.png',
    mod:      'bbc',
  },
  ITV: {
    label:    'ITVX',
    href:     'https://www.itv.com/watch?channel=itv',
    liveHref: 'https://www.itv.com/watch?channel=itv',
    logo:     'assets/broadcasters/itvx.png',
    mod:      'itv',
  },
};

/**
 * Non-interactive icon for use INSIDE clickable cards (rail, strip, carousel).
 * Returns a <span><img></span> — valid HTML inside an <a>.
 * Use broadcasterBadge() instead when the icon itself should be a link.
 */
export function broadcasterIcon(broadcaster, status) {
  if (!broadcaster || status === 'FT') return '';
  const b = BROADCASTERS[broadcaster];
  if (!b) return '';
  const href = status === 'live' ? b.liveHref : b.href;
  return `<span class="bc-icon bc-icon--${b.mod}" role="link" tabindex="0" aria-label="Watch on ${b.label}" title="Watch on ${b.label}" onclick="event.stopPropagation();window.open('${href}','_blank','noopener,noreferrer')"><img src="${b.logo}" alt="${b.label}" class="bc-icon__logo"></span>`;
}

/**
 * Clickable badge — use only when NOT inside another <a>.
 * (Match Centre header is the only current use-site.)
 *
 * @param {string|null} broadcaster
 * @param {string}      status      - "FT" | "live" | "NS" | etc.
 * @param {object}      [opts]
 * @param {string}      [opts.extraClass]  - Additional CSS class for the <a>
 */
export function broadcasterBadge(broadcaster, status, opts = {}) {
  if (!broadcaster || status === 'FT') return '';
  const b = BROADCASTERS[broadcaster];
  if (!b) return '';

  const { extraClass = '' } = opts;
  const isLive    = status === 'live';
  const href      = isLive ? b.liveHref : b.href;
  const ariaLabel = isLive ? `Watch live on ${b.label}` : `Available on ${b.label}`;
  const liveChip  = isLive ? `<span class="bc-badge__live">Watch Live</span>` : '';

  return `<a href="${href}" target="_blank" rel="noopener noreferrer"
             class="bc-badge bc-badge--${b.mod}${isLive ? ' bc-badge--live' : ''}${extraClass ? ' ' + extraClass : ''}"
             aria-label="${ariaLabel}" title="${ariaLabel}"><img src="${b.logo}" alt="${b.label}" class="bc-badge__logo">${liveChip}</a>`;
}
