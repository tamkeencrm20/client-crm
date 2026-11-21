/**
 * Mirrors server/src/config/constants.js. The identifiers must stay byte-for-byte
 * identical to the backend enums; the labels live in the i18n files.
 */

export const ROLES = {
  ADMIN: 'admin',
  TEAM_LEADER: 'team_leader',
  MEDIA_BUYER: 'media_buyer',
  AGENT: 'agent',
};

export const ROLE_RANK = { agent: 1, media_buyer: 2, team_leader: 3, admin: 4 };

export const isAdmin = (user) => user?.role === ROLES.ADMIN;
export const isMediaBuyer = (user) => user?.role === ROLES.MEDIA_BUYER;

/** Team leaders and admins: the roles that own the sales team and the pipeline. */
export const isLeader = (user) => ROLE_RANK[user?.role] >= ROLE_RANK.team_leader;

/** Everyone who reads a whole branch rather than a personal list. */
export const seesBranch = (user) => ROLE_RANK[user?.role] >= ROLE_RANK.media_buyer;

/** Who may configure the ad platforms. */
export const managesPlatforms = (user) => isMediaBuyer(user) || isAdmin(user);

/** A media buyer reads the pipeline but never writes to it. */
export const canEditLeads = (user) => !isMediaBuyer(user);

/**
 * Who may bring leads in from a spreadsheet.
 *
 * Wider than canEditLeads on purpose. A media buyer is kept out of the
 * pipeline because the person who buys the traffic should not be the one
 * grading it — but that argument is about judging an outcome, not about
 * carrying a list in. Media buyers are usually the ones holding an export
 * from a platform, and making them forward it to someone else to upload only
 * delays the call. The server grants them their own branch and nothing wider,
 * just as it pins an agent's upload to that agent's own book.
 */
export const canImportLeads = (user) => Boolean(user);

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
  'tiktok',
  'snapchat',
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

/** The ad networks the CRM ingests from, with the colour each one is known by. */
export const AD_PLATFORMS = ['meta', 'tiktok', 'snapchat'];

export const PLATFORM_STYLES = {
  meta: { chip: 'bg-[#0866FF]/10 text-[#0b5ed7] ring-[#0866FF]/25', bar: '#0866FF', dot: 'bg-[#0866FF]' },
  tiktok: { chip: 'bg-slate-900/8 text-slate-800 ring-slate-900/20', bar: '#111827', dot: 'bg-slate-900' },
  snapchat: { chip: 'bg-[#FFFC00]/25 text-[#8a7a00] ring-[#d6c800]/40', bar: '#E4C700', dot: 'bg-[#E4C700]' },
};

/** Outcome of a single row in a spreadsheet import. */
export const IMPORT_ROW_STATUS = { CREATED: 'created', DUPLICATE: 'duplicate', INVALID: 'invalid' };

export const IMPORT_MAX_ROWS = 5000;

/**
 * Column headings the server recognises, shown in the import dialog so people
 * can name their columns correctly before uploading rather than after a
 * failed run. Mirrors IMPORT_ALIASES in server/src/services/import.service.js.
 */
export const IMPORT_COLUMNS = [
  { key: 'fullName', required: true, aliases: ['الاسم', 'اسم', 'full name', 'name'] },
  { key: 'phone', required: true, aliases: ['رقم الهاتف', 'هاتف', 'جوال', 'phone', 'mobile'] },
  { key: 'email', required: false, aliases: ['البريد الإلكتروني', 'ايميل', 'email'] },
  { key: 'course', required: false, aliases: ['الدورة', 'برنامج', 'course', 'program'] },
  { key: 'note', required: false, aliases: ['ملاحظات', 'ملاحظة', 'note', 'notes'] },
];

/** Brand palette, for charts that cannot read Tailwind classes. */
export const CHART_COLORS = ['#006473', '#f76a0c', '#36748b', '#997d40', '#4499ad', '#fd7f3a', '#71bac9'];
