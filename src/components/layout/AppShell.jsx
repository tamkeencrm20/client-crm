import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ListChecks,
  Users2,
  Building2,
  GraduationCap,
  UserCircle2,
  Settings,
  Radio as RadioIcon,
  Menu,
  X,
  LogOut,
  Languages,
  ChevronDown,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocale } from '../../context/LocaleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLES } from '../../lib/constants.js';
import { Avatar, Button, Switch, cx } from '../ui/index.jsx';
import NotificationBell from './NotificationBell.jsx';
import api from '../../lib/api.js';

/** Nav entries, each gated by the roles allowed to see it. */
const NAV = [
  { to: '/', key: 'dashboard', Icon: LayoutDashboard, end: true },
  { to: '/queue', key: 'myQueue', Icon: ListChecks, roles: [ROLES.AGENT, ROLES.TEAM_LEADER] },
  { to: '/leads', key: 'leads', Icon: Users2 },
  { to: '/platforms', key: 'platforms', Icon: RadioIcon, roles: [ROLES.MEDIA_BUYER, ROLES.ADMIN] },
  { to: '/team', key: 'team', Icon: UserCircle2, roles: [ROLES.TEAM_LEADER, ROLES.ADMIN] },
  { to: '/branches', key: 'branches', Icon: Building2, roles: [ROLES.ADMIN] },
  { to: '/courses', key: 'courses', Icon: GraduationCap },
  { to: '/settings', key: 'settings', Icon: Settings },
];

export default function AppShell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Navigating always closes the mobile drawer.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const items = NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-slate-200 bg-white lg:flex">
        <SidebarContent items={items} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-pop">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 end-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent items={items} />
          </aside>
        </div>
      )}

      <div className="lg:ms-64">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ items }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <>
      <div className="border-b border-slate-100 px-5 py-5">
        {/* The lockup already carries the centre's name in both languages, so
            it stands alone rather than being captioned twice over. */}
        <img
          src="/logo-compact.png"
          alt={t('app.fullName')}
          width={240}
          height={124}
          className="h-auto w-full max-w-[9.5rem]"
        />
      </div>

      <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(({ to, key, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{t(`roles.${user.role}`)}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Topbar({ onMenu }) {
  const { t } = useTranslation();
  const { user, logout, patchUser } = useAuth();
  const { locale, setLocale } = useLocale();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingAvailability, setSaving] = useState(false);

  const toggleAvailability = async (next) => {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me/availability', { isAvailable: next });
      patchUser({ isAvailable: data.data.isAvailable });
      toast.success(next ? t('team.availabilityOn') : t('team.availabilityOff'));
    } catch {
      toast.error(t('common.somethingWrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          aria-label={t('nav.dashboard')}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* An agent's on-shift switch is the one control that has to be reachable
            from anywhere, so it lives in the bar rather than a settings page. */}
        {user.role === ROLES.AGENT && (
          <div className="hidden items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-1.5 sm:flex">
            <Radio className={cx('h-4 w-4', user.isAvailable ? 'text-emerald-500' : 'text-slate-400')} />
            <Switch checked={Boolean(user.isAvailable)} onChange={toggleAvailability} disabled={savingAvailability} />
            <span className="text-xs font-semibold text-slate-600">
              {user.isAvailable ? t('team.availableNow') : t('team.notAvailable')}
            </span>
          </div>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          title={t('settings.language')}
        >
          <Languages className="h-[18px] w-[18px]" />
          <span>{locale === 'ar' ? 'EN' : 'ع'}</span>
        </button>

        <NotificationBell />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-100"
          >
            <Avatar name={user.name} size="sm" />
            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="absolute end-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-fade-in">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-600">{t(`roles.${user.role}`)}</p>
                </div>

                {user.role === ROLES.AGENT && (
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:hidden">
                    <span className="text-sm font-semibold text-slate-700">{t('team.myAvailability')}</span>
                    <Switch checked={Boolean(user.isAvailable)} onChange={toggleAvailability} disabled={savingAvailability} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  {t('auth.signOut')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
