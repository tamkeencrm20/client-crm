import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ar';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

/** Read a { ar, en } field in the active locale, falling back to the other. */
export function bilingual(value, locale) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.ar || value.en || '';
}

export const formatDate = (d, locale = 'ar') => (d ? dayjs(d).locale(locale).format('D MMM YYYY') : '—');

export const formatDateTime = (d, locale = 'ar') =>
  d ? dayjs(d).locale(locale).format('D MMM YYYY · HH:mm') : '—';

export const fromNow = (d, locale = 'ar') => (d ? dayjs(d).locale(locale).fromNow() : '—');

/** Digits only, for tel: and wa.me links. */
export const phoneDigits = (phone) => String(phone ?? '').replace(/\D/g, '');

/** +971 50 123 4567 */
export function formatPhone(phone) {
  const d = phoneDigits(phone);
  if (!d) return '—';
  if (d.startsWith('971')) {
    const rest = d.slice(3);
    const m = rest.match(/^(\d{2})(\d{3})(\d{4})$/);
    if (m) return `+971 ${m[1]} ${m[2]} ${m[3]}`;
  }
  return `+${d}`;
}

export function formatMoney(amount, locale = 'ar', currency = 'AED') {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export const formatNumber = (n, locale = 'ar') =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE').format(Number(n ?? 0));

/** Minutes as a human duration: 45 -> "45 min", 130 -> "2h 10m" */
export function formatMinutes(minutes, t) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${Math.round(minutes)} ${t('common.min')}`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Two-letter monogram for the avatar circle. */
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** Is a follow-up date in the past, today, or later? */
export function followUpState(date) {
  if (!date) return null;
  const d = dayjs(date);
  if (d.isBefore(dayjs(), 'minute')) return 'overdue';
  if (d.isSame(dayjs(), 'day')) return 'today';
  return 'upcoming';
}
