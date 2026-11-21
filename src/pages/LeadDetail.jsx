import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  GraduationCap,
  History,
  Mail,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  Repeat,
  Shuffle,
  Tag,
  UserRound,
  Wallet,
  Megaphone,
  Globe,
} from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocale } from '../context/LocaleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAssignableAgents } from '../hooks/useReferenceData.js';
import {
  ACTIVITY_TYPES,
  CALL_OUTCOMES,
  canEditLeads,
  isLeader,
  STATUS_STYLES,
  STATUS_TRANSITIONS,
} from '../lib/constants.js';
import {
  bilingual,
  formatDateTime,
  formatMinutes,
  formatMoney,
  formatPhone,
  fromNow,
} from '../lib/format.js';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Select,
  Textarea,
  cx,
} from '../components/ui/index.jsx';
import { ContactActions, FollowUpTag, PlatformBadge, StatusBadge } from '../components/leads/LeadBits.jsx';

export default function LeadDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale, isRtl } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [statusOpen, setStatusOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const leader = isLeader(user);
  const canEdit = canEditLeads(user);
  const Back = isRtl ? ArrowRight : ArrowLeft;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leads', 'detail', id],
    queryFn: async () => (await api.get(`/leads/${id}`)).data.data,
  });

  const assignments = useQuery({
    queryKey: ['leads', 'assignments', id],
    queryFn: async () => (await api.get(`/leads/${id}/assignments`)).data.data,
    enabled: leader,
  });

  const redistribute = useMutation({
    mutationFn: () => api.post(`/leads/${id}/redistribute`),
    onSuccess: ({ data: res }) => {
      if (res.data.assigned) toast.success(t('leads.reassigned'));
      else toast.error(res.data.reason);
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-100" />
        <LoadingBlock rows={5} />
      </div>
    );
  }

  if (isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;

  const { lead, activities } = data;
  const courseLabel = lead.course ? bilingual(lead.course.name, locale) : lead.courseRaw;
  const allowedNext = STATUS_TRANSITIONS[lead.status] ?? [];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-800"
      >
        <Back className="h-4 w-4" />
        {t('common.back')}
      </button>

      {/* Identity header */}
      <Card className="overflow-hidden">
        <div className="border-b-4 px-5 py-5 sm:px-6" style={{ borderColor: STATUS_STYLES[lead.status].bar }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar name={lead.fullName} size="lg" />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-black text-slate-900 sm:text-2xl">{lead.fullName}</h1>
                <a href={`tel:+${String(lead.phone).replace(/\D/g, '')}`} dir="ltr" className="mt-1 block text-start text-sm font-semibold text-brand-600 hover:underline">
                  {formatPhone(lead.phone)}
                </a>
                {lead.email && (
                  <a href={`mailto:${lead.email}`} dir="ltr" className="mt-0.5 block truncate text-start text-sm text-slate-500 hover:underline">
                    {lead.email}
                  </a>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={lead.status} />
                  <Badge className="bg-slate-100 text-slate-600 ring-slate-200">{t(`source.${lead.source}`)}</Badge>
                  <PlatformBadge network={lead.meta?.network} source={lead.source} />
                  {lead.nextFollowUpAt && <FollowUpTag date={lead.nextFollowUpAt} />}
                  {(lead.tags ?? []).map((tag) => (
                    <Badge key={tag} className="bg-brand-50 text-brand-700 ring-brand-200">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <ContactActions lead={lead} />
            </div>
          </div>
        </div>

        {/* Primary actions */}
        <div className="flex flex-wrap gap-2 bg-slate-50/60 px-5 py-3 sm:px-6">
          {canEdit && (
            <>
              <Button onClick={() => setStatusOpen(true)} disabled={allowedNext.length === 0}>
                <RefreshCw className="h-4 w-4" />
                {t('leads.changeStatus')}
              </Button>
              <Button variant="secondary" onClick={() => setActivityOpen(true)}>
                <MessageSquarePlus className="h-4 w-4" />
                {t('leads.logActivity')}
              </Button>
            </>
          )}
          {leader && (
            <>
              <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                <Repeat className="h-4 w-4" />
                {t('leads.reassign')}
              </Button>
              <Button variant="ghost" onClick={() => redistribute.mutate()} loading={redistribute.isPending}>
                <Shuffle className="h-4 w-4" />
                <span className="hidden sm:inline">{t('leads.redistribute')}</span>
              </Button>
            </>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader title={t('leads.timeline')} subtitle={`${activities.length}`} />
          {activities.length === 0 ? (
            <EmptyState icon={History} title={t('leads.noActivities')} />
          ) : (
            <ol className="relative space-y-0 px-5 py-4">
              {activities.map((a, i) => (
                <li key={a._id} className="relative flex gap-4 pb-5 last:pb-0">
                  {/* Connector line, hidden on the final entry. */}
                  {i < activities.length - 1 && (
                    <span className="absolute start-[15px] top-9 h-[calc(100%-1.5rem)] w-px bg-slate-200" aria-hidden />
                  )}
                  <span
                    className={cx(
                      'z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white',
                      a.type === 'status_change'
                        ? 'bg-violet-100 text-violet-700'
                        : a.type === 'assignment'
                          ? 'bg-brand-100 text-brand-700'
                          : a.type === 'call'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {ACTIVITY_ICON[a.type] ?? '•'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-bold text-slate-900">{t(`activity.${a.type}`)}</span>
                      {a.type === 'status_change' && (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <StatusBadge status={a.fromStatus} />
                          <span className="text-slate-400">→</span>
                          <StatusBadge status={a.toStatus} />
                        </span>
                      )}
                      {a.callOutcome && (
                        <Badge className="bg-slate-100 text-slate-600 ring-slate-200">{t(`callOutcome.${a.callOutcome}`)}</Badge>
                      )}
                      {a.callDurationSeconds > 0 && (
                        <span className="text-xs text-slate-400">
                          {a.callDurationSeconds} {t('common.seconds')}
                        </span>
                      )}
                    </div>

                    {a.note && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.note}</p>}

                    <p className="mt-1.5 text-xs text-slate-400">
                      {a.actor?.name ?? t('activity.system')}
                      <span className="mx-1.5">·</span>
                      <span title={formatDateTime(a.createdAt, locale)}>{fromNow(a.createdAt, locale)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Side panels */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={t('leads.title')} />
            <dl className="divide-y divide-slate-50">
              <Row Icon={UserRound} label={t('leads.assignedTo')}>
                {lead.assignedTo ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={lead.assignedTo.name} size="sm" />
                    <span className="truncate font-bold text-slate-900">{lead.assignedTo.name}</span>
                  </span>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 ring-amber-200">{t('common.unassigned')}</Badge>
                )}
              </Row>
              <Row Icon={Building2} label={t('leads.branch')}>
                {lead.branch ? bilingual(lead.branch.name, locale) : lead.branchRaw || '—'}
              </Row>
              <Row Icon={GraduationCap} label={t('leads.course')}>
                {courseLabel || '—'}
              </Row>
              {lead.countryRaw && (
                <Row Icon={Globe} label={t('leads.country')}>
                  {lead.countryRaw}
                </Row>
              )}
              <Row Icon={Phone} label={t('leads.contactAttempts')}>
                {lead.contactAttempts ?? 0}
              </Row>
              <Row Icon={CalendarClock} label={t('leads.responseTime')}>
                {lead.firstContactedAt ? formatMinutes(lead.responseMinutes, t) : t('leads.notContactedYet')}
              </Row>
              <Row Icon={CalendarClock} label={t('leads.nextFollowUp')}>
                {lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt, locale) : t('common.notSet')}
              </Row>
              <Row Icon={CalendarClock} label={t('leads.createdAt')}>
                {formatDateTime(lead.createdAt, locale)}
              </Row>
              <Row Icon={History} label={t('leads.lastActivity')}>
                {fromNow(lead.lastActivityAt, locale)}
              </Row>
              {lead.enrolledAt && (
                <Row Icon={Wallet} label={t('leads.dealValue')}>
                  <span className="font-bold text-emerald-600">{formatMoney(lead.dealValue, locale, lead.currency)}</span>
                </Row>
              )}
              {lead.lostReason && (
                <Row Icon={Tag} label={t('leads.lostReason')}>
                  {lead.lostReason}
                </Row>
              )}
            </dl>
          </Card>

          {/*
            Every answer exactly as it was submitted. The mapped fields above
            cover the five the pipeline needs; a form also asks things no
            column exists for — when to call, which country — and those were
            being stored and never shown, so the agent phoned without the one
            detail the person had taken the trouble to give.
          */}
          {lead.meta?.rawFields && Object.keys(lead.meta.rawFields).length > 0 && (
            <Card>
              <CardHeader title={t('leads.formAnswers')} />
              <dl className="divide-y divide-slate-50">
                {Object.entries(lead.meta.rawFields).map(([question, answer]) => (
                  <div key={question} className="px-4 py-2.5">
                    <dt className="text-xs text-slate-500">{question}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-900">{answer || '—'}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {/* Meta campaign attribution */}
          {lead.meta?.leadgenId && (
            <Card>
              <CardHeader
                title={t('leads.metaDetails')}
                action={<PlatformBadge network={lead.meta?.network} />}
              />
              <dl className="divide-y divide-slate-50">
                {lead.meta.campaignName && (
                  <Row Icon={Megaphone} label={t('leads.campaignName')}>
                    {lead.meta.campaignName}
                  </Row>
                )}
                {lead.meta.adName && (
                  <Row Icon={Megaphone} label={t('leads.adName')}>
                    {lead.meta.adName}
                  </Row>
                )}
                {lead.meta.formName && (
                  <Row Icon={Mail} label={t('leads.formName')}>
                    {lead.meta.formName}
                  </Row>
                )}
                {lead.meta.platform && (
                  <Row Icon={Megaphone} label={t('leads.platform')}>
                    {lead.meta.platform === 'ig' ? t('source.meta_instagram') : t('source.meta_facebook')}
                  </Row>
                )}
              </dl>
            </Card>
          )}

          {/* Distribution audit — leaders and admins only */}
          {leader && (assignments.data?.length ?? 0) > 0 && (
            <Card>
              <CardHeader title={t('leads.assignmentHistory')} />
              <ul className="divide-y divide-slate-50">
                {assignments.data.map((a) => (
                  <li key={a._id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {a.assignedTo?.name ?? t('common.unassigned')}
                      </span>
                      <Badge className={a.succeeded ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-rose-100 text-rose-700 ring-rose-200'}>
                        {t(`strategy.${a.strategy}`, a.strategy)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.reason || a.failureReason}</p>
                    {a.eligibleCount > 0 && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {t('leads.eligibleAgents')}: {a.eligibleCount}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(a.createdAt, locale)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {canEdit && (
        <>
          <StatusModal open={statusOpen} onClose={() => setStatusOpen(false)} lead={lead} allowed={allowedNext} onDone={invalidate} />
          <ActivityModal open={activityOpen} onClose={() => setActivityOpen(false)} leadId={id} onDone={invalidate} />
        </>
      )}
      {leader && (
        <AssignModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          leadId={id}
          branchId={lead.branch?._id ?? lead.branch}
          currentAgentId={lead.assignedTo?._id}
          onDone={invalidate}
        />
      )}
    </div>
  );
}

const ACTIVITY_ICON = {
  call: '📞',
  whatsapp: '💬',
  email: '✉️',
  meeting: '🤝',
  note: '📝',
  status_change: '⇄',
  assignment: '👤',
  system: '⚙',
};

function Row({ Icon, label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-3">
      <dt className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        {label}
      </dt>
      <dd className="min-w-0 text-end text-sm font-semibold text-slate-800">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status change
// ---------------------------------------------------------------------------

function StatusModal({ open, onClose, lead, allowed, onDone }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();

  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [lostReason, setLostReason] = useState('');

  const needsFollowUp = status === 'follow_up';
  const isWin = status === 'enrolled';
  const isLoss = status === 'not_interested' || status === 'closed';

  const mutate = useMutation({
    mutationFn: (payload) => api.patch(`/leads/${lead._id}/status`, payload),
    onSuccess: () => {
      toast.success(t('leads.statusChanged'));
      qc.invalidateQueries({ queryKey: ['leads', 'detail', lead._id] });
      onDone();
      reset();
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const reset = () => {
    setStatus('');
    setNote('');
    setFollowUp('');
    setDealValue('');
    setLostReason('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!status) return;
    if (needsFollowUp && !followUp) {
      toast.error(t('leads.followUpRequired'));
      return;
    }

    const payload = { status };
    if (note.trim()) payload.note = note.trim();
    if (followUp) payload.nextFollowUpAt = new Date(followUp).toISOString();
    if (isWin && dealValue) payload.dealValue = Number(dealValue);
    if (isLoss && lostReason.trim()) payload.lostReason = lostReason.trim();

    mutate.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('leads.changeStatus')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button form="status-form" type="submit" loading={mutate.isPending} disabled={!status}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="status-form" onSubmit={submit} className="space-y-4">
        {/* Only transitions the server will accept are offered. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {allowed.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cx(
                'rounded-xl border-2 px-3 py-3 text-sm font-bold transition',
                status === s ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span className={cx('mx-auto mb-1.5 block h-2 w-2 rounded-full', STATUS_STYLES[s].dot)} />
              {t(`status.${s}`)}
            </button>
          ))}
        </div>

        {(needsFollowUp || status) && (
          <Field
            label={t('leads.nextFollowUp')}
            required={needsFollowUp}
            hint={needsFollowUp ? t('leads.followUpRequired') : t('common.optional')}
          >
            <Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </Field>
        )}

        {isWin && (
          <Field label={t('leads.dealValue')} hint={t('common.optional')}>
            <Input type="number" min="0" step="50" dir="ltr" value={dealValue} onChange={(e) => setDealValue(e.target.value)} className="text-start" />
          </Field>
        )}

        {isLoss && (
          <Field label={t('leads.lostReason')} hint={t('common.optional')}>
            <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
          </Field>
        )}

        <Field label={t('leads.note')} hint={t('common.optional')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </Field>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

function ActivityModal({ open, onClose, leadId, onDone }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();

  const [type, setType] = useState('call');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [duration, setDuration] = useState('');
  const [followUp, setFollowUp] = useState('');

  const mutate = useMutation({
    mutationFn: (payload) => api.post(`/leads/${leadId}/activities`, payload),
    onSuccess: () => {
      toast.success(t('leads.activityLogged'));
      qc.invalidateQueries({ queryKey: ['leads', 'detail', leadId] });
      onDone();
      setNote('');
      setOutcome('');
      setDuration('');
      setFollowUp('');
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = (e) => {
    e.preventDefault();
    const payload = { type };
    if (note.trim()) payload.note = note.trim();
    if (type === 'call' && outcome) payload.callOutcome = outcome;
    if (type === 'call' && duration) payload.callDurationSeconds = Number(duration);
    if (followUp) payload.nextFollowUpAt = new Date(followUp).toISOString();
    mutate.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('leads.logActivity')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button form="activity-form" type="submit" loading={mutate.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="activity-form" onSubmit={submit} className="space-y-4">
        <Field label={t('leads.activityType')}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {ACTIVITY_TYPES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setType(a)}
                className={cx(
                  'rounded-xl border-2 px-2 py-2.5 text-xs font-bold transition',
                  type === a ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                <span className="mb-1 block text-base">{ACTIVITY_ICON[a]}</span>
                {t(`activity.${a}`)}
              </button>
            ))}
          </div>
        </Field>

        {type === 'call' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('leads.callOutcomeLabel')}>
              <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option value="">{t('common.select')}</option>
                {CALL_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {t(`callOutcome.${o}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('leads.callDuration')}>
              <Input type="number" min="0" dir="ltr" value={duration} onChange={(e) => setDuration(e.target.value)} className="text-start" />
            </Field>
          </div>
        )}

        <Field label={t('leads.note')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} autoFocus />
        </Field>

        <Field label={t('leads.nextFollowUp')} hint={t('common.optional')}>
          <Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Reassignment
// ---------------------------------------------------------------------------

function AssignModal({ open, onClose, leadId, branchId, currentAgentId, onDone }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [agentId, setAgentId] = useState('');

  const { data: agents, isLoading } = useAssignableAgents(branchId, open);

  const mutate = useMutation({
    mutationFn: () => api.post(`/leads/${leadId}/assign`, { agentId }),
    onSuccess: () => {
      toast.success(t('leads.reassigned'));
      qc.invalidateQueries({ queryKey: ['leads', 'detail', leadId] });
      qc.invalidateQueries({ queryKey: ['leads', 'assignments', leadId] });
      onDone();
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('leads.reassign')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => mutate.mutate()} loading={mutate.isPending} disabled={!agentId}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <LoadingBlock rows={4} />
      ) : (agents?.length ?? 0) === 0 ? (
        <EmptyState title={t('team.empty')} />
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
            <button
              key={a._id}
              type="button"
              onClick={() => setAgentId(a._id)}
              disabled={a._id === currentAgentId}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-start transition',
                agentId === a._id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:bg-slate-50',
                a._id === currentAgentId && 'cursor-not-allowed opacity-50',
              )}
            >
              <Avatar name={a.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{a.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {a.openLeadsCount} {t('team.openLeads')}
                  {a.dailyLeadCap > 0 && ` · ${t('team.dailyCap')} ${a.dailyLeadCap}`}
                </p>
              </div>
              <span
                className={cx('h-2 w-2 shrink-0 rounded-full', a.isAvailable ? 'bg-emerald-500' : 'bg-slate-300')}
                title={a.isAvailable ? t('team.availableNow') : t('team.notAvailable')}
              />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
