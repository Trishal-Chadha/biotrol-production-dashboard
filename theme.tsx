import * as XLSX from 'xlsx';
import type { ProductionData, Product } from './supabase';
import { supabase } from './supabase';

// ───────────────────────────────────────────────────────────────────────────
// Shared helpers
// ───────────────────────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.\s_\-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [, a, b, y] = m;
    if (y.length === 2) y = '20' + y;
    const day = a.padStart(2, '0');
    const mon = b.padStart(2, '0');
    return `${y}-${mon}-${day}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const s = String(value).trim().replace(/,/g, '');
  if (s === '') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function parseText(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function resolveProductId(value: unknown, products: Product[]): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  for (const p of products) if (p.id === s) return p.id;
  const key = s.toLowerCase();
  for (const p of products) {
    if (p.name && p.name.trim().toLowerCase() === key) return p.id;
    if (p.code && p.code.trim().toLowerCase() === key) return p.id;
  }
  for (const p of products) {
    if (p.name && p.name.trim().toLowerCase().includes(key)) return p.id;
  }
  return null;
}

function resolveProductName(id: string | null | undefined, products: Product[]): string {
  if (!id) return '';
  const p = products.find(x => x.id === id);
  return p?.name ?? '';
}

// ───────────────────────────────────────────────────────────────────────────
// Import — row type & column mapping
// ───────────────────────────────────────────────────────────────────────────

export interface ImportRow {
  entry_date: string | null;
  product: string | null;
  batch_number: string | null;
  produced_sheets: number | null;
  target_sheets: number | null;
  prod_tests_1: number | null;
  production_employees: number | null;
  production_remarks: string | null;
  day_remarks: string | null;
  pkg_employees: number | null;
  pkg_product: string | null;
  pkg_pouches: number | null;
  pkg_remarks: string | null;
  pkg_product_2: string | null;
  pkg_pouches_2: number | null;
  pkg_remarks_2: string | null;
  pkg_product_3: string | null;
  pkg_pouches_3: number | null;
  pkg_remarks_3: string | null;
}

const IMPORT_FIELDS: Record<keyof ImportRow, string[]> = {
  entry_date: ['entry_date', 'date', 'entrydate', 'entry_date', 'entry date', 'production_date', 'production date', 'datum'],
  product: ['product', 'product_name', 'product name', 'products', 'productname', 'product_1', 'product 1', 'main_product', 'main product', 'product_id', 'product id'],
  batch_number: ['batch_number', 'batch number', 'batch_no', 'batch no', 'batchnumber', 'batch', 'batch_no_', 'batch no.'],
  produced_sheets: ['produced_sheets', 'produced sheets', 'producedsheets', 'sheets', 'sheets_produced', 'sheets produced', 'produced_units', 'produced units', 'units', 'produced units'],
  target_sheets: ['target_sheets', 'target sheets', 'targetsheets', 'target', 'target_sheets_', 'target units'],
  prod_tests_1: ['prod_tests_1', 'prod tests 1', 'tests_produced', 'tests produced', 'no_of_tests_produced', 'no of tests produced', 'no of tests', 'no. of tests produced', 'no. of tests', 'tests', 'tests_1', 'tests 1', 'tests produced 1'],
  production_employees: ['production_employees', 'production employees', 'prod employees', 'productionemployees', 'employees', 'prod_employees', 'no of employees', 'no. of employees'],
  production_remarks: ['production_remarks', 'production remarks', 'prod remarks', 'productionremarks', 'remarks', 'prod_remarks', 'production notes'],
  day_remarks: ['day_remarks', 'day remarks', 'dayremarks', 'day notes', 'notes'],
  pkg_employees: ['pkg_employees', 'packaging employees', 'pkg employees', 'packagingemployees', 'packaging_employees', 'packing employees'],
  pkg_product: ['pkg_product', 'pkg product', 'packaging product', 'packaging_product', 'packaging product 1', 'pkg product 1', 'pkg_product_1', 'packaging_product_1', 'packing product', 'packing product 1', 'pkg_product_id', 'pkg product id', 'packaging product id'],
  pkg_pouches: ['pkg_pouches', 'pkg pouches', 'pkg tests 1', 'packaging tests 1', 'pkg_tests_1', 'pouches', 'pkg_pouches_1', 'packaging_pouches', 'packaging pouches', 'no_of_tests_pkg', 'pkg tests', 'packing tests', 'packing tests 1'],
  pkg_remarks: ['pkg_remarks', 'pkg remarks', 'packaging remarks', 'packaging remarks 1', 'pkg remarks 1', 'pkg_remarks_1', 'packaging_remarks', 'packaging_remarks_1', 'packing remarks', 'packing remarks 1'],
  pkg_product_2: ['pkg_product_2', 'pkg product 2', 'packaging product 2', 'packaging_product_2', 'pkg_product_2_', 'packing product 2', 'pkg_product_id_2', 'pkg product id 2', 'packaging product id 2'],
  pkg_pouches_2: ['pkg_pouches_2', 'pkg pouches 2', 'pkg tests 2', 'packaging tests 2', 'pkg_tests_2', 'packaging_pouches_2', 'packing tests 2'],
  pkg_remarks_2: ['pkg_remarks_2', 'pkg remarks 2', 'packaging remarks 2', 'packaging_remarks_2', 'packing remarks 2'],
  pkg_product_3: ['pkg_product_3', 'pkg product 3', 'packaging product 3', 'packaging_product_3', 'pkg_product_3_', 'packing product 3', 'pkg_product_id_3', 'pkg product id 3', 'packaging product id 3'],
  pkg_pouches_3: ['pkg_pouches_3', 'pkg pouches 3', 'pkg tests 3', 'packaging tests 3', 'pkg_tests_3', 'packaging_pouches_3', 'packing tests 3'],
  pkg_remarks_3: ['pkg_remarks_3', 'pkg remarks 3', 'packaging remarks 3', 'packaging_remarks_3', 'packing remarks 3'],
};

function buildAliasIndex(): Map<string, keyof ImportRow> {
  const idx = new Map<string, keyof ImportRow>();
  for (const [field, aliases] of Object.entries(IMPORT_FIELDS) as [keyof ImportRow, string[]][]) {
    for (const a of aliases) idx.set(normalizeHeader(a), field);
  }
  return idx;
}

const ALIAS_INDEX = buildAliasIndex();

// ───────────────────────────────────────────────────────────────────────────
// Import — file reading with header-row detection
// ───────────────────────────────────────────────────────────────────────────

export interface ReadResult {
  rows: ImportRow[];
  count: number;
  skipped: number;
  sheetName: string;
  headerRow: number;
  detectedColumns: string[];
}

function isBlankRow(arr: unknown[]): boolean {
  return arr.every(c => c == null || c === '' || (typeof c === 'string' && c.trim() === ''));
}

function scoreHeaderRow(arr: unknown[]): number {
  let score = 0;
  for (const cell of arr) {
    if (cell == null || cell === '') continue;
    const norm = normalizeHeader(String(cell));
    if (ALIAS_INDEX.has(norm)) score++;
  }
  return score;
}

function mapRowToObject(
  headerRow: unknown[],
  dataRow: unknown[],
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i];
    const key = header != null ? String(header) : `__col_${i}`;
    obj[key] = dataRow[i] ?? null;
  }
  return obj;
}

function buildImportRow(mapped: Partial<ImportRow>): ImportRow {
  return {
    entry_date: parseDate(mapped.entry_date),
    product: parseText(mapped.product),
    batch_number: parseText(mapped.batch_number),
    produced_sheets: parseNumber(mapped.produced_sheets),
    target_sheets: parseNumber(mapped.target_sheets),
    prod_tests_1: parseNumber(mapped.prod_tests_1),
    production_employees: parseNumber(mapped.production_employees),
    production_remarks: parseText(mapped.production_remarks),
    day_remarks: parseText(mapped.day_remarks),
    pkg_employees: parseNumber(mapped.pkg_employees),
    pkg_product: parseText(mapped.pkg_product),
    pkg_pouches: parseNumber(mapped.pkg_pouches),
    pkg_remarks: parseText(mapped.pkg_remarks),
    pkg_product_2: parseText(mapped.pkg_product_2),
    pkg_pouches_2: parseNumber(mapped.pkg_pouches_2),
    pkg_remarks_2: parseText(mapped.pkg_remarks_2),
    pkg_product_3: parseText(mapped.pkg_product_3),
    pkg_pouches_3: parseNumber(mapped.pkg_pouches_3),
    pkg_remarks_3: parseText(mapped.pkg_remarks_3),
  };
}

function isImportRowEmpty(row: ImportRow): boolean {
  return Object.values(row).every(
    v => v === null || v === '' || (typeof v === 'string' && v.trim() === ''),
  );
}

export async function readImportFile(file: File): Promise<ReadResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });

  // find first non-empty sheet
  let ws: XLSX.WorkSheet | null = null;
  let sheetName = '';
  for (const name of wb.SheetNames) {
    const candidate = wb.Sheets[name];
    if (candidate && candidate['!ref']) {
      ws = candidate;
      sheetName = name;
      break;
    }
  }
  if (!ws) return { rows: [], count: 0, skipped: 0, sheetName: '', headerRow: -1, detectedColumns: [] };

  // read as array-of-arrays to detect header row
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  if (aoa.length === 0) {
    return { rows: [], count: 0, skipped: 0, sheetName, headerRow: -1, detectedColumns: [] };
  }

  // detect header row: scan first 15 rows, pick the one with highest alias score
  let bestRow = -1;
  let bestScore = 0;
  const scanLimit = Math.min(aoa.length, 15);
  for (let i = 0; i < scanLimit; i++) {
    const score = scoreHeaderRow(aoa[i]);
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }

  // fallback to first row if no aliases matched
  if (bestRow < 0) bestRow = 0;

  const headerArr = aoa[bestRow];
  const detectedColumns = headerArr
    .filter(c => c != null && String(c).trim() !== '')
    .map(c => String(c).trim());

  const rows: ImportRow[] = [];
  let skipped = 0;

  for (let i = bestRow + 1; i < aoa.length; i++) {
    const arr = aoa[i];
    if (!arr || isBlankRow(arr)) {
      skipped++;
      continue;
    }

    const obj = mapRowToObject(headerArr, arr);
    const mapped: Partial<ImportRow> = {};
    for (const [header, val] of Object.entries(obj)) {
      const field = ALIAS_INDEX.get(normalizeHeader(header));
      if (field) mapped[field] = val as any;
    }

    const row = buildImportRow(mapped);
    if (isImportRowEmpty(row)) {
      skipped++;
      continue;
    }
    rows.push(row);
  }

  return { rows, count: rows.length, skipped, sheetName, headerRow: bestRow, detectedColumns };
}

// ───────────────────────────────────────────────────────────────────────────
// Build Supabase insert payload from a single import row
// ───────────────────────────────────────────────────────────────────────────

export type ProductionInsertPayload = Record<string, unknown>;

export function rowToPayload(
  r: ImportRow,
  products: Product[],
): ProductionInsertPayload {
  const today = new Date().toISOString().slice(0, 10);
  const producedSheets = r.produced_sheets ?? 0;
  return {
    entry_date: r.entry_date ?? today,
    product_id: resolveProductId(r.product, products),
    batch_number: r.batch_number ?? '',
    produced_sheets: producedSheets,
    produced_units: producedSheets,
    target_sheets: r.target_sheets ?? 0,
    production_employees: r.production_employees ?? 0,
    production_incharge_id: null,
    production_remarks: r.production_remarks ?? null,
    prod_tests_1: r.prod_tests_1 ?? null,
    prod_tests_2: null,
    prod_tests_3: null,
    pkg_product_id: resolveProductId(r.pkg_product, products),
    pkg_employees: r.pkg_employees ?? null,
    pkg_incharge_id: null,
    pkg_pouches: r.pkg_pouches ?? null,
    pkg_remarks: r.pkg_remarks ?? null,
    pkg_product_id_2: resolveProductId(r.pkg_product_2, products),
    pkg_pouches_2: r.pkg_pouches_2 ?? null,
    pkg_remarks_2: r.pkg_remarks_2 ?? null,
    pkg_product_id_3: resolveProductId(r.pkg_product_3, products),
    pkg_pouches_3: r.pkg_pouches_3 ?? null,
    pkg_remarks_3: r.pkg_remarks_3 ?? null,
    test_pouch_produced: 0,
    day_remarks: r.day_remarks ?? null,
  };
}

export function rowsToInsertPayloads(
  rows: ImportRow[],
  products: Product[],
): ProductionInsertPayload[] {
  return rows.map(r => rowToPayload(r, products));
}

// ───────────────────────────────────────────────────────────────────────────
// Import — insert rows individually, track per-row results
// ───────────────────────────────────────────────────────────────────────────

export interface ImportFailure {
  rowNumber: number;
  reason: string;
}

export interface ImportReport {
  total: number;
  imported: number;
  failed: number;
  skipped: number;
  failures: ImportFailure[];
}

export async function insertImportRows(
  rows: ImportRow[],
  products: Product[],
): Promise<ImportReport> {
  const failures: ImportFailure[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    if (isImportRowEmpty(row)) {
      skipped++;
      continue;
    }

    const payload = rowToPayload(row, products);

    try {
      const { error } = await supabase
        .from('production_data')
        .insert(payload);
      if (error) {
        failures.push({ rowNumber, reason: error.message });
      } else {
        imported++;
      }
    } catch (err) {
      failures.push({ rowNumber, reason: String(err) });
    }
  }

  return {
    total: rows.length,
    imported,
    failed: failures.length,
    skipped,
    failures,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Export
// ───────────────────────────────────────────────────────────────────────────

const EXPORT_COLUMNS: { key: keyof ProductionData | '_productName' | '_pkgProductName' | '_pkgProductName2' | '_pkgProductName3'; label: string }[] = [
  { key: 'entry_date', label: 'Entry Date' },
  { key: '_productName', label: 'Product' },
  { key: 'batch_number', label: 'Batch Number' },
  { key: 'produced_sheets', label: 'Produced Sheets' },
  { key: 'target_sheets', label: 'Target Sheets' },
  { key: 'prod_tests_1', label: 'No. of Tests Produced' },
  { key: 'production_employees', label: 'Production Employees' },
  { key: 'production_remarks', label: 'Production Remarks' },
  { key: 'day_remarks', label: 'Day Remarks' },
  { key: 'pkg_employees', label: 'Packaging Employees' },
  { key: '_pkgProductName', label: 'Packaging Product 1' },
  { key: 'pkg_pouches', label: 'Pkg Tests 1' },
  { key: 'pkg_remarks', label: 'Packaging Remarks 1' },
  { key: '_pkgProductName2', label: 'Packaging Product 2' },
  { key: 'pkg_pouches_2', label: 'Pkg Tests 2' },
  { key: 'pkg_remarks_2', label: 'Packaging Remarks 2' },
  { key: '_pkgProductName3', label: 'Packaging Product 3' },
  { key: 'pkg_pouches_3', label: 'Pkg Tests 3' },
  { key: 'pkg_remarks_3', label: 'Packaging Remarks 3' },
];

export type ExportFormat = 'xlsx' | 'csv';

export function exportProduction(
  records: ProductionData[],
  products: Product[],
  format: ExportFormat,
  filename = 'production_data',
) {
  const data = records.map(r => {
    const obj: Record<string, unknown> = {};
    for (const col of EXPORT_COLUMNS) {
      let val: unknown = '';
      switch (col.key) {
        case '_productName': val = r.products?.name ?? resolveProductName(r.product_id, products); break;
        case '_pkgProductName': val = r.pkg_product?.name ?? resolveProductName(r.pkg_product_id, products); break;
        case '_pkgProductName2': val = resolveProductName(r.pkg_product_id_2, products); break;
        case '_pkgProductName3': val = resolveProductName(r.pkg_product_id_3, products); break;
        default: val = (r as Record<string, unknown>)[col.key as string] ?? '';
      }
      obj[col.label] = val;
    }
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(data, {
    header: EXPORT_COLUMNS.map(c => c.label),
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Production Data');

  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const out = `${filename}.${ext}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, out, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, out, { bookType: 'xlsx' });
  }
  return out;
}
