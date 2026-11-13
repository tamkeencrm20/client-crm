import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, GraduationCap, Pencil, Plus, Search, Wallet } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocale } from '../context/LocaleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useBranches, useCourses } from '../hooks/useReferenceData.js';
import { isAdmin } from '../lib/constants.js';
import { bilingual, formatMoney } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Switch,
  Textarea,
  cx,
} from '../components/ui/index.jsx';

export default function Courses() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const admin = isAdmin(user);
  const { data: courses, isLoading } = useCourses(admin ? { includeInactive: 'true' } : {});

  const filtered = (courses ?? []).filter((c) => {
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return [c.code, c.name?.ar, c.name?.en].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('courses.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('courses.subtitle')}</p>
        </div>
        {admin && (
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" />
            {t('courses.addCourse')}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="ps-11" />
      </div>

      {isLoading ? (
        <LoadingBlock rows={4} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={GraduationCap} title={search ? t('common.noResults') : t('courses.empty')} hint={search ? t('common.noResultsHint') : undefined} />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c._id} className={cx('flex flex-col p-5', !c.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <Badge className="bg-brand-50 font-mono text-brand-700 ring-brand-200">{c.code}</Badge>
                {admin && (
                  <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <h2 className="mt-3 font-bold leading-snug text-slate-900">{bilingual(c.name, locale)}</h2>
              {c.category && <p className="mt-1 text-xs text-slate-500">{bilingual(c.category, locale)}</p>}

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-sm">
                <span className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Wallet className="h-4 w-4 text-slate-400" />
                  {formatMoney(c.price, locale, c.currency)}
                </span>
                {c.durationHours > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {c.durationHours} {t('common.hours')}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(c.branches ?? []).length === 0 ? (
                  <Badge className="bg-slate-100 text-slate-600 ring-slate-200">{t('courses.allBranches')}</Badge>
                ) : (
                  c.branches.map((b) => (
                    <Badge key={b._id ?? b} className="bg-slate-100 text-slate-600 ring-slate-200">
                      {b.name ? bilingual(b.name, locale) : b.code}
                    </Badge>
                  ))
                )}
                {!c.isActive && <Badge className="bg-rose-100 text-rose-700 ring-rose-200">{t('team.inactive')}</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {admin && <CourseFormModal open={Boolean(editing)} target={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

const BLANK = {
  code: '',
  nameAr: '',
  nameEn: '',
  categoryAr: '',
  categoryEn: '',
  descriptionAr: '',
  price: 0,
  durationHours: '',
  branches: [],
  isActive: true,
};

function CourseFormModal({ open, target, onClose }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const isNew = target === 'new';

  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const { data: branches } = useBranches();

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (isNew) setForm(BLANK);
    else if (target)
      setForm({
        code: target.code ?? '',
        nameAr: target.name?.ar ?? '',
        nameEn: target.name?.en ?? '',
        categoryAr: target.category?.ar ?? '',
        categoryEn: target.category?.en ?? '',
        descriptionAr: target.description?.ar ?? '',
        price: target.price ?? 0,
        durationHours: target.durationHours ?? '',
        branches: (target.branches ?? []).map((b) => String(b._id ?? b)),
        isActive: target.isActive,
      });
  }, [open, target, isNew]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const toggleBranch = (id) =>
    setForm((f) => ({
      ...f,
      branches: f.branches.includes(id) ? f.branches.filter((b) => b !== id) : [...f.branches, id],
    }));

  const mutate = useMutation({
    mutationFn: (payload) => (isNew ? api.post('/courses', payload) : api.patch(`/courses/${target._id}`, payload)),
    onSuccess: () => {
      toast.success(isNew ? t('courses.created') : t('courses.updated'));
      qc.invalidateQueries({ queryKey: ['courses'] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = (e) => {
    e.preventDefault();

    const next = {};
    if (isNew && form.code.trim().length < 2) next.code = t('common.required');
    if (!form.nameAr.trim()) next.nameAr = t('common.required');
    if (!form.nameEn.trim()) next.nameEn = t('common.required');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      name: { ar: form.nameAr.trim(), en: form.nameEn.trim() },
      price: Number(form.price) || 0,
      branches: form.branches,
    };
    if (isNew) payload.code = form.code.trim().toUpperCase();
    else payload.isActive = form.isActive;
    if (form.categoryAr.trim() || form.categoryEn.trim())
      payload.category = { ar: form.categoryAr.trim(), en: form.categoryEn.trim() };
    if (form.descriptionAr.trim()) payload.description = { ar: form.descriptionAr.trim(), en: '' };
    if (form.durationHours !== '') payload.durationHours = Number(form.durationHours);

    mutate.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? t('courses.addCourse') : t('courses.editCourse')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button form="course-form" type="submit" loading={mutate.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="course-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t('courses.code')} required={isNew} error={errors.code} className="sm:col-span-2">
          <Input dir="ltr" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} disabled={!isNew} invalid={!!errors.code} className="text-start font-mono" />
        </Field>

        <Field label={t('courses.nameAr')} required error={errors.nameAr}>
          <Input dir="rtl" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} invalid={!!errors.nameAr} />
        </Field>
        <Field label={t('courses.nameEn')} required error={errors.nameEn}>
          <Input dir="ltr" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} invalid={!!errors.nameEn} className="text-start" />
        </Field>

        <Field label={t('courses.categoryAr')} hint={t('common.optional')}>
          <Input dir="rtl" value={form.categoryAr} onChange={(e) => set('categoryAr', e.target.value)} />
        </Field>
        <Field label={t('courses.categoryEn')} hint={t('common.optional')}>
          <Input dir="ltr" value={form.categoryEn} onChange={(e) => set('categoryEn', e.target.value)} className="text-start" />
        </Field>

        <Field label={t('courses.price')}>
          <Input type="number" min="0" step="50" dir="ltr" value={form.price} onChange={(e) => set('price', e.target.value)} className="text-start" />
        </Field>
        <Field label={t('courses.duration')} hint={t('common.optional')}>
          <Input type="number" min="0" dir="ltr" value={form.durationHours} onChange={(e) => set('durationHours', e.target.value)} className="text-start" />
        </Field>

        <Field label={t('courses.branches')} hint={t('courses.allBranches')} className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(branches ?? []).map((b) => (
              <button
                key={b._id}
                type="button"
                onClick={() => toggleBranch(b._id)}
                className={cx(
                  'rounded-xl border-2 px-3 py-2 text-sm font-semibold transition',
                  form.branches.includes(b._id) ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                {bilingual(b.name, locale)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('leads.note')} hint={t('common.optional')} className="sm:col-span-2">
          <Textarea value={form.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} rows={2} />
        </Field>

        {!isNew && (
          <div className="rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2">
            <Switch checked={Boolean(form.isActive)} onChange={(v) => set('isActive', v)} label={t('team.active')} />
          </div>
        )}
      </form>
    </Modal>
  );
}
