import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocale } from '../context/LocaleContext.jsx';
import { errorMessage } from '../lib/api.js';
import { Button, Field, Input } from '../components/ui/index.jsx';

export default function Login() {
  const { t } = useTranslation();
  const { login, expired, dismissExpired } = useAuth();
  const { locale, setLocale } = useLocale();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(expired ? t('auth.sessionExpired') : '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (expired) dismissExpired();
  }, [expired, dismissExpired]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err, t('common.somethingWrong')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel — a band on phones, the left half on desktop. */}
      <div className="relative flex shrink-0 items-center overflow-hidden bg-brand-600 px-6 py-10 text-white sm:px-10 lg:w-[45%] lg:py-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #36748b 0, transparent 45%), radial-gradient(circle at 80% 70%, #f76a0c 0, transparent 40%)',
          }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto w-full max-w-md">
          {/* The wordmark is black on transparent, so it sits on a white card
              rather than directly on the brand teal, where it would disappear. */}
          <div className="inline-flex rounded-2xl bg-white px-5 py-4 shadow-lg">
            <img
              src="/logo.png"
              alt={t('app.fullName')}
              width={720}
              height={371}
              className="h-auto w-44 sm:w-52"
            />
          </div>
          <p className="mt-4 text-sm text-white/70">{t('app.tagline')}</p>

          <h1 className="mt-8 text-2xl font-black leading-snug sm:text-3xl lg:mt-12 lg:text-4xl">
            {t('app.name')}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80 lg:text-base">
            {t('auth.welcomeSub')}
          </p>

          <div className="mt-8 hidden gap-6 lg:flex">
            {['dashboard.totalLeads', 'dashboard.conversionRate', 'dashboard.responseRate'].map((key) => (
              <div key={key} className="border-s-2 border-accent-500 ps-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{t('auth.welcome')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('auth.signIn')}</p>
            </div>
            <button
              type="button"
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
            >
              <Languages className="h-[18px] w-[18px]" />
              {locale === 'ar' ? 'EN' : 'ع'}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label={t('auth.email')} required>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  autoComplete="username"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@tamkeentraining.com"
                  className="ps-11 text-start"
                />
              </div>
            </Field>

            <Field label={t('auth.password')} required>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  dir="ltr"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="px-11 text-start"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'hide' : 'show'}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </Field>

            {error && (
              <div role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={busy} className="w-full">
              {busy ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {t('app.fullName')}
          </p>
        </div>
      </div>
    </div>
  );
}
