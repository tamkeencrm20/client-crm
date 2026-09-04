import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, PhoneOff } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useLiveUpdates } from '../hooks/useLiveUpdates.js';
import { Card, CardHeader, EmptyState, ErrorState, LoadingBlock } from '../components/ui/index.jsx';
import { LeadRow } from '../components/leads/LeadBits.jsx';

/**
 * The agent's working screen: what is overdue, and who has never been called.
 * Deliberately the only page with no filters — it is a to-do list, not a report.
 */
export default function MyQueue() {
  const { t } = useTranslation();
  useLiveUpdates(['leads']);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leads', 'queue'],
    queryFn: async () => (await api.get('/leads/my/queue')).data.data,
    refetchInterval: 120_000,
  });

  const due = data?.dueFollowUps ?? [];
  const untouched = data?.untouched ?? [];
  const clear = !isLoading && due.length === 0 && untouched.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('queue.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('queue.subtitle')}</p>
      </div>

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : isLoading ? (
        <LoadingBlock rows={5} />
      ) : clear ? (
        <Card>
          <EmptyState icon={CheckCircle2} title={t('queue.allClear')} hint={t('queue.allClearHint')} className="py-20" />
        </Card>
      ) : (
        <div className="space-y-4">
          {due.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    {t('queue.dueFollowUps')}
                  </span>
                }
                subtitle={`${due.length}`}
              />
              {due.map((lead) => (
                <LeadRow key={lead._id} lead={lead} showAssignee={false} />
              ))}
            </Card>
          )}

          {untouched.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <PhoneOff className="h-4 w-4 text-rose-500" />
                    {t('queue.untouched')}
                  </span>
                }
                subtitle={`${untouched.length}`}
              />
              {untouched.map((lead) => (
                <LeadRow key={lead._id} lead={lead} showAssignee={false} />
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
