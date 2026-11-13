import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bell, CheckCheck, Clock, PartyPopper, UserPlus } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useLocale } from '../context/LocaleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { bilingual, formatDateTime, fromNow } from '../lib/format.js';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Pagination,
  Tabs,
  cx,
} from '../components/ui/index.jsx';

const ICONS = {
  lead_assigned: { Icon: UserPlus, tone: 'bg-brand-100 text-brand-700' },
  follow_up_due: { Icon: Clock, tone: 'bg-amber-100 text-amber-700' },
  lead_stale: { Icon: AlertTriangle, tone: 'bg-rose-100 text-rose-700' },
  lead_enrolled: { Icon: PartyPopper, tone: 'bg-emerald-100 text-emerald-700' },
  system: { Icon: Bell, tone: 'bg-slate-100 text-slate-600' },
};

export default function Notifications() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();

  const [unreadOnly, setUnreadOnly] = useState('false');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', 'page', { unreadOnly, page }],
    queryFn: async () => (await api.get('/notifications', { params: { unreadOnly, page, limit: 20 } })).data,
    placeholderData: (prev) => prev,
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      toast.success(t('notifications.allRead'));
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const markOne = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.meta?.unread ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('notifications.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unread} {t('notifications.unread')}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            <CheckCheck className="h-4 w-4" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      <Tabs
        tabs={[
          { value: 'false', label: t('common.all') },
          { value: 'true', label: t('notifications.unread'), count: unread },
        ]}
        active={unreadOnly}
        onChange={(v) => {
          setUnreadOnly(v);
          setPage(1);
        }}
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock rows={6} className="p-4" />
        ) : isError ? (
          <ErrorState message={errorMessage(error)} onRetry={refetch} />
        ) : (data?.data?.length ?? 0) === 0 ? (
          <EmptyState icon={Bell} title={t('notifications.empty')} hint={t('notifications.emptyHint')} />
        ) : (
          <>
            {data.data.map((n) => {
              const { Icon, tone } = ICONS[n.type] ?? ICONS.system;
              return (
                <Link
                  key={n._id}
                  to={n.link ?? '/leads'}
                  onClick={() => !n.readAt && markOne.mutate(n._id)}
                  className={cx(
                    'flex gap-4 border-b border-slate-100 px-4 py-4 transition last:border-0 hover:bg-slate-50 sm:px-5',
                    !n.readAt && 'bg-brand-50/40',
                  )}
                >
                  <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{bilingual(n.title, locale)}</p>
                    {n.body && <p className="mt-0.5 text-sm text-slate-600">{bilingual(n.body, locale)}</p>}
                    <p className="mt-1.5 text-xs text-slate-400" title={formatDateTime(n.createdAt, locale)}>
                      {fromNow(n.createdAt, locale)}
                    </p>
                  </div>
                  {!n.readAt && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent-500" />}
                </Link>
              );
            })}
            <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
