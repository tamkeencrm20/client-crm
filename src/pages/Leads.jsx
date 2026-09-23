import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Search, SlidersHorizontal, Shuffle, Upload, X, Users2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocale } from '../context/LocaleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useBranches, useCourses } from '../hooks/useReferenceData.js';
import { useLiveUpdates } from '../hooks/useLiveUpdates.js';
import { canEditLeads, isAdmin, isLeader, LEAD_SOURCES, PIPELINE_ORDER, ROLES } from '../lib/constants.js';
import { bilingual } from '../lib/format.js';
import { downloadLeadsWorkbook } from '../lib/exportSheet.js';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingBlock,
  Pagination,
  Select,
  Tabs,
  cx,
} from '../components/ui/index.jsx';
import { LeadRow } from '../components/leads/LeadBits.jsx';
import LeadFormModal from '../components/leads/LeadFormModal.jsx';
import ImportModal from '../components/leads/ImportModal.jsx';

const EMPTY_FILTERS = {
  status: '',
  source: '',
  branch: '',
  course: '',
  assignedTo: '',
  open: '',
  sort: 'newest',
};

export default function Leads() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const admin = isAdmin(user);
  const leader = isLeader(user);
  const canEdit = canEditLeads(user);

  useLiveUpdates(['leads']);

  const { data: branches } = useBranches();
  const { data: courses } = useCourses();

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const params = useMemo(() => {
    const p = { page, limit: 25, sort: filters.sort };
    if (debounced) p.search = debounced;
    if (filters.status) p.status = filters.status;
    if (filters.source) p.source = filters.source;
    if (filters.course) p.course = filters.course;
    if (filters.open) p.open = filters.open;
    if (admin && filters.branch) p.branch = filters.branch;
    if (filters.assignedTo) p.assignedTo = filters.assignedTo;
    return p;
  }, [page, debounced, filters, admin]);

  const leads = useQuery({
    queryKey: ['leads', 'list', params],
    queryFn: async () => (await api.get('/leads', { params })).data,
    placeholderData: (prev) => prev,
  });

  const pipeline = useQuery({
    queryKey: ['leads', 'pipeline'],
    queryFn: async () => (await api.get('/leads/stats/pipeline')).data.data,
  });

  /**
   * Export what is on screen. The same query params the list is using go to the
   * server, so the file matches the filters rather than dumping everything.
   */
  const runExport = async () => {
    setExporting(true);
    try {
      const { page: _page, limit: _limit, ...exportParams } = params;
      const { data } = await api.get('/leads/export', { params: exportParams });

      if (data.data.total === 0) {
        toast.error(t('export.empty'));
        return;
      }

      const count = downloadLeadsWorkbook({
        rows: data.data.rows,
        columns: data.data.columns,
        heading: (key) => t(`export.columns.${key}`, key),
        translate: (group, value) => t(`${group}.${value}`, value),
        locale,
      });

      toast.success(t('export.done', { count }));
      if (data.data.truncated) toast.error(t('export.truncated', { count }));
    } catch (err) {
      toast.error(errorMessage(err, t('export.failed')));
    } finally {
      setExporting(false);
    }
  };

  const distribute = useMutation({
    mutationFn: () => api.post('/leads/distribute/unassigned'),
    onSuccess: ({ data }) => {
      toast.success(t('leads.distributed', { assigned: data.data.assigned, total: data.data.total }));
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort').length;

  const statusTabs = [
    { value: '', label: t('common.all'), count: undefined },
    ...PIPELINE_ORDER.map((s) => ({ value: s, label: t(`status.${s}`), count: pipeline.data?.[s] })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('leads.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('leads.subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {leader && (
            <Button variant="secondary" onClick={() => distribute.mutate()} loading={distribute.isPending}>
              <Shuffle className="h-4 w-4" />
              <span className="hidden sm:inline">{t('leads.distributeQueue')}</span>
            </Button>
          )}
          <Button variant="secondary" onClick={runExport} loading={exporting}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('export.button')}</span>
          </Button>
          {canEdit && (
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('import.button')}</span>
            </Button>
          )}
          {canEdit && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('leads.newLead')}
            </Button>
          )}
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('leads.searchPlaceholder')}
            className="ps-11"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button variant={showFilters || activeFilterCount ? 'subtle' : 'secondary'} onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{t('common.filter')}</span>
          {activeFilterCount > 0 && (
            <span className="rounded-md bg-brand-600 px-1.5 text-xs font-black text-white">{activeFilterCount}</span>
          )}
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs tabs={statusTabs} active={filters.status} onChange={(v) => setFilter('status', v)} />

      {/* Filter drawer */}
      {showFilters && (
        <Card className="animate-fade-in p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {admin && (
              <Field label={t('leads.branch')}>
                <Select value={filters.branch} onChange={(e) => setFilter('branch', e.target.value)}>
                  <option value="">{t('common.all')}</option>
                  {(branches ?? []).map((b) => (
                    <option key={b._id} value={b._id}>
                      {bilingual(b.name, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label={t('leads.course')}>
              <Select value={filters.course} onChange={(e) => setFilter('course', e.target.value)}>
                <option value="">{t('common.all')}</option>
                {(courses ?? []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {bilingual(c.name, locale)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t('leads.source')}>
              <Select value={filters.source} onChange={(e) => setFilter('source', e.target.value)}>
                <option value="">{t('common.all')}</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {t(`source.${s}`)}
                  </option>
                ))}
              </Select>
            </Field>

            {leader && (
              <Field label={t('leads.assignedTo')}>
                <Select value={filters.assignedTo} onChange={(e) => setFilter('assignedTo', e.target.value)}>
                  <option value="">{t('common.all')}</option>
                  <option value="unassigned">{t('common.unassigned')}</option>
                  <option value="me">{t('leads.onlyMine')}</option>
                </Select>
              </Field>
            )}

            <Field label={t('leads.status')}>
              <Select value={filters.open} onChange={(e) => setFilter('open', e.target.value)}>
                <option value="">{t('common.all')}</option>
                <option value="true">{t('leads.openOnly')}</option>
                <option value="false">{t('leads.closedOnly')}</option>
              </Select>
            </Field>

            <Field label={t('common.filter')}>
              <Select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
                <option value="newest">{t('leads.sortNewest')}</option>
                <option value="oldest">{t('leads.sortOldest')}</option>
                <option value="activity">{t('leads.sortActivity')}</option>
                <option value="followup">{t('leads.sortFollowUp')}</option>
              </Select>
            </Field>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
                <X className="h-4 w-4" />
                {t('common.clearFilters')}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Results */}
      <Card className={cx('overflow-hidden', leads.isFetching && !leads.isLoading && 'opacity-70 transition-opacity')}>
        {leads.isLoading ? (
          <LoadingBlock rows={6} className="p-4" />
        ) : leads.isError ? (
          <ErrorState message={errorMessage(leads.error)} onRetry={leads.refetch} />
        ) : (leads.data?.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Users2}
            title={debounced || activeFilterCount ? t('common.noResults') : t('leads.empty')}
            hint={debounced || activeFilterCount ? t('common.noResultsHint') : t('leads.emptyHint')}
            action={
              !debounced && !activeFilterCount && canEdit ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t('leads.addLead')}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {leads.data.data.map((lead) => (
              <LeadRow key={lead._id} lead={lead} showAssignee={user.role !== ROLES.AGENT} />
            ))}
            <Pagination
              page={leads.data.pagination.page}
              pages={leads.data.pagination.pages}
              total={leads.data.pagination.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <LeadFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
