const LONDON_TZ = 'Europe/London';

export function timezoneLabel() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TZ,
    timeZoneName: 'short',
  }).formatToParts(new Date());
  return parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
}

export function formatKickoff(utcString) {
  if (!utcString) return '—';
  const date = new Date(utcString);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TZ,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${fmt.format(date)} ${timezoneLabel()}`;
}

export function formatKickoffShort(utcString) {
  if (!utcString) return '—';
  const date = new Date(utcString);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${fmt.format(date)} ${timezoneLabel()}`;
}

export function formatDate(utcString) {
  if (!utcString) return '—';
  const date = new Date(utcString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function isToday(utcString) {
  if (!utcString) return false;
  // Use en-CA for YYYY-MM-DD format, reliable for date comparison
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: LONDON_TZ });
  return fmt.format(new Date()) === fmt.format(new Date(utcString));
}

export function getNextMatchday(fixtures) {
  const now = Date.now();
  const upcoming = fixtures
    .filter(f => f.status === 'scheduled' && new Date(f.kickoff).getTime() > now)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  return upcoming[0]?.kickoff ?? null;
}
