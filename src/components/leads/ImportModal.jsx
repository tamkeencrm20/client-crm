import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import api, { errorMessage } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocale } from '../../context/LocaleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useBranches } from '../../hooks/useReferenceData.js';
import { isAdmin, isLeader, isMediaBuyer, IMPORT_COLUMNS, IMPORT_MAX_ROWS } from '../../lib/constants.js';
import { bilingual, formatNumber } from '../../lib/format.js';
import { Badge, Button, Field, LoadingBlock, Modal, Select, cx } from '../ui/index.jsx';

const PREVIEW_ROWS = 5;

/** Server-side reason strings, mapped to translation keys. */
const REASON_KEYS = {
  'Missing a name': 'reasonMissingName',
  'Missing or unreadable phone number': 'reasonMissingPhone',
  'Repeated earlier in this same file': 'reasonRepeatedInFile',
  'Already in the CRM': 'reasonAlreadyExists',
};

/**
 * Bring an existing customer list into the CRM.
 *
 * The workbook is parsed here in the browser rather than uploaded: the person
 * sees their own rows and which columns were understood before anything is
 * written, and a corrupt file fails on their screen instead of in a request.
 * Only plain rows travel to the server.
 *
 * Where the leads land is decided by the server from the caller's role; this
 * dialog only says out loud what is about to happen.
 */
export default function ImportModal({ open, onClose }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [parseError, setParseError] = useState('');
  const [reading, setReading] = useState(false);
  const [branch, setBranch] = useState('');
  const [report, setReport] = useState(null);
  const [dragging, setDragging] = useState(false);

  const admin = isAdmin(user);
  const { data: branches } = useBranches();

  const reset = useCallback(() => {
    setFileName('');
    setRows([]);
    setHeaders([]);
    setParseError('');
    setReport(null);
    setReading(false);
    setDragging(false);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setBranch('');
    }
  }, [open, reset]);

  /** Which of the recognised columns this particular file actually contains. */
  const detected = useMemo(() => {
    const lower = headers.map((h) => String(h).toLowerCase().trim());
    return IMPORT_COLUMNS.map((col) => ({
      ...col,
      found: col.aliases.some((a) => lower.some((h) => h === a || h.includes(a))),
    }));
  }, [headers]);

  const missingRequired = detected.filter((c) => c.required && !c.found);

  const readFile = useCallback(
    async (file) => {
      if (!file) return;
      setReading(true);
      setParseError('');
      setReport(null);

      try {
        const buffer = await file.arrayBuffer();
        const book = XLSX.read(buffer, { type: 'array' });
        const sheet = book.Sheets[book.SheetNames[0]];
        // defval keeps empty cells as empty strings so column positions stay
        // aligned; raw:false renders dates and numbers the way they look in Excel.
        const parsed = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

        if (parsed.length === 0) {
          setParseError(t('import.empty'));
          setRows([]);
          setHeaders([]);
          return;
        }
        if (parsed.length > IMPORT_MAX_ROWS) {
          setParseError(t('import.tooMany', { count: parsed.length, max: IMPORT_MAX_ROWS }));
          setRows([]);
          setHeaders([]);
          return;
        }

        setRows(parsed);
        setHeaders(Object.keys(parsed[0]));
        setFileName(file.name);
      } catch {
        setParseError(t('import.parseFailed'));
        setRows([]);
        setHeaders([]);
      } finally {
        setReading(false);
      }
    },
    [t],
  );

  const runImport = useMutation({
    mutationFn: (dryRun) =>
      api.post('/leads/import', {
        rows,
        ...(admin && branch ? { branch } : {}),
        dryRun,
      }),
    onSuccess: ({ data }, dryRun) => {
      setReport(data.data);
      if (!dryRun) {
        qc.invalidateQueries({ queryKey: ['leads'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        qc.invalidateQueries({ queryKey: ['users'] });
        toast.success(t('import.done'));
      }
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const ownershipKey = admin
    ? 'ownershipAdmin'
    : isMediaBuyer(user)
      ? 'ownershipBuyer'
      : isLeader(user)
        ? 'ownershipLeader'
        : 'ownershipAgent';

  const canSubmit = rows.length > 0 && missingRequired.length === 0 && (!admin || Boolean(branch));
  const finished = report && !report.dryRun;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('import.title')}
      footer={
        finished ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button
              onClick={() => {
                onClose();
                navigate('/leads');
              }}
            >
              {t('import.viewLeads')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => runImport.mutate(true)}
              disabled={!canSubmit}
              loading={runImport.isPending && runImport.variables === true}
            >
              {t('import.validate')}
            </Button>
            <Button
              onClick={() => runImport.mutate(false)}
              disabled={!canSubmit}
              loading={runImport.isPending && runImport.variables === false}
            >
              <Upload className="h-4 w-4" />
              {t('import.run')}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        {/* ---- file picker ---- */}
        {!finished && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              readFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={cx(
              'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
              dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              className="hidden"
              onChange={(e) => readFile(e.target.files?.[0])}
            />
            <FileSpreadsheet className={cx('mb-3 h-9 w-9', fileName ? 'text-brand-600' : 'text-slate-400')} />
            {fileName ? (
              <>
                <p className="font-bold text-slate-900">{fileName}</p>
                <p className="mt-1 text-sm text-slate-500">{t('import.rowsFound', { count: formatNumber(rows.length, locale) })}</p>
              </>
            ) : (
              <>
                <p className="font-bold text-slate-800">{reading ? t('import.reading') : t('import.dropzone')}</p>
                <p className="mt-1 text-xs text-slate-500">{t('import.formats', { max: formatNumber(IMPORT_MAX_ROWS, locale) })}</p>
              </>
            )}
          </div>
        )}

        {parseError && (
          <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {parseError}
          </div>
        )}

        {/* ---- recognised columns ---- */}
        {rows.length > 0 && !finished && (
          <div>
            <p className="mb-1 text-sm font-bold text-slate-800">{t('import.columns')}</p>
            <p className="mb-3 text-xs text-slate-500">{t('import.columnsHint')}</p>
            <div className="flex flex-wrap gap-2">
              {detected.map((col) => (
                <Badge
                  key={col.key}
                  className={
                    col.found
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : col.required
                        ? 'bg-rose-50 text-rose-700 ring-rose-200'
                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                  }
                  dot={col.found ? 'bg-emerald-500' : col.required ? 'bg-rose-500' : 'bg-slate-300'}
                >
                  {t(`leads.${col.key === 'note' ? 'note' : col.key}`)}
                  <span className="opacity-70">
                    · {col.found ? t('import.detected') : col.required ? t('import.required') : t('import.optional')}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ---- preview ---- */}
        {rows.length > 0 && !finished && (
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">
              {t('import.preview', { count: Math.min(PREVIEW_ROWS, rows.length) })}
            </p>
            <div className="scroll-thin overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    {headers.slice(0, 6).map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-start font-bold text-slate-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {headers.slice(0, 6).map((h) => (
                        <td key={h} className="max-w-[14rem] truncate px-3 py-2 text-slate-700">
                          {String(r[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- where they land ---- */}
        {rows.length > 0 && !finished && (
          <div className="space-y-3">
            {admin && (
              <Field label={t('import.branch')} required hint={t('import.branchRequired')}>
                <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value="">{t('common.select')}</option>
                  {(branches ?? []).map((b) => (
                    <option key={b._id} value={b._id}>
                      {bilingual(b.name, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
              {t(`import.${ownershipKey}`)}
            </p>
          </div>
        )}

        {/* ---- result ---- */}
        {report && <ImportReport report={report} />}

        {runImport.isPending && <LoadingBlock rows={2} />}
      </div>
    </Modal>
  );
}

function ImportReport({ report }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { summary, results, dryRun } = report;

  const problems = results.filter((r) => r.status !== 'created');

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-bold text-slate-800">{dryRun ? t('import.dryRunResult') : t('import.result')}</p>
        <div className="grid grid-cols-3 gap-2">
          <Tally tone="emerald" value={summary.created} label={t('import.created')} locale={locale} />
          <Tally tone="amber" value={summary.duplicate} label={t('import.duplicate')} locale={locale} />
          <Tally tone="rose" value={summary.invalid} label={t('import.invalid')} locale={locale} />
        </div>
      </div>

      {dryRun && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
          {t('import.dryRunNote')}
        </p>
      )}

      {problems.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          {t('import.allGood')}
        </p>
      ) : (
        <div className="scroll-thin max-h-56 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-start font-bold text-slate-600">{t('import.row')}</th>
                <th className="px-3 py-2 text-start font-bold text-slate-600">{t('leads.fullName')}</th>
                <th className="px-3 py-2 text-start font-bold text-slate-600">{t('import.reason')}</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((r) => (
                <tr key={r.row} className="border-t border-slate-100">
                  <td className="px-3 py-2 tabular-nums text-slate-500">{r.row}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2 text-slate-700">{r.name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={r.status === 'duplicate' ? 'text-amber-700' : 'text-rose-700'}>
                      {REASON_KEYS[r.reason] ? t(`import.${REASON_KEYS[r.reason]}`) : r.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TALLY_TONES = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
};

function Tally({ tone, value, label, locale }) {
  return (
    <div className={cx('rounded-xl px-3 py-3 text-center', TALLY_TONES[tone])}>
      <p className="text-2xl font-black tabular-nums">{formatNumber(value, locale)}</p>
      <p className="mt-0.5 text-[11px] font-bold">{label}</p>
    </div>
  );
}
