import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Bell, CheckCheck, UserPlus, Clock, AlertTriangle, PartyPopper } from 'lucide-react';
import api from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { useLocale } from '../../context/LocaleContext.jsx';
import { bilingual, fromNow } from '../../lib/format.js';
import { cx, EmptyState } from '../ui/index.jsx';

const ICONS = {
  lead_assigned: { Icon: UserPlus, tone: 'bg-brand-100 text-brand-700' },
  follow_up_due: { Icon: Clock, tone: 'bg-amber-100 text-amber-700' },
  lead_stale: { Icon: AlertTriangle, tone: 'bg-rose-100 text-rose-700' },
  lead_enrolled: { Icon: PartyPopper, tone: 'bg-emerald-100 text-emerald-700' },
  system: { Icon: Bell, tone: 'bg-slate-100 text-slate-600' },
};

export default function NotificationBell() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => (await api.get('/notifications', { params: { limit: 8 } })).data,
    // A slow poll is the safety net; the socket is what actually keeps this live.
    refetchInterval: 120_000,
  });

  const notifications = data?.data ?? [];
  const unread = data?.meta?.unread ?? 0;

  // Push arrivals straight into the cache instead of refetching the list.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onNew = () => qc.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [qc]);

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 text-slate-600 transition hover:bg-slate-100"
        aria-label={t('notifications.title')}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 end-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          {/* Anchored to the bell on desktop; near-full-width on a phone. */}
          <div className="absolute end-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-fade-in">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-900">{t('notifications.title')}</h3>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 transition hover:text-brand-800"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            <div className="scroll-thin max-h-[24rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title={t('notifications.empty')}
                  hint={t('notifications.emptyHint')}
                  className="py-10"
                />
              ) : (
                notifications.map((n) => {
                  const { Icon, tone } = ICONS[n.type] ?? ICONS.system;
                  return (
                    <Link
                      key={n._id}
                      to={n.link ?? '/leads'}
                      onClick={() => {
                        if (!n.readAt) markOne.mutate(n._id);
                        setOpen(false);
                      }}
                      className={cx(
                        'flex gap-3 border-b border-slate-50 px-4 py-3 transition last:border-0 hover:bg-slate-50',
                        !n.readAt && 'bg-brand-50/40',
                      )}
                    >
                      <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">{bilingual(n.title, locale)}</p>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{bilingual(n.body, locale)}</p>}
                        <p className="mt-1 text-[11px] text-slate-400">{fromNow(n.createdAt, locale)}</p>
                      </div>
                      {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
                    </Link>
                  );
                })
              )}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-bold text-brand-600 transition hover:bg-slate-50"
            >
              {t('notifications.viewAll')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
