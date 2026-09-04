/**
 * Mirrors server/src/config/constants.js. The identifiers must stay byte-for-byte
 * identical to the backend enums; the labels live in the i18n files.
 */

export const ROLES = {
  ADMIN: 'admin',
  TEAM_LEADER: 'team_leader',
  AGENT: 'agent',
};

export const ROLE_RANK = { agent: 1, team_leader: 2, admin: 3 };

export const isLeader = (user) => ROLE_RANK[user?.role] >= 2;
export const isAdmin = (user) => user?.role === ROLES.ADMIN;

export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  INTERESTED: 'interested',
  FOLLOW_UP: 'follow_up',
  ENROLLED: 'enrolled',
  NOT_INTERESTED: 'not_interested',
  NO_RESPONSE: 'no_response',
  CLOSED: 'closed',
};

/** Pipeline order used by the board columns and the status filter chips. */
export const PIPELINE_ORDER = [
  LEAD_STATUS.NEW,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.INTERESTED,
  LEAD_STATUS.FOLLOW_UP,
  LEAD_STATUS.ENROLLED,
  LEAD_STATUS.NO_RESPONSE,
  LEAD_STATUS.NOT_INTERESTED,
  LEAD_STATUS.CLOSED,
];

export const TERMINAL_STATUSES = [LEAD_STATUS.ENROLLED, LEAD_STATUS.NOT_INTERESTED, LEAD_STATUS.CLOSED];

/** Kept in sync with STATUS_TRANSITIONS on the server so the UI only offers legal moves. */
export const STATUS_TRANSITIONS = {
  new: ['contacted', 'no_response', 'not_interested', 'closed'],
  contacted: ['interested', 'follow_up', 'not_interested', 'no_response', 'enrolled', 'closed'],
  interested: ['follow_up', 'enrolled', 'not_interested', 'no_response', 'closed'],
  follow_up: ['contacted', 'interested', 'enrolled', 'not_interested', 'no_response', 'closed'],
  no_response: ['contacted', 'follow_up', 'not_interested', 'closed'],
  not_interested: ['contacted', 'follow_up', 'closed'],
  enrolled: ['closed'],
  closed: ['contacted', 'follow_up'],
};

/** Tailwind classes per status — one place, so the badge and the board agree. */
export const STATUS_STYLES = {
  new: { chip: 'bg-sky-100 text-sky-800 ring-sky-200', dot: 'bg-sky-500', bar: '#0ea5e9' },
  contacted: { chip: 'bg-indigo-100 text-indigo-800 ring-indigo-200', dot: 'bg-indigo-500', bar: '#6366f1' },
  interested: { chip: 'bg-violet-100 text-violet-800 ring-violet-200', dot: 'bg-violet-500', bar: '#8b5cf6' },
  follow_up: { chip: 'bg-amber-100 text-amber-800 ring-amber-200', dot: 'bg-amber-500', bar: '#f59e0b' },
  enrolled: { chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500', bar: '#10b981' },
  no_response: { chip: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400', bar: '#94a3b8' },
  not_interested: { chip: 'bg-rose-100 text-rose-800 ring-rose-200', dot: 'bg-rose-500', bar: '#f43f5e' },
  closed: { chip: 'bg-stone-100 text-stone-700 ring-stone-200', dot: 'bg-stone-400', bar: '#a8a29e' },
};

export const LEAD_SOURCES = [
  'meta_facebook',
  'meta_instagram',
  'website',
  'walk_in',
  'phone',
  'referral',
  'import',
  'manual',
];

export const ACTIVITY_TYPES = ['call', 'whatsapp', 'email', 'meeting', 'note'];

export const CALL_OUTCOMES = ['answered', 'no_answer', 'busy', 'wrong_number', 'switched_off'];

export const DISTRIBUTION_STRATEGIES = ['round_robin', 'least_loaded', 'manual'];

/** Brand palette, for charts that cannot read Tailwind classes. */
export const CHART_COLORS = ['#006473', '#f76a0c', '#36748b', '#997d40', '#4499ad', '#fd7f3a', '#71bac9'];
