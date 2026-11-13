import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Building2, MapPin, Pencil, Phone, Plus, Power, Shuffle } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useLocale } from '../context/LocaleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useBranches } from '../hooks/useReferenceData.js';
import { DISTRIBUTION_STRATEGIES } from '../lib/constants.js';
import { bilingual, formatNumber } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Select,
  Switch,
  cx,
} from '../components/ui/index.jsx';

export default function Branches() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [editing, setEditing] = useState(null);

  const { data: branches, isLoading } = useBranches();

  // One summary request per branch, run in parallel.
  const summaries = useQueries({
    queries: (branches ?? []).map((b) => ({
      queryKey: ['branches', 'summary', b._id],
      queryFn: async () => (await api.get(`/branches/${b._id}/summary`)).data.data,
      staleTime: 60_000,
    })),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('branches.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('branches.subtitle')}</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          {t('branches.addBranch')}
        </Button>
      </div>

      {isLoading ? (
        <LoadingBlock rows={3} />
      ) : (branches?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState icon={Building2} title={t('branches.empty')} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b, i) => {
            const summary = summaries[i]?.data;
            return (
              <Card key={b._id} className={cx('overflow-hidden', !b.isActive && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3 bg-brand-600 px-5 py-4 text-white">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black">{bilingual(b.name, locale)}</h2>
                    <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-white/60">{b.code}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/15 hover:text-white" onClick={() => setEditing(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2.5 px-5 py-4 text-sm">
                  {b.city && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{bilingual(b.city, locale) || b.address}</span>
                    </p>
                  )}
                  {b.phone && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <span dir="ltr" className="truncate">{b.phone}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4 shrink-0 text-slate-400" />
                    <Badge className="bg-brand-50 text-brand-700 ring-brand-200">{t(`strategy.${b.distributionStrategy}`)}</Badge>
                    {!b.isActive && <Badge className="bg-rose-100 text-rose-700 ring-rose-200">{t('team.inactive')}</Badge>}
                  </p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 text-center rtl:divide-x-reverse">
                  <Metric label={t('branches.team')} value={summary ? (summary.team.agent ?? 0) + (summary.team.team_leader ?? 0) : '—'} locale={locale} />
                  <Metric label={t('branches.openLeads')} value={summary?.openLeads} locale={locale} />
                  <Metric label={t('branches.totalLeads')} value={summary?.totalLeads} locale={locale} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BranchFormModal open={Boolean(editing)} target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function Metric({ label, value, locale }) {
  return (
    <div className="px-2 py-3">
      <p className="text-xl font-black tabular-nums text-slate-900">
        {value == null ? '—' : formatNumber(value, locale)}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

const BLANK = {
  code: '',
  nameAr: '',
  nameEn: '',
  cityAr: '',
  cityEn: '',
  address: '',
  phone: '',
  email: '',
  distributionStrategy: 'round_robin',
  isActive: true,
};

function BranchFormModal({ open, target, onClose }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const isNew = target === 'new';

  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (isNew) setForm(BLANK);
    else if (target)
      setForm({
        code: target.code ?? '',
        nameAr: target.name?.ar ?? '',
        nameEn: target.name?.en ?? '',
        cityAr: target.city?.ar ?? '',
        cityEn: target.city?.en ?? '',
        address: target.address ?? '',
        phone: target.phone ?? '',
        email: target.email ?? '',
        distributionStrategy: target.distributionStrategy ?? 'round_robin',
        isActive: target.isActive,
      });
  }, [open, target, isNew]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const mutate = useMutation({
    mutationFn: (payload) => (isNew ? api.post('/branches', payload) : api.patch(`/branches/${target._id}`, payload)),
    onSuccess: () => {
      toast.success(isNew ? t('branches.created') : t('branches.updated'));
      qc.invalidateQueries({ queryKey: ['branches'] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = (e) => {
    e.preventDefault();

    const next = {};
    if (isNew && !/^[a-z0-9_-]+$/.test(form.code)) next.code = t('branches.codeHint');
    if (!form.nameAr.trim()) next.nameAr = t('common.required');
    if (!form.nameEn.trim()) next.nameEn = t('common.required');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      name: { ar: form.nameAr.trim(), en: form.nameEn.trim() },
      distributionStrategy: form.distributionStrategy,
    };
    if (isNew) payload.code = form.code.trim().toLowerCase();
    else payload.isActive = form.isActive;
    if (form.cityAr.trim() || form.cityEn.trim()) payload.city = { ar: form.cityAr.trim(), en: form.cityEn.trim() };
    if (form.address.trim()) payload.address = form.address.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.email.trim()) payload.email = form.email.trim();

    mutate.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? t('branches.addBranch') : t('branches.editBranch')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button form="branch-form" type="submit" loading={mutate.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="branch-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t('branches.code')} required={isNew} error={errors.code} hint={isNew ? t('branches.codeHint') : undefined} className="sm:col-span-2">
          <Input dir="ltr" value={form.code} onChange={(e) => set('code', e.target.value.toLowerCase())} disabled={!isNew} invalid={!!errors.code} className="text-start font-mono" />
        </Field>

        <Field label={t('branches.nameAr')} required error={errors.nameAr}>
          <Input dir="rtl" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} invalid={!!errors.nameAr} />
        </Field>
        <Field label={t('branches.nameEn')} required error={errors.nameEn}>
          <Input dir="ltr" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} invalid={!!errors.nameEn} className="text-start" />
        </Field>

        <Field label={t('branches.cityAr')} hint={t('common.optional')}>
          <Input dir="rtl" value={form.cityAr} onChange={(e) => set('cityAr', e.target.value)} />
        </Field>
        <Field label={t('branches.cityEn')} hint={t('common.optional')}>
          <Input dir="ltr" value={form.cityEn} onChange={(e) => set('cityEn', e.target.value)} className="text-start" />
        </Field>

        <Field label={t('branches.address')} hint={t('common.optional')} className="sm:col-span-2">
          <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>

        <Field label={t('branches.phone')} hint={t('common.optional')}>
          <Input dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="text-start" />
        </Field>
        <Field label={t('branches.email')} hint={t('common.optional')}>
          <Input dir="ltr" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="text-start" />
        </Field>

        <Field label={t('branches.strategy')} className="sm:col-span-2">
          <Select value={form.distributionStrategy} onChange={(e) => set('distributionStrategy', e.target.value)}>
            {DISTRIBUTION_STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {t(`strategy.${s}`)}
              </option>
            ))}
          </Select>
        </Field>

        {!isNew && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2">
            <Power className="h-4 w-4 text-slate-400" />
            <Switch checked={Boolean(form.isActive)} onChange={(v) => set('isActive', v)} label={t('team.active')} />
          </div>
        )}
      </form>
    </Modal>
  );
}
