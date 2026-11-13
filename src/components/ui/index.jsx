import { forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../context/LocaleContext.jsx';
import { initials } from '../../lib/format.js';

/** Join class names, dropping falsy ones. */
export const cx = (...parts) => parts.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
};

const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-55',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export function Field({ label, error, hint, required, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="label-base">
          {label}
          {required && <span className="ms-1 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cx('input-base', invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cx('input-base resize-y', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx('input-base cursor-pointer appearance-none bg-[length:16px] bg-no-repeat pe-9', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
        backgroundPosition: document.documentElement.dir === 'rtl' ? 'left 0.75rem center' : 'right 0.75rem center',
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-3 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-emerald-500' : 'bg-slate-300',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'start-[1.375rem]' : 'start-0.5',
          )}
        />
      </span>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({ className, children, ...props }) {
  return (
    <div className={cx('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, className, dot }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        className ?? 'bg-slate-100 text-slate-700 ring-slate-200',
      )}
    >
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 'md', className }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };
  return (
    <span
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700',
        sizes[size],
        className,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    // Stop the page behind from scrolling while the sheet is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      {/* Full-height sheet on phones, centred dialog from sm up. */}
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-pop animate-fade-in sm:rounded-2xl',
          widths[size],
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-brand-600', className)} />;
}

export function LoadingBlock({ rows = 3, className }) {
  return (
    <div className={cx('space-y-3', className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7" />
      </span>
      <p className="text-base font-bold text-slate-800">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-sm font-semibold text-rose-700">{message || t('errors.loadFailed')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export function Pagination({ page, pages, total, onChange }) {
  const { t } = useTranslation();
  const { isRtl } = useLocale();
  if (!pages || pages <= 1) return null;

  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
      <p className="text-sm text-slate-500">
        {total} {t('common.results')}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={t('common.previous')}>
          <Prev className="h-4 w-4" />
        </Button>
        <span className="px-2 text-sm font-semibold text-slate-700">
          {page} / {pages}
        </span>
        <Button variant="ghost" size="icon" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={t('common.next')}>
          <Next className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={cx('scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={cx(
            'shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition',
            active === tab.value ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span className={cx('ms-2 rounded-md px-1.5 py-0.5 text-xs', active === tab.value ? 'bg-white/20' : 'bg-slate-200 text-slate-600')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
