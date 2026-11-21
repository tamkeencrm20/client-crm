import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocale } from '../../context/LocaleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useBranches, useCourses } from '../../hooks/useReferenceData.js';
import { isAdmin, isLeader, LEAD_SOURCES, ROLES } from '../../lib/constants.js';
import { bilingual } from '../../lib/format.js';
import { Button, Field, Input, Modal, Select, Textarea, Switch } from '../ui/index.jsx';

const BLANK = {
  fullName: '',
  phone: '',
  email: '',
  branch: '',
  course: '',
  source: 'walk_in',
  note: '',
  autoAssign: true,
};

/**
 * Manual lead entry — walk-ins, phone enquiries, referrals.
 *
 * An agent's own branch is fixed and the lead stays with them, which mirrors
 * what the server does; leaders and admins pick the branch and can hand the
 * lead straight to the distribution engine.
 */
export default function LeadFormModal({ open, onClose, onCreated }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const admin = isAdmin(user);
  const leader = isLeader(user);
  const ownBranch = user.branch?._id ?? user.branch ?? '';

  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});

  const { data: branches } = useBranches();
  const { data: courses } = useCourses(form.branch ? { branch: form.branch } : {});

  useEffect(() => {
    if (open) {
      setForm({ ...BLANK, branch: admin ? '' : String(ownBranch) });
      setErrors({});
    }
  }, [open, admin, ownBranch]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const create = useMutation({
    mutationFn: (payload) => api.post('/leads', payload),
    onSuccess: ({ data }) => {
      toast.success(t('leads.created'));
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
      onCreated?.(data.data);
      if (data.data?._id) navigate(`/leads/${data.data._id}`);
    },
    onError: (err) => {
      const code = err?.response?.data?.error?.code;
      if (code === 'DUPLICATE_LEAD') {
        // Name the colleague who already has them. Without it the agent is
        // told to stop but not who to ask, and calls the person anyway.
        const owner = err?.response?.data?.error?.details?.assignedToName;
        setErrors({ phone: owner ? t('leads.duplicateOwned', { name: owner }) : t('leads.duplicate') });
        return;
      }
      toast.error(errorMessage(err));
    },
  });

  const submit = (e) => {
    e.preventDefault();

    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = t('common.required');
    if (form.phone.replace(/\D/g, '').length < 6) next.phone = t('common.required');
    if (!form.branch) next.branch = t('common.required');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      branch: form.branch,
      source: form.source,
      autoAssign: leader ? form.autoAssign : false,
    };
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.course) payload.course = form.course;
    if (form.note.trim()) payload.note = form.note.trim();

    create.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('leads.addLead')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button form="lead-form" type="submit" loading={create.isPending}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <form id="lead-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('leads.fullName')} required error={errors.fullName} className="sm:col-span-2">
            <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} invalid={!!errors.fullName} autoFocus />
          </Field>

          <Field label={t('leads.phone')} required error={errors.phone}>
            <Input
              dir="ltr"
              type="tel"
              inputMode="tel"
              placeholder="+971 50 123 4567"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              invalid={!!errors.phone}
              className="text-start"
            />
          </Field>

          <Field label={t('leads.email')} hint={t('common.optional')}>
            <Input dir="ltr" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="text-start" />
          </Field>

          <Field label={t('leads.branch')} required error={errors.branch}>
            <Select value={form.branch} onChange={(e) => set('branch', e.target.value)} disabled={!admin}>
              <option value="">{t('common.select')}</option>
              {(branches ?? []).map((b) => (
                <option key={b._id} value={b._id}>
                  {bilingual(b.name, locale)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('leads.course')} hint={t('common.optional')}>
            <Select value={form.course} onChange={(e) => set('course', e.target.value)}>
              <option value="">{t('common.select')}</option>
              {(courses ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {bilingual(c.name, locale)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('leads.source')} className="sm:col-span-2">
            <Select value={form.source} onChange={(e) => set('source', e.target.value)}>
              {LEAD_SOURCES.filter((s) => !s.startsWith('meta_') && s !== 'import').map((s) => (
                <option key={s} value={s}>
                  {t(`source.${s}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('leads.note')} hint={t('common.optional')} className="sm:col-span-2">
            <Textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} />
          </Field>
        </div>

        {leader ? (
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <Switch
              checked={form.autoAssign}
              onChange={(v) => set('autoAssign', v)}
              label={t('leads.redistribute')}
            />
          </div>
        ) : (
          <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
            {t('leads.assignToMe')}
          </p>
        )}
      </form>
    </Modal>
  );
}
