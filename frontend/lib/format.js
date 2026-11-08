export const SEVERITY = {
  C: { key: 'C', label: 'Critical', tone: 'crit', rank: 4 },
  E: { key: 'E', label: 'Error', tone: 'err', rank: 3 },
  W: { key: 'W', label: 'Warning', tone: 'warn', rank: 2 },
  I: { key: 'I', label: 'Info', tone: 'info', rank: 1 }
};

export const TONE_CLASS = {
  crit: 'bg-crit/12 text-crit ring-crit/25',
  err: 'bg-err/12 text-err ring-err/25',
  warn: 'bg-warn/12 text-warn ring-warn/25',
  info: 'bg-info/12 text-info ring-info/25'
};

export const TONE_HEX = { crit: '#ff5a5f', err: '#ff9140', warn: '#e9c34a', info: '#62a0ff' };

export function compact(value) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
}

export function integer(value) {
  return new Intl.NumberFormat('en').format(Number(value || 0));
}

export function relativeTime(iso, now = Date.now()) {
  if (!iso) return '';
  const diff = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function tzAbbrev(tz) {
  return ({ 'US/Pacific': 'PT', 'Europe/London': 'GMT', 'Asia/Kolkata': 'IST', 'Asia/Tokyo': 'JST' })[tz] || tz || '';
}

export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
