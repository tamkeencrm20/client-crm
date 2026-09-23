import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, RefreshCcw, Search, UserCircle2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocale } from '../context/LocaleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useBranches } from '../hooks/useReferenceData.js';
import { isAdmin, ROLES } from '../lib/constants.js';
import { bilingual, formatNumber, fromNow } from '../lib/format.js';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Pagination,
  Select,
  Switch,
  Tabs,
  cx,
} from '../components/ui/index.jsx';

export default function Team() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();

  const admin = isAdmin(user);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [branch, setBranch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // user object, or 'new'
  const [resetting, setResetting] = useState(null);

  const { data: branches } = useBranches();

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const params = { page, limit: 24 };
  if (role) params.role = role;
  if (debounced) params.search = debounced;
  if (admin && branch) params.branch = branch;

  const users = useQuery({
    queryKey: ['users', 'list', params],
    queryFn: async () => (await api.get('/users', { params })).data,
    placeholderData: (prev) => prev,
  });

  const recalculate = useMutation({
    mutationFn: () => api.post('/users/recalculate-loads'),
    onSuccess: () => {
      toast.success(t('team.recalculated'));
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const roleTabs = [
    { value: '', label: t('common.all') },
    { value: ROLES.AGENT, label: t('roles.agent') },
    { value: ROLES.MEDIA_BUYER, label: t('roles.media_buyer') },
    { value: ROLES.TEAM_LEADER, label: t('roles.team_leader') },
    ...(admin ? [{ value: ROLES.ADMIN, label: t('roles.admin') }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('team.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('team.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {admin && (
            <Button variant="secondary" onClick={() => recalculate.mutate()} loading={recalculate.isPending}>
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">{t('team.recalculate')}</span>
            </Button>
          )}
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" />
            {t('team.addUser')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="ps-11" />
        </div>
        {admin && (
          <Select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} className="w-auto min-w-[11rem]">
            <option value="">{t('dashboard.allBranches')}</option>
            {(branches ?? []).map((b) => (
              <option key={b._id} value={b._id}>
                {bilingual(b.name, locale)}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Tabs tabs={roleTabs} active={role} onChange={(v) => { setRole(v); setPage(1); }} />

      {users.isLoading ? (
        <LoadingBlock rows={6} />
      ) : users.isError ? (
        <ErrorState message={errorMessage(users.error)} onRetry={users.refetch} />
      ) : (users.data?.data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState icon={UserCircle2} title={t('team.empty')} />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {users.data.data.map((u) => (
              <Card key={u._id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{u.name}</p>
                    <p dir="ltr" className="truncate text-start text-xs text-slate-500">{u.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge className="bg-brand-50 text-brand-700 ring-brand-200">{t(`roles.${u.role}`)}</Badge>
                      {u.branch && (
                        <Badge className="bg-slate-100 text-slate-600 ring-slate-200">{bilingual(u.branch.name, locale)}</Badge>
                      )}
                      {!u.isActive && <Badge className="bg-rose-100 text-rose-700 ring-rose-200">{t('team.inactive')}</Badge>}
                      {u.isActive && u.role === ROLES.AGENT && (
                        <Badge className={u.isAvailable ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'} dot={u.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}>
                          {u.isAvailable ? t('team.availableNow') : t('team.notAvailable')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {u.role === ROLES.AGENT && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                    <div>
                      <p className="text-lg font-black tabular-nums text-slate-900">{formatNumber(u.openLeadsCount, locale)}</p>
                      <p className="text-[11px] font-semibold text-slate-500">{t('team.openLeads')}</p>
                    </div>
                    <div>
                      <p className="text-lg font-black tabular-nums text-slate-900">{formatNumber(u.totalLeadsCount, locale)}</p>
                      <p className="text-[11px] font-semibold text-slate-500">{t('team.totalLeads')}</p>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-slate-400">
                    {u.lastLoginAt ? `${t('team.lastLogin')}: ${fromNow(u.lastLoginAt, locale)}` : '—'}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setResetting(u)} title={t('team.resetPassword')}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(u)} title={t('common.edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <Pagination
              page={users.data.pagination.page}
              pages={users.data.pagination.pages}
              total={users.data.pagination.total}
              onChange={setPage}
            />
          </Card>
        </>
      )}

      <UserFormModal open={Boolean(editing)} target={editing} onClose={() => setEditing(null)} />
      <ResetPasswordModal open={Boolean(resetting)} target={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------

const BLANK = { name: '', email: '', password: '', phone: '', role: ROLES.AGENT, branch: '', dailyLeadCap: 0 };

function UserFormModal({ open, target, onClose }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();

  const admin = isAdmin(user);
  const isNew = target === 'new';
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});

  const { data: branches } = useBranches();

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (isNew) {
      setForm({ ...BLANK, branch: admin ? '' : String(user.branch?._id ?? user.branch ?? '') });
    } else if (target) {
      setForm({
        name: target.name ?? '',
        email: target.email ?? '',
        password: '',
        phone: target.phone ?? '',
        role: target.role,
        branch: String(target.branch?._id ?? target.branch ?? ''),
        dailyLeadCap: target.dailyLeadCap ?? 0,
        isActive: target.isActive,
        isAvailable: target.isAvailable,
      });
    }
  }, [open, target, isNew, admin, user]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const mutate = useMutation({
    mutationFn: (payload) => (isNew ? api.post('/users', payload) : api.patch(`/users/${target._id}`, payload)),
    onSuccess: () => {
      toast.success(isNew ? t('team.userCreated') : t('team.userUpdated'));
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = (e) => {
    e.preventDefault();

    const next = {};
    if (form.name.trim().length < 2) next.name = t('common.required');
    if (isNew && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = t('common.required');
    if (isNew && form.password.length < 8) next.password = '8+';
    if (form.role !== ROLES.ADMIN && !form.branch) next.branch = t('common.required');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (isNew) {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        dailyLeadCap: Number(form.dailyLeadCap) || 0,
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.role !== ROLES.ADMIN) payload.branch = form.branch;
      mutate.mutate(payload);
      return;
    }

    // Updates only send what the server lets this caller change.
    const payload = {
      name: form.name.trim(),
      dailyLeadCap: Number(form.dailyLeadCap) || 0,
      isActive: form.isActive,
      isAvailable: form.isAvailable,
    };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (admin) {
      payload.role = form.role;
      if (form.role !== ROLES.ADMIN) payload.branch = form.branch;
    }
    mutate.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? t('team.addUser') : t('team.editUser')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button form="user-form" type="submit" loading={mutate.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t('team.name')} required error={errors.name} className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} autoFocus />
        </Field>

        <Field label={t('auth.email')} required={isNew} error={errors.email}>
          <Input dir="ltr" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} disabled={!isNew} invalid={!!errors.email} className="text-start" />
        </Field>

        {isNew && (
          <Field label={t('auth.password')} required error={errors.password} hint="8+">
            <Input dir="ltr" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} invalid={!!errors.password} className="text-start" />
          </Field>
        )}

        <Field label={t('leads.phone')} hint={t('common.optional')}>
          <Input dir="ltr" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="text-start" />
        </Field>

        <Field label={t('team.role')}>
          <Select value={form.role} onChange={(e) => set('role', e.target.value)} disabled={!admin}>
            <option value={ROLES.AGENT}>{t('roles.agent')}</option>
            {admin && <option value={ROLES.MEDIA_BUYER}>{t('roles.media_buyer')}</option>}
            {admin && <option value={ROLES.TEAM_LEADER}>{t('roles.team_leader')}</option>}
            {admin && <option value={ROLES.ADMIN}>{t('roles.admin')}</option>}
          </Select>
        </Field>

        {form.role !== ROLES.ADMIN && (
          <Field label={t('team.branch')} required error={errors.branch}>
            <Select value={form.branch} onChange={(e) => set('branch', e.target.value)} disabled={!admin}>
              <option value="">{t('common.select')}</option>
              {(branches ?? []).map((b) => (
                <option key={b._id} value={b._id}>
                  {bilingual(b.name, locale)}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label={t('team.dailyCap')} hint={t('team.dailyCapHint')}>
          <Input type="number" min="0" dir="ltr" value={form.dailyLeadCap} onChange={(e) => set('dailyLeadCap', e.target.value)} className="text-start" />
        </Field>

        {!isNew && (
          <div className="flex flex-col justify-center gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2">
            <Switch checked={Boolean(form.isActive)} onChange={(v) => set('isActive', v)} label={t('team.active')} />
            {form.role === ROLES.AGENT && (
              <Switch checked={Boolean(form.isAvailable)} onChange={(v) => set('isAvailable', v)} label={t('team.availableNow')} />
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ open, target, onClose }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setPw('');
      setConfirm('');
      setError('');
    }
  }, [open]);

  const mutate = useMutation({
    mutationFn: () => api.post(`/users/${target._id}/reset-password`, { newPassword: pw }),
    onSuccess: () => {
      toast.success(t('team.passwordReset'));
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = (e) => {
    e.preventDefault();
    if (pw.length < 8) return setError('8+');
    if (pw !== confirm) return setError(t('auth.passwordsDontMatch'));
    setError('');
    mutate.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('team.resetPassword')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button form="reset-form" type="submit" loading={mutate.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="reset-form" onSubmit={submit} className="space-y-4">
        <p className={cx('rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600')}>{target?.name}</p>
        <Field label={t('auth.newPassword')} required error={error}>
          <Input dir="ltr" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="text-start" autoFocus />
        </Field>
        <Field label={t('auth.confirmPassword')} required>
          <Input dir="ltr" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="text-start" />
        </Field>
      </form>
    </Modal>
  );
}
