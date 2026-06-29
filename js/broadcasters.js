/**
 * Broadcaster configuration and shared rendering helper.
 * Adding a broadcaster = one new entry in BROADCASTERS. No rendering code to touch.
 */

export const BROADCASTERS = {
  BBC: {
    label:    'BBC iPlayer',
    href:     'https://www.bbc.co.uk/iplayer/live/bbcone',
    liveHref: 'https://www.bbc.co.uk/iplayer/live/bbcone',
    logo:     'assets/broadcasters/bbc-iplayer.svg',
    mod:      'bbc',
  },
  ITV: {
    label:    'ITVX',
    href:     'https://www.itv.com/watch?channel=itv',
    liveHref: 'https://www.itv.com/watch?channel=itv',
    logo:     'assets/broadcasters/itvx.svg',
    mod:      'itv',
  },
};

/**
 * @param {string|null} broadcaster
 * @param {string}      status      - "FT" | "live" | "NS" | etc.
 * @param {object}      [opts]
 * @param {string}      [opts.extraClass]  - Additional CSS class for the <a>
 * @param {boolean}     [opts.stopProp]    - Add stopPropagation — needed when
 *                                          badge sits inside another <a> (cards)
 */
export function broadcasterBadge(broadcaster, status, opts = {}) {
  if (!broadcaster || status === 'FT') return '';
  const b = BROADCASTERS[broadcaster];
  if (!b) return '';

  const { extraClass = '', stopProp = false } = opts;
  const isLive    = status === 'live';
  const href      = isLive ? b.liveHref : b.href;
  const ariaLabel = isLive ? `Watch live on ${b.label}` : `Available on ${b.label}`;
  const liveChip  = isLive ? `<span class="bc-badge__live">Watch Live</span>` : '';
  const stopAttr  = stopProp ? ' onclick="event.stopPropagation()"' : '';

  return `<a href="${href}" target="_blank" rel="noopener noreferrer"${stopAttr}
             class="bc-badge bc-badge--${b.mod}${isLive ? ' bc-badge--live' : ''}${extraClass ? ' ' + extraClass : ''}"
             aria-label="${ariaLabel}" title="${ariaLabel}"><img src="${b.logo}" alt="${b.label}" class="bc-badge__logo">${liveChip}</a>`;
}
