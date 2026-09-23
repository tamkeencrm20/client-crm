import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

/**
 * Writing the leads workbook.
 *
 * The server hands back plain rows; the file is assembled here so the column
 * headings come out in whichever language the person is actually using, and so
 * the download starts immediately rather than after a round trip through a
 * temporary file on the server.
 */

/** Widths in characters, chosen so nothing important opens as ####. */
const COLUMN_WIDTHS = {
  fullName: 24,
  phone: 18,
  email: 26,
  status: 14,
  source: 14,
  network: 12,
  campaign: 26,
  course: 28,
  branch: 16,
  assignedTo: 20,
  contactAttempts: 8,
  createdAt: 18,
  firstContactedAt: 18,
  nextFollowUpAt: 18,
  enrolledAt: 18,
  dealValue: 12,
  lostReason: 24,
  tags: 18,
};

/**
 * Turn the API's rows into a workbook and hand it to the browser.
 *
 * @param {object}   params
 * @param {object[]} params.rows      rows from GET /leads/export
 * @param {string[]} params.columns   column order from the same response
 * @param {Function} params.heading   (key) => translated column heading
 * @param {Function} params.translate (group, value) => translated cell value
 * @param {string}   params.locale    'ar' | 'en'
 * @param {string}   [params.fileName]
 * @returns {number} how many rows were written
 */
export function downloadLeadsWorkbook({ rows, columns, heading, translate, locale, fileName }) {
  const isRtl = locale === 'ar';

  const shaped = rows.map((row) => {
    const out = {};
    for (const key of columns) {
      const value = row[key];
      out[heading(key)] = formatCell(key, value, translate, locale);
    }
    return out;
  });

  // Build from the translated headings so the order survives even when a row
  // happens to be missing a key.
  const headings = columns.map(heading);
  const sheet = XLSX.utils.json_to_sheet(shaped, { header: headings });

  sheet['!cols'] = columns.map((key) => ({ wch: COLUMN_WIDTHS[key] ?? 16 }));
  // Excel opens the sheet right-to-left for an Arabic export, so the first
  // column lands where an Arabic reader looks first.
  if (isRtl) sheet['!views'] = [{ RTL: true }];
  sheet['!autofilter'] = { ref: sheet['!ref'] };
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, isRtl ? 'العملاء' : 'Leads');

  const name = fileName ?? `tamkeen-leads-${dayjs().format('YYYY-MM-DD-HHmm')}.xlsx`;
  XLSX.writeFile(book, name, { compression: true });

  return shaped.length;
}

/** Render one cell: dates readable, enums translated, empties blank. */
export function formatCell(key, value, translate, locale) {
  if (value === null || value === undefined || value === '') return '';

  if (key.endsWith('At')) return dayjs(value).locale(locale).format('YYYY-MM-DD HH:mm');
  if (key === 'status') return translate('status', value);
  if (key === 'source') return translate('source', value);
  if (key === 'network') return translate('platform', value);
  if (key === 'dealValue') return Number(value);
  if (key === 'contactAttempts') return Number(value);

  return value;
}
