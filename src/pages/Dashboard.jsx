import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Users2,
  TrendingUp,
  Timer,
  Wallet,
  GraduationCap,
  AlertTriangle,
  UserX,
  CalendarClock,
} from 'lucide-react';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocale } from '../context/LocaleContext.jsx';
import { useBranches } from '../hooks/useReferenceData.js';
import { useLiveUpdates } from '../hooks/useLiveUpdates.js';
import { isAdmin, seesBranch, PIPELINE_ORDER, PLATFORM_STYLES, STATUS_STYLES, CHART_COLORS } from '../lib/constants.js';
import { bilingual, formatMinutes, formatMoney, formatNumber, formatDate } from '../lib/format.js';
import { Avatar, Badge, Card, CardHeader, EmptyState, LoadingBlock, Select, cx } from '../components/ui/index.jsx';

const RANGES = [
  { value: 7, key: 'range7' },
  { value: 30, key: 'range30' },
  { value: 90, key: 'range90' },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale, isRtl } = useLocale();
  const [days, setDays] = useState(30);
  const [branch, setBranch] = useState('');

  useLiveUpdates(['dashboard', 'leads']);

  const { data: branches } = useBranches();
  const admin = isAdmin(user);
  // Reporting panels follow branch visibility, which includes the media buyer.
  const leader = seesBranch(user);

  const params = {
    from: dayjs().subtract(days - 1, 'day').startOf('day').toISOString(),
    to: dayjs().endOf('day').toISOString(),
    ...(admin && branch ? { branch } : {}),
  };

  const overview = useQuery({
    queryKey: ['dashboard', 'overview', params],
    queryFn: async () => (await api.get('/dashboard/overview', { params })).data.data,
  });

  const agents = useQuery({
    queryKey: ['dashboard', 'agents', params],
    queryFn: async () => (await api.get('/dashboard/agents', { params })).data.data,
    enabled: leader,
  });

  const branchPerf = useQuery({
    queryKey: ['dashboard', 'branches', params],
    queryFn: async () => (await api.get('/dashboard/branches', { params })).data.data,
    enabled: admin,
  });

  const sources = useQuery({
    queryKey: ['dashboard', 'sources', params],
    queryFn: async () => (await api.get('/dashboard/sources', { params })).data.data,
    enabled: leader,
  });

  const team = useQuery({
    queryKey: ['dashboard', 'team-status'],
    queryFn: async () => (await api.get('/dashboard/team-status')).data.data,
    enabled: leader,
  });

  const o = overview.data?.overview;

  return (
    <div className="space-y-5">
      {/* Header + range picker */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('dashboard.subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {admin && (
            <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-auto min-w-[10rem]">
              <option value="">{t('dashboard.allBranches')}</option>
              {(branches ?? []).map((b) => (
                <option key={b._id} value={b._id}>
                  {bilingual(b.name, locale)}
                </option>
              ))}
            </Select>
          )}
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-auto min-w-[9rem]">
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {t(`dashboard.${r.key}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* KPI tiles */}
      {overview.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Stat Icon={Users2} label={t('dashboard.totalLeads')} value={formatNumber(o?.totalLeads, locale)} sub={`${t('dashboard.leadsToday')}: ${formatNumber(o?.leadsToday, locale)}`} tone="brand" />
          <Stat Icon={GraduationCap} label={t('dashboard.enrolled')} value={formatNumber(o?.enrolled, locale)} sub={`${t('dashboard.conversionRate')} ${o?.conversionRate ?? 0}%`} tone="emerald" />
          <Stat Icon={TrendingUp} label={t('dashboard.responseRate')} value={`${o?.responseRate ?? 0}%`} sub={`${t('dashboard.withinOneHour')} ${o?.respondedWithinOneHourRate ?? 0}%`} tone="violet" />
          <Stat Icon={Timer} label={t('dashboard.avgResponse')} value={formatMinutes(o?.avgResponseMinutes, t)} tone="amber" />
          <Stat Icon={Wallet} label={t('dashboard.revenue')} value={formatMoney(o?.revenue, locale)} tone="gold" />
          <Stat Icon={UserX} label={t('dashboard.unassigned')} value={formatNumber(o?.unassigned, locale)} tone={o?.unassigned > 0 ? 'rose' : 'slate'} />
          <Stat Icon={CalendarClock} label={t('dashboard.overdueFollowUps')} value={formatNumber(o?.overdueFollowUps, locale)} tone={o?.overdueFollowUps > 0 ? 'amber' : 'slate'} />
          <Stat Icon={AlertTriangle} label={t('status.new')} value={formatNumber(o?.byStatus?.new, locale)} tone="sky" />
        </div>
      )}

      {/* Trend + pipeline */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={t('dashboard.trend')} />
          <div className="p-3 sm:p-4">
            {overview.isLoading ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={overview.data?.trend ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#006473" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#006473" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gEnrolled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f76a0c" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#f76a0c" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => dayjs(d).format('D/M')}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    reversed={isRtl}
                    minTickGap={20}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} orientation={isRtl ? 'right' : 'left'} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 24px -8px rgba(8,52,60,.2)' }}
                    labelFormatter={(d) => formatDate(d, locale)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="leads" name={t('dashboard.leadsLabel')} stroke="#006473" strokeWidth={2} fill="url(#gLeads)" />
                  <Area type="monotone" dataKey="enrolled" name={t('dashboard.enrolledLabel')} stroke="#f76a0c" strokeWidth={2} fill="url(#gEnrolled)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('dashboard.pipeline')} />
          <div className="space-y-2.5 p-4">
            {PIPELINE_ORDER.map((status) => {
              const count = o?.byStatus?.[status] ?? 0;
              const total = o?.totalLeads || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <span className={cx('h-2 w-2 rounded-full', STATUS_STYLES[status].dot)} />
                      {t(`status.${status}`)}
                    </span>
                    <span className="font-bold tabular-nums text-slate-900">{formatNumber(count, locale)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: STATUS_STYLES[status].bar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Agent leaderboard */}
      {leader && (
        <Card>
          <CardHeader title={t('dashboard.topAgents')} />
          {agents.isLoading ? (
            <LoadingBlock className="p-4" />
          ) : (agents.data?.length ?? 0) === 0 ? (
            <EmptyState title={t('dashboard.noDataYet')} />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-start text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 text-start">{t('team.name')}</th>
                    <th className="px-3 py-3 text-start">{t('dashboard.totalLeads')}</th>
                    <th className="px-3 py-3 text-start">{t('status.contacted')}</th>
                    <th className="px-3 py-3 text-start">{t('dashboard.enrolled')}</th>
                    <th className="px-3 py-3 text-start">{t('dashboard.conversionRate')}</th>
                    <th className="px-3 py-3 text-start">{t('dashboard.avgResponse')}</th>
                    <th className="px-5 py-3 text-start">{t('dashboard.revenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.data.map((a, i) => (
                    <tr key={a.agentId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black',
                            i === 0 ? 'bg-gold-500 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-accent-200 text-accent-800' : 'bg-slate-100 text-slate-500')}>
                            {i + 1}
                          </span>
                          <Avatar name={a.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">{a.name}</p>
                            {a.branch?.name && <p className="truncate text-xs text-slate-500">{bilingual(a.branch.name, locale)}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold tabular-nums">{formatNumber(a.leads, locale)}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-600">{formatNumber(a.contacted, locale)}</td>
                      <td className="px-3 py-3 font-bold tabular-nums text-emerald-600">{formatNumber(a.enrolled, locale)}</td>
                      <td className="px-3 py-3 tabular-nums">{a.conversionRate}%</td>
                      <td className="px-3 py-3 tabular-nums text-slate-600">{formatMinutes(a.avgResponseMinutes, t)}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{formatMoney(a.revenue, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Branch comparison + sources */}
      <div className="grid gap-4 xl:grid-cols-2">
        {admin && (
          <Card>
            <CardHeader title={t('dashboard.branchPerformance')} />
            <div className="p-3 sm:p-4">
              {(branchPerf.data?.length ?? 0) === 0 ? (
                <EmptyState title={t('dashboard.noDataYet')} className="py-10" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={(branchPerf.data ?? []).map((b) => ({ ...b, label: bilingual(b.name, locale) }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} reversed={isRtl} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} orientation={isRtl ? 'right' : 'left'} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="leads" name={t('dashboard.leadsLabel')} fill="#006473" radius={[6, 6, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="enrolled" name={t('dashboard.enrolledLabel')} fill="#f76a0c" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        )}

        {leader && (
          <Card>
            <CardHeader title={t('dashboard.bySource')} />
            <div className="p-3 sm:p-4">
              {(sources.data?.bySource?.length ?? 0) === 0 ? (
                <EmptyState title={t('dashboard.noDataYet')} className="py-10" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={(sources.data.bySource ?? []).map((s) => ({ name: t(`source.${s._id}`), value: s.leads }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {(sources.data.bySource ?? []).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Which ad network is actually converting, not just delivering volume. */}
      {leader && (sources.data?.byPlatform?.length ?? 0) > 0 && (
        <Card>
          <CardHeader title={t('platform.performance')} />
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {sources.data.byPlatform.map((p) => (
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
                    {t('dashboard.enrolled')}{' '}
                    <b className="tabular-nums text-emerald-600">{formatNumber(p.enrolled, locale)}</b>
                  </span>
                  <span className="font-semibold tabular-nums text-slate-700">{formatMoney(p.revenue, locale)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Courses, campaigns, team */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {leader && (
          <Card>
            <CardHeader title={t('dashboard.byCourse')} />
            <div className="divide-y divide-slate-50">
              {(sources.data?.byCourse ?? []).length === 0 ? (
                <EmptyState title={t('dashboard.noDataYet')} className="py-10" />
              ) : (
                sources.data.byCourse.map((c) => (
                  <div key={c.courseId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="truncate text-sm font-semibold text-slate-700">{bilingual(c.name, locale)}</span>
                    <span className="shrink-0 text-sm tabular-nums text-slate-500">
                      {formatNumber(c.leads, locale)}
                      <span className="mx-1 text-slate-300">·</span>
                      <span className="font-bold text-emerald-600">{formatNumber(c.enrolled, locale)}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {leader && (
          <Card>
            <CardHeader title={t('dashboard.byCampaign')} />
            <div className="divide-y divide-slate-50">
              {(sources.data?.byCampaign ?? []).length === 0 ? (
                <EmptyState title={t('dashboard.noDataYet')} className="py-10" />
              ) : (
                sources.data.byCampaign.map((c) => (
                  <div key={`${c.network ?? 'none'}-${c._id}`} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-700">{c._id}</span>
                      {c.network && (
                        <Badge className={cx('shrink-0', PLATFORM_STYLES[c.network]?.chip)}>
                          {t(`platform.${c.network}`, c.network)}
                        </Badge>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-slate-500">
                      {formatNumber(c.leads, locale)}
                      <span className="mx-1 text-slate-300">·</span>
                      <span className="font-bold text-emerald-600">{formatNumber(c.enrolled, locale)}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {leader && (
          <Card>
            <CardHeader
              title={t('dashboard.teamStatus')}
              subtitle={team.data ? `${team.data.available} / ${team.data.total} ${t('dashboard.available')}` : undefined}
            />
            <div className="scroll-thin max-h-80 divide-y divide-slate-50 overflow-y-auto">
              {(team.data?.agents ?? []).length === 0 ? (
                <EmptyState title={t('team.empty')} className="py-10" />
              ) : (
                team.data.agents.map((a) => (
                  <div key={a._id} className="flex items-center gap-3 px-5 py-3">
                    <span className={cx('h-2 w-2 shrink-0 rounded-full', a.isAvailable ? 'bg-emerald-500' : 'bg-slate-300')} />
                    <Avatar name={a.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{a.name}</p>
                      {a.branch?.name && <p className="truncate text-xs text-slate-500">{bilingual(a.branch.name, locale)}</p>}
                    </div>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold tabular-nums text-slate-600">
                      {formatNumber(a.openLeadsCount, locale)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

const TONES = {
  brand: 'bg-brand-50 text-brand-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  violet: 'bg-violet-50 text-violet-700',
  amber: 'bg-amber-50 text-amber-700',
  gold: 'bg-gold-400/15 text-gold-600',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-500',
};

function Stat({ Icon, label, value, sub, tone = 'brand' }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">{label}</p>
        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">{value}</p>
      {sub && <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}
