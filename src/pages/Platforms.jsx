import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Copy, Link2, Radio, Send, X } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useLocale } from '../context/LocaleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { AD_PLATFORMS, PLATFORM_STYLES } from '../lib/constants.js';
import { formatDateTime, formatMoney, formatNumber } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Tabs,
  cx,
} from '../components/ui/index.jsx';

/**
 * The media buyer's home: is each network actually wired up, how much is it
 * delivering, and how well does that traffic convert once the sales team has
 * it. The credentials themselves live in server environment variables — this
 * page reports what the server can see, and never asks anyone to paste a secret
 * into a browser form.
 */
export default function Platforms() {
  const { t } = useTranslation();
  const { locale, isRtl } = useLocale();
  const [active, setActive] = useState(AD_PLATFORMS[0]);

  const statuses = useQueries({
    queries: AD_PLATFORMS.map((p) => ({
      queryKey: ['platform', p, 'status'],
      queryFn: async () => (await api.get(`/${p}/status`)).data.data,
      staleTime: 60_000,
    })),
  });

  const sources = useQuery({
    queryKey: ['dashboard', 'sources', 'platforms'],
    queryFn: async () => (await api.get('/dashboard/sources')).data.data,
  });

  const byPlatform = sources.data?.byPlatform ?? [];
  const byCampaign = sources.data?.byCampaign ?? [];
  const loading = statuses.some((s) => s.isLoading);

  const isConnected = (s) =>
    Boolean(s?.appSecretConfigured && s?.verifyTokenConfigured && (s?.accessTokenConfigured ?? s?.pageAccessTokenConfigured));

  const connectedCount = statuses.filter((s) => isConnected(s.data)).length;

  const tabs = AD_PLATFORMS.map((p, i) => ({
    value: p,
    label: t(`platform.${p}`),
    count: statuses[i]?.data?.totalLeads,
  }));

  const activeIndex = AD_PLATFORMS.indexOf(active);
  const activeStatus = statuses[activeIndex]?.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('platform.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('platform.subtitle')}</p>
        </div>
        <Badge
          className={connectedCount > 0 ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}
          dot={connectedCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}
        >
          {connectedCount} / {AD_PLATFORMS.length} {t('platform.connected')}
        </Badge>
      </div>

      {/* Per-network performance — the question the media buyer actually has. */}
      <Card>
        <CardHeader title={t('platform.performance')} />
        {sources.isLoading ? (
          <LoadingBlock rows={3} className="p-4" />
        ) : byPlatform.length === 0 ? (
          <EmptyState icon={Radio} title={t('dashboard.noDataYet')} className="py-12" />
        ) : (
          <>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              {byPlatform.map((p) => (
                <div key={p._id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={PLATFORM_STYLES[p._id]?.chip} dot={PLATFORM_STYLES[p._id]?.dot}>
                      {t(`platform.${p._id}`, p._id)}
                    </Badge>
                    <span className="text-sm font-bold tabular-nums text-slate-900">{p.conversionRate}%</span>
                  </div>
                  <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{formatNumber(p.leads, locale)}</p>
                  <p className="text-xs font-semibold text-slate-500">{t('platform.totalLeads')}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <span className="text-slate-500">
                      {t('dashboard.enrolled')} <b className="tabular-nums text-emerald-600">{formatNumber(p.enrolled, locale)}</b>
                    </span>
                    <span className="font-semibold tabular-nums text-slate-700">{formatMoney(p.revenue, locale)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 sm:p-4">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={byPlatform.map((p) => ({ ...p, label: t(`platform.${p._id}`, p._id) }))}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} reversed={isRtl} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} orientation={isRtl ? 'right' : 'left'} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="leads" name={t('dashboard.leadsLabel')} radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {byPlatform.map((p) => (
                      <Cell key={p._id} fill={PLATFORM_STYLES[p._id]?.bar ?? '#006473'} />
                    ))}
                  </Bar>
                  <Bar dataKey="enrolled" name={t('dashboard.enrolledLabel')} fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={52} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      {/* Campaign table, now labelled with the network it ran on. */}
      <Card>
        <CardHeader title={t('dashboard.byCampaign')} />
        {byCampaign.length === 0 ? (
          <EmptyState title={t('dashboard.noDataYet')} className="py-12" />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 text-start">{t('dashboard.campaign')}</th>
                  <th className="px-3 py-3 text-start">{t('leads.platform')}</th>
                  <th className="px-3 py-3 text-start">{t('dashboard.leadsLabel')}</th>
                  <th className="px-3 py-3 text-start">{t('dashboard.enrolled')}</th>
                  <th className="px-5 py-3 text-start">{t('dashboard.revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {byCampaign.map((c) => (
                  <tr key={`${c.network}-${c._id}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="max-w-[16rem] truncate px-5 py-3 font-semibold text-slate-800">{c._id}</td>
                    <td className="px-3 py-3">
                      {c.network ? (
                        <Badge className={PLATFORM_STYLES[c.network]?.chip}>{t(`platform.${c.network}`, c.network)}</Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{formatNumber(c.leads, locale)}</td>
                    <td className="px-3 py-3 font-bold tabular-nums text-emerald-600">{formatNumber(c.enrolled, locale)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatMoney(c.revenue ?? 0, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Connection detail, one network at a time. */}
      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <Tabs tabs={tabs} active={active} onChange={setActive} />
        </div>
        {loading ? <LoadingBlock rows={4} className="p-5" /> : <PlatformPanel platform={active} status={activeStatus} />}
      </Card>
    </div>
  );
}

function PlatformPanel({ platform, status }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!status) return <EmptyState title={t('errors.loadFailed')} className="py-12" />;

  // Meta reports its token under a different name than the other two.
  const tokenConfigured = status.accessTokenConfigured ?? status.pageAccessTokenConfigured;
  const connected = status.appSecretConfigured && status.verifyTokenConfigured && tokenConfigured;
  const webhookUrl = `${window.location.origin}${status.webhookPath}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common.somethingWrong'));
    }
  };

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge className={PLATFORM_STYLES[platform]?.chip} dot={PLATFORM_STYLES[platform]?.dot}>
          {t(`platform.${platform}`)}
        </Badge>
        <Badge
          className={connected ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}
          dot={connected ? 'bg-emerald-500' : 'bg-amber-500'}
        >
          {connected ? t('platform.connected') : t('platform.notConnected')}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Flag ok={status.appSecretConfigured} label={t('platform.appSecret')} />
        <Flag ok={status.verifyTokenConfigured} label={t('platform.verifyToken')} />
        <Flag ok={tokenConfigured} label={t('platform.accessToken')} />
      </div>

      <Field label={t('platform.webhookUrl')}>
        <div className="flex gap-2">
          <Input dir="ltr" readOnly value={webhookUrl} className="text-start font-mono text-xs" />
          <Button variant="secondary" size="icon" onClick={copy} title={t('common.copy')}>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label={t('platform.apiVersion')} value={status.apiVersion ?? status.graphVersion ?? '—'} />
        <Metric label={t('platform.totalLeads')} value={formatNumber(status.totalLeads ?? status.totalLeadsFromMeta ?? 0, locale)} />
        <Metric label={t('platform.lastLeadAt')} value={status.lastLeadAt ? formatDateTime(status.lastLeadAt, locale) : '—'} />
      </div>

      <SyncLead platform={platform} />
      <SimulateLead platform={platform} />
    </div>
  );
}

function Flag({ ok, label }) {
  const { t } = useTranslation();
  return (
    <div className={cx('flex items-center gap-2 rounded-xl px-3 py-2.5', ok ? 'bg-emerald-50' : 'bg-amber-50')}>
      <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white', ok ? 'bg-emerald-500' : 'bg-amber-500')}>
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-700">{label}</p>
        <p className={cx('text-[11px]', ok ? 'text-emerald-700' : 'text-amber-700')}>
          {ok ? t('platform.configured') : t('platform.missing')}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function SyncLead({ platform }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [leadId, setLeadId] = useState('');

  const mutate = useMutation({
    mutationFn: () => api.post(`/${platform}/leads/${encodeURIComponent(leadId.trim())}/sync`),
    onSuccess: () => {
      toast.success(t('platform.synced'));
      setLeadId('');
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['platform'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Field label={t('platform.syncLead')} hint={t('platform.leadId')}>
      <div className="flex gap-2">
        <Input dir="ltr" value={leadId} onChange={(e) => setLeadId(e.target.value)} className="text-start font-mono" placeholder="1234567890" />
        <Button variant="secondary" onClick={() => mutate.mutate()} loading={mutate.isPending} disabled={!leadId.trim()}>
          <Link2 className="h-4 w-4" />
          {t('platform.sync')}
        </Button>
      </div>
    </Field>
  );
}

/** Pushes a lead through the real intake path so distribution can be shown working. */
function SimulateLead({ platform }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', branch: '', course: '', campaignName: '' });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutate = useMutation({
    mutationFn: () => {
      const payload = { fullName: form.fullName.trim(), phone: form.phone.trim() };
      if (form.branch.trim()) payload.branch = form.branch.trim();
      if (form.course.trim()) payload.course = form.course.trim();
      if (form.campaignName.trim()) payload.campaignName = form.campaignName.trim();
      return api.post(`/${platform}/simulate-lead`, payload);
    },
    onSuccess: ({ data }) => {
      const { assignedTo, leadId } = data.data;
      toast.success(assignedTo ? t('platform.simulated', { agent: assignedTo }) : t('platform.simulatedUnassigned'));
      setForm({ fullName: '', phone: '', branch: '', course: '', campaignName: '' });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['platform'] });
      if (leadId) navigate(`/leads/${leadId}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-sm font-bold text-slate-800">{t('platform.simulate')}</p>
      <p className="mb-3 mt-0.5 text-xs text-slate-500">{t('platform.simulateHint')}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate.mutate();
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Field label={t('leads.fullName')} required>
          <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </Field>
        <Field label={t('leads.phone')} required>
          <Input dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0501234567" className="text-start" />
        </Field>
        <Field label={t('leads.branch')} hint="عجمان / dubai">
          <Input value={form.branch} onChange={(e) => set('branch', e.target.value)} />
        </Field>
        <Field label={t('leads.course')} hint="KPI">
          <Input value={form.course} onChange={(e) => set('course', e.target.value)} />
        </Field>
        <Field label={t('platform.campaignName')} hint={t('common.optional')}>
          <Input value={form.campaignName} onChange={(e) => set('campaignName', e.target.value)} />
        </Field>

        <div className="flex items-end">
          <Button type="submit" variant="accent" loading={mutate.isPending} disabled={!form.fullName.trim() || !form.phone.trim()} className="w-full">
            <Send className="h-4 w-4" />
            {t('platform.simulate')}
          </Button>
        </div>
      </form>
    </div>
  );
}
