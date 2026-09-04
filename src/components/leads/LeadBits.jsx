import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, MessageCircle, Mail, Clock, AlertTriangle, CalendarClock } from 'lucide-react';
import { STATUS_STYLES } from '../../lib/constants.js';
import { useLocale } from '../../context/LocaleContext.jsx';
import { bilingual, formatPhone, phoneDigits, fromNow, followUpState, formatDate } from '../../lib/format.js';
import { Avatar, Badge, cx } from '../ui/index.jsx';

/** Coloured pill for a pipeline status. */
export function StatusBadge({ status, className }) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.closed;
  return (
    <Badge className={cx(style.chip, className)} dot={style.dot}>
      {t(`status.${status}`)}
    </Badge>
  );
}

/** "Overdue" / "Due today" / a date, colour-coded. */
export function FollowUpTag({ date, className }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const state = followUpState(date);
  if (!state) return null;

  const map = {
    overdue: { cls: 'bg-rose-100 text-rose-800 ring-rose-200', Icon: AlertTriangle, label: t('leads.overdue') },
    today: { cls: 'bg-amber-100 text-amber-800 ring-amber-200', Icon: Clock, label: t('leads.dueToday') },
    upcoming: { cls: 'bg-slate-100 text-slate-700 ring-slate-200', Icon: CalendarClock, label: formatDate(date, locale) },
  };
  const { cls, Icon, label } = map[state];

  return (
    <Badge className={cx(cls, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/** tel: / wa.me / mailto: buttons. The three things an agent actually does. */
export function ContactActions({ lead, size = 'md' }) {
  const { t } = useTranslation();
  const digits = phoneDigits(lead.phone);
  const btn =
    size === 'sm'
      ? 'h-8 w-8'
      : 'h-10 flex-1 gap-2 px-3 text-sm font-semibold sm:flex-none sm:px-4';

  const stop = (e) => e.stopPropagation();

  return (
    <div className="flex items-center gap-2">
      <a
        href={`tel:+${digits}`}
        onClick={stop}
        title={t('leads.callNow')}
        className={cx('inline-flex items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700', btn)}
      >
        <Phone className="h-4 w-4" />
        {size !== 'sm' && <span className="hidden sm:inline">{t('leads.callNow')}</span>}
      </a>
      <a
        href={`https://wa.me/${digits}`}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        title={t('leads.whatsappNow')}
        className={cx('inline-flex items-center justify-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-600', btn)}
      >
        <MessageCircle className="h-4 w-4" />
        {size !== 'sm' && <span className="hidden sm:inline">{t('leads.whatsappNow')}</span>}
      </a>
      {lead.email && (
        <a
          href={`mailto:${lead.email}`}
          onClick={stop}
          title={t('leads.emailNow')}
          className={cx('inline-flex items-center justify-center rounded-xl bg-slate-200 text-slate-700 transition hover:bg-slate-300', btn)}
        >
          <Mail className="h-4 w-4" />
          {size !== 'sm' && <span className="hidden sm:inline">{t('leads.emailNow')}</span>}
        </a>
      )}
    </div>
  );
}

/**
 * One lead in a list. Renders as a card on phones and as a dense row from md up,
 * which avoids shipping two separate list implementations.
 */
export function LeadRow({ lead, showAssignee = true }) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const courseLabel = lead.course ? bilingual(lead.course.name, locale) : lead.courseRaw;

  return (
    <Link
      to={`/leads/${lead._id}`}
      className="block border-b border-slate-100 px-4 py-4 transition last:border-0 hover:bg-slate-50 sm:px-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* Identity */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar name={lead.fullName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{lead.fullName}</p>
            <p dir="ltr" className="mt-0.5 truncate text-start text-sm text-slate-500">
              {formatPhone(lead.phone)}
            </p>
            {courseLabel && <p className="mt-1 truncate text-xs text-slate-500">{courseLabel}</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 md:w-auto md:shrink-0">
          <StatusBadge status={lead.status} />
          {lead.nextFollowUpAt && <FollowUpTag date={lead.nextFollowUpAt} />}
          <Badge className="bg-slate-100 text-slate-600 ring-slate-200">{t(`source.${lead.source}`)}</Badge>
        </div>

        {/* Owner + time */}
        <div className="flex items-center justify-between gap-3 md:w-52 md:shrink-0 md:justify-end">
          {showAssignee && (
            <div className="flex min-w-0 items-center gap-2">
              {lead.assignedTo ? (
                <>
                  <Avatar name={lead.assignedTo.name} size="sm" />
                  <span className="truncate text-xs font-semibold text-slate-600">{lead.assignedTo.name}</span>
                </>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 ring-amber-200">{t('common.unassigned')}</Badge>
              )}
            </div>
          )}
          <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{fromNow(lead.createdAt, locale)}</span>
        </div>
      </div>
    </Link>
  );
}
