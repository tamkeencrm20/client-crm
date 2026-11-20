import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Languages, Link2, Lock, Plug, Send, X } from 'lucide-react';
import api, { API_ORIGIN, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocale } from '../context/LocaleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isAdmin } from '../lib/constants.js';
import { formatDateTime, formatNumber } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  LoadingBlock,
  Select,
  cx,
} from '../components/ui/index.jsx';
import { LOCALES } from '../i18n/index.js';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const admin = isAdmin(user);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('settings.subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LanguageCard />
        <PasswordCard />
      </div>

      {admin && <MetaCard />}
      {admin && <SimulateCard />}
    </div>
  );
}

function LanguageCard() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  return (
    <Card>
      <CardHeader title={t('settings.language')} />
      <div className="p-5">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(LOCALES).map(([code, { label }]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={cx(
                'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 font-bold transition',
                locale === code ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              <Languages className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function PasswordCard() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const toast = useToast();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const mutate = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: current, newPassword: next }),
    onSuccess: async () => {
      toast.success(t('auth.passwordChanged'));
      // Every session was revoked server-side, so sign out locally too.
      await logout();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const submit = (e) => {
    e.preventDefault();
    if (next.length < 8) return setError('8+');
    if (next !== confirm) return setError(t('auth.passwordsDontMatch'));
    setError('');
    mutate.mutate();
  };

  return (
    <Card>
      <CardHeader title={t('auth.changePassword')} />
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field label={t('auth.currentPassword')} required>
          <Input dir="ltr" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="text-start" autoComplete="current-password" />
        </Field>
        <Field label={t('auth.newPassword')} required hint="8+">
          <Input dir="ltr" type="password" value={next} onChange={(e) => setNext(e.target.value)} className="text-start" autoComplete="new-password" />
        </Field>
        <Field label={t('auth.confirmPassword')} required error={error}>
          <Input dir="ltr" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="text-start" autoComplete="new-password" />
        </Field>
        <Button type="submit" loading={mutate.isPending} disabled={!current || !next}>
          <Lock className="h-4 w-4" />
          {t('common.save')}
        </Button>
      </form>
    </Card>
  );
}

function MetaCard() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['meta', 'status'],
    queryFn: async () => (await api.get('/meta/status')).data.data,
  });

  const connected = data?.appSecretConfigured && data?.verifyTokenConfigured && data?.pageAccessTokenConfigured;
  // The same correction as on the platforms screen: the webhook lives on the
  // API, and building it from this page's own origin named the web app, which
  // answers every path with index.html and so looks healthy while being wrong.
  const webhookUrl = data ? `${API_ORIGIN || window.location.origin}${data.webhookPath}` : '';

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
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-slate-400" />
            {t('settings.metaIntegration')}
          </span>
        }
        action={
          !isLoading && (
            <Badge className={connected ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'} dot={connected ? 'bg-emerald-500' : 'bg-amber-500'}>
              {connected ? t('settings.metaConnected') : t('settings.metaNotConnected')}
            </Badge>
          )
        }
      />

      {isLoading ? (
        <LoadingBlock rows={3} className="p-5" />
      ) : (
        <div className="space-y-4 p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <ConfigFlag ok={data.appSecretConfigured} label={t('settings.appSecret')} />
            <ConfigFlag ok={data.verifyTokenConfigured} label={t('settings.verifyToken')} />
            <ConfigFlag ok={data.pageAccessTokenConfigured} label={t('settings.pageToken')} />
          </div>

          <Field label={t('settings.webhookUrl')}>
            <div className="flex gap-2">
              <Input dir="ltr" readOnly value={webhookUrl} className="text-start font-mono text-xs" />
              <Button variant="secondary" size="icon" onClick={copy} title={t('common.copy')}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label={t('settings.graphVersion')} value={data.graphVersion} />
            <Metric label={t('settings.totalFromMeta')} value={formatNumber(data.totalLeadsFromMeta, locale)} />
            <Metric label={t('settings.lastLeadAt')} value={data.lastLeadAt ? formatDateTime(data.lastLeadAt, locale) : '—'} />
          </div>

          <SyncLead />
        </div>
      )}
    </Card>
  );
}

function ConfigFlag({ ok, label }) {
  const { t } = useTranslation();
  return (
    <div className={cx('flex items-center gap-2 rounded-xl px-3 py-2.5', ok ? 'bg-emerald-50' : 'bg-amber-50')}>
      <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white', ok ? 'bg-emerald-500' : 'bg-amber-500')}>
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-700">{label}</p>
        <p className={cx('text-[11px]', ok ? 'text-emerald-700' : 'text-amber-700')}>
          {ok ? t('settings.configured') : t('settings.missing')}
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

function SyncLead() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [leadgenId, setLeadgenId] = useState('');

  const mutate = useMutation({
    mutationFn: () => api.post(`/meta/leads/${leadgenId.trim()}/sync`),
    onSuccess: () => {
      toast.success(t('settings.synced'));
      setLeadgenId('');
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Field label={t('settings.syncLead')} hint={t('settings.leadgenId')}>
      <div className="flex gap-2">
        <Input dir="ltr" value={leadgenId} onChange={(e) => setLeadgenId(e.target.value)} className="text-start font-mono" placeholder="1234567890" />
        <Button variant="secondary" onClick={() => mutate.mutate()} loading={mutate.isPending} disabled={!leadgenId.trim()}>
          <Link2 className="h-4 w-4" />
          {t('settings.sync')}
        </Button>
      </div>
    </Field>
  );
}

/**
 * Fires a lead through the exact intake path a real Meta delivery takes, so
 * distribution can be demonstrated before the Business account is connected.
 */
function SimulateCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', phone: '', email: '', course: '', branch: '', platform: 'fb' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutate = useMutation({
    mutationFn: () => {
      const payload = { fullName: form.fullName.trim(), phone: form.phone.trim(), platform: form.platform };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.course.trim()) payload.course = form.course.trim();
      if (form.branch.trim()) payload.branch = form.branch.trim();
      return api.post('/meta/simulate-lead', payload);
    },
    onSuccess: ({ data }) => {
      const { assignedTo, leadId } = data.data;
      toast.success(assignedTo ? t('settings.simulated', { agent: assignedTo }) : t('settings.simulatedUnassigned'));
      setForm({ fullName: '', phone: '', email: '', course: '', branch: '', platform: 'fb' });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (leadId) navigate(`/leads/${leadId}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Card>
      <CardHeader title={t('settings.simulateLead')} subtitle={t('settings.simulateHint')} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate.mutate();
        }}
        className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Field label={t('leads.fullName')} required>
          <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </Field>
        <Field label={t('leads.phone')} required>
          <Input dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0501234567" className="text-start" />
        </Field>
        <Field label={t('leads.email')} hint={t('common.optional')}>
          <Input dir="ltr" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="text-start" />
        </Field>
        <Field label={t('leads.branch')} hint="عجمان / dubai">
          <Input value={form.branch} onChange={(e) => set('branch', e.target.value)} />
        </Field>
        <Field label={t('leads.course')} hint="KPI / إدارة المشاريع">
          <Input value={form.course} onChange={(e) => set('course', e.target.value)} />
        </Field>
        <Field label={t('leads.platform')}>
          <Select value={form.platform} onChange={(e) => set('platform', e.target.value)}>
            <option value="fb">{t('source.meta_facebook')}</option>
            <option value="ig">{t('source.meta_instagram')}</option>
          </Select>
        </Field>

        <div className="sm:col-span-2 lg:col-span-3">
          <Button type="submit" variant="accent" loading={mutate.isPending} disabled={!form.fullName.trim() || !form.phone.trim()}>
            <Send className="h-4 w-4" />
            {t('settings.simulate')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
