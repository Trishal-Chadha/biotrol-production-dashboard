import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, Search, RotateCcw, Calendar,
  ChevronDown, ChevronUp, Package, Boxes, ClipboardList,
  Upload, Download, FileSpreadsheet, AlertCircle, Loader2,
} from 'lucide-react';
import { supabase, ProductionData, Product } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import SearchableSelect from '../components/SearchableSelect';
import {
  readImportFile, insertImportRows,
  exportProduction,
  type ImportRow, type ImportReport, type ExportFormat,
} from '../lib/productionIO';

// ─── helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function numOrZero(v: string): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ─── product row type ───────────────────────────────────────────────────────

interface ProductRow {
  product_id: string;
  batch_number: string;
  produced_sheets: string;
  target_sheets: string;
  tests_produced: string;
  production_remarks: string;
}

const emptyProductRow = (): ProductRow => ({
  product_id: '',
  batch_number: '',
  produced_sheets: '',
  target_sheets: '',
  tests_produced: '',
  production_remarks: '',
});

// ─── packaging row type ─────────────────────────────────────────────────────

interface PkgRow {
  product_id: string;
  pouches: string;
  remarks: string;
}

const emptyPkgRow = (): PkgRow => ({
  product_id: '',
  pouches: '',
  remarks: '',
});

// ─── form state ──────────────────────────────────────────────────────────────

interface FormState {
  entry_date: string;
  production_employees: string;
  day_remarks: string;
  productRows: ProductRow[];
  pkgRows: PkgRow[];
  pkg_employees: string;
}

const emptyForm = (): FormState => ({
  entry_date: today(),
  production_employees: '',
  day_remarks: '',
  productRows: [emptyProductRow(), emptyProductRow(), emptyProductRow()],
  pkgRows: [emptyPkgRow(), emptyPkgRow(), emptyPkgRow()],
  pkg_employees: '',
});

// ─── date filter ─────────────────────────────────────────────────────────────

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

// ─── component ───────────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition bg-white';

const inp = inputClass;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SectionCard({
  title, icon, children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}
          {title}
        </span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700">{value}</span>
    </div>
  );
}

export default function ProductionDataPage() {
  const [records, setRecords] = useState<ProductionData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // table filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // import / export
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importCount, setImportCount] = useState(0);
  const [importSkipped, setImportSkipped] = useState(0);
  const [importReading, setImportReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────

  async function fetchAll() {
    setLoading(true);
    const [{ data: recs }, { data: prods }] = await Promise.all([
      supabase
        .from('production_data')
        .select('*, products!production_data_product_id_fkey(id,name), pkg_product:products!production_data_pkg_product_id_fkey(id,name)')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
    ]);
    if (recs) setRecords(recs as unknown as ProductionData[]);
    if (prods) setProducts(prods as Product[]);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  // ── product options ─────────────────────────────────────────────────────────

  const productOptions = useMemo(
    () => products.map(p => ({ value: p.id, label: p.name })),
    [products],
  );

  // ── filtered records ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStr = today();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    return records.filter(r => {
      if (dateFilter === 'today' && r.entry_date !== todayStr) return false;
      if (dateFilter === 'week' && r.entry_date < weekStart) return false;
      if (dateFilter === 'month' && r.entry_date < monthStart) return false;
      if (dateFilter === 'custom') {
        if (customFrom && r.entry_date < customFrom) return false;
        if (customTo && r.entry_date > customTo) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          r.entry_date,
          r.batch_number,
          r.products?.name ?? '',
          r.production_remarks ?? '',
          r.day_remarks ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, dateFilter, customFrom, customTo, search]);

  // ── form helpers ───────────────────────────────────────────────────────────

  function setRow(idx: number, patch: Partial<ProductRow>) {
    setForm(f => {
      const rows = [...f.productRows];
      rows[idx] = { ...rows[idx], ...patch };
      return { ...f, productRows: rows };
    });
  }

  function setPkgRow(idx: number, patch: Partial<PkgRow>) {
    setForm(f => {
      const rows = [...f.pkgRows];
      rows[idx] = { ...rows[idx], ...patch };
      return { ...f, pkgRows: rows };
    });
  }

  function openAdd() {
    setForm(emptyForm());
    setEditId(null);
    setErrors([]);
    setShowForm(true);
  }

  function openEdit(r: ProductionData) {
    setForm({
      entry_date: r.entry_date ?? today(),
      production_employees: r.production_employees?.toString() ?? '',
      day_remarks: r.day_remarks ?? '',
      productRows: [
        {
          product_id: r.product_id ?? '',
          batch_number: r.batch_number ?? '',
          produced_sheets: r.produced_sheets?.toString() ?? '',
          target_sheets: r.target_sheets?.toString() ?? '',
          tests_produced: r.prod_tests_1 != null ? String(r.prod_tests_1) : '',
          production_remarks: r.production_remarks ?? '',
        },
        emptyProductRow(),
        emptyProductRow(),
      ],
      pkgRows: [
        {
          product_id: r.pkg_product_id ?? '',
          pouches: r.pkg_pouches?.toString() ?? '',
          remarks: r.pkg_remarks ?? '',
        },
        {
          product_id: r.pkg_product_id_2 ?? '',
          pouches: r.pkg_pouches_2?.toString() ?? '',
          remarks: r.pkg_remarks_2 ?? '',
        },
        {
          product_id: r.pkg_product_id_3 ?? '',
          pouches: r.pkg_pouches_3?.toString() ?? '',
          remarks: r.pkg_remarks_3 ?? '',
        },
      ],
      pkg_employees: r.pkg_employees?.toString() ?? '',
    });
    setEditId(r.id);
    setErrors([]);
    setShowForm(true);
  }

  function clearForm() {
    setForm(emptyForm());
    setErrors([]);
  }

  function validate(f: FormState): string[] {
    const errs: string[] = [];
    if (!f.entry_date) errs.push('Date is required.');
    const row1 = f.productRows[0];
    if (!row1.product_id) errs.push('Product 1 is required.');
    if (!row1.batch_number.trim()) errs.push('Batch Number for Product 1 is required.');
    return errs;
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate(form);
    if (errs.length) { setErrors(errs); return; }

    setSaving(true);
    setErrors([]);

    const commonFields = {
      entry_date: form.entry_date,
      production_employees: numOrZero(form.production_employees),
      test_pouch_produced: 0,
      day_remarks: form.day_remarks.trim() || null,
      pkg_employees: form.pkg_employees ? numOrZero(form.pkg_employees) : null,
      pkg_incharge_id: null,
      pkg_product_id: form.pkgRows[0].product_id || null,
      pkg_pouches: form.pkgRows[0].pouches ? numOrZero(form.pkgRows[0].pouches) : null,
      pkg_remarks: form.pkgRows[0].remarks.trim() || null,
      pkg_product_id_2: form.pkgRows[1].product_id || null,
      pkg_pouches_2: form.pkgRows[1].pouches ? numOrZero(form.pkgRows[1].pouches) : null,
      pkg_remarks_2: form.pkgRows[1].remarks.trim() || null,
      pkg_product_id_3: form.pkgRows[2].product_id || null,
      pkg_pouches_3: form.pkgRows[2].pouches ? numOrZero(form.pkgRows[2].pouches) : null,
      pkg_remarks_3: form.pkgRows[2].remarks.trim() || null,
    };

    try {
      if (editId) {
        const row = form.productRows[0];
        const payload = {
          ...commonFields,
          product_id: row.product_id || null,
          batch_number: row.batch_number.trim(),
          produced_sheets: numOrZero(row.produced_sheets),
          produced_units: numOrZero(row.produced_sheets),
          target_sheets: numOrZero(row.target_sheets),
          production_remarks: row.production_remarks.trim() || null,
          prod_tests_1: numOrZero(form.productRows[0].tests_produced) || null,
          prod_tests_2: numOrZero(form.productRows[1].tests_produced) || null,
          prod_tests_3: numOrZero(form.productRows[2].tests_produced) || null,
        };
        const { error } = await supabase.from('production_data').update(payload).eq('id', editId);
        if (error) { setErrors([error.message]); setSaving(false); return; }
      } else {
        const insertRows = form.productRows.filter(r => r.product_id);
        const payloads = insertRows.map((row, i) => ({
          ...commonFields,
          product_id: row.product_id || null,
          batch_number: row.batch_number.trim(),
          produced_sheets: numOrZero(row.produced_sheets),
          produced_units: numOrZero(row.produced_sheets),
          target_sheets: numOrZero(row.target_sheets),
          production_remarks: row.production_remarks.trim() || null,
          prod_tests_1: i === 0 ? (numOrZero(form.productRows[0].tests_produced) || null) : null,
          prod_tests_2: i === 1 ? (numOrZero(form.productRows[1].tests_produced) || null) : null,
          prod_tests_3: i === 2 ? (numOrZero(form.productRows[2].tests_produced) || null) : null,
        }));
        const { error } = await supabase.from('production_data').insert(payloads);
        if (error) { setErrors([error.message]); setSaving(false); return; }
      }
      setSaving(false);
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setErrors([String(err)]);
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this production record?')) return;
    await supabase.from('production_data').delete().eq('id', id);
    fetchAll();
  }

  // ── import / export ─────────────────────────────────────────────────────────

  function onImportClick() {
    setImportError('');
    setImportSuccess('');
    setImportReport(null);
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    setImportSuccess('');
    setImportReport(null);
    setImportReading(true);
    try {
      const res = await readImportFile(file);
      if (res.count === 0) {
        setImportError('No records were found in the selected file. Please make sure the first row contains column headers and the file contains data rows.');
        setImportReading(false);
        return;
      }
      setImportRows(res.rows);
      setImportCount(res.count);
      setImportSkipped(res.skipped);
    } catch (err) {
      setImportError(`Could not read the file: ${String(err)}`);
    } finally {
      setImportReading(false);
    }
  }

  function cancelImport() {
    setImportRows(null);
    setImportCount(0);
    setImportSkipped(0);
    setImportError('');
  }

  async function confirmImport() {
    if (!importRows) return;
    setImporting(true);
    setImportError('');
    setImportSuccess('');
    setImportReport(null);

    // capture current DB count before import
    const beforeCount = await getDbCount();

    try {
      const report = await insertImportRows(importRows, products);

      // refresh from DB
      await fetchAll();

      // verify the DB count actually increased
      const afterCount = await getDbCount();
      const actualIncrease = afterCount - beforeCount;

      if (report.imported > 0 && actualIncrease <= 0) {
        // nothing actually persisted — treat as failure
        setImportError(`Import failed: ${report.imported} row(s) were sent but none were saved to the database.`);
        setImportReport(report);
        setImporting(false);
        return;
      }

      const parts: string[] = [];
      if (report.imported > 0) {
        parts.push(`${report.imported} record${report.imported === 1 ? '' : 's'} imported successfully`);
      }
      if (report.failed > 0) {
        parts.push(`${report.failed} failed`);
      }
      if (report.skipped > 0) {
        parts.push(`${report.skipped} skipped`);
      }
      const summary = parts.length > 0 ? parts.join(', ') : 'No records imported.';

      if (report.imported > 0 && report.failed === 0) {
        setImportSuccess(`Import complete: ${summary}.`);
      } else if (report.imported > 0 && report.failed > 0) {
        setImportSuccess(`Import partially complete: ${summary}.`);
      } else if (report.imported === 0 && report.failed > 0) {
        setImportError(`Import failed: ${summary}.`);
      } else {
        setImportError('No records were imported.');
      }

      setImportReport(report);
      setImportRows(null);
      setImportCount(0);
      setImportSkipped(0);
    } catch (err) {
      setImportError(`Import failed: ${String(err)}`);
    } finally {
      setImporting(false);
    }
  }

  async function getDbCount(): Promise<number> {
    const { count, error } = await supabase
      .from('production_data')
      .select('*', { count: 'exact', head: true });
    if (error) return records.length;
    return count ?? 0;
  }

  function doExport(format: ExportFormat) {
    setShowExportMenu(false);
    const hasFilters = !!(search || (dateFilter !== 'all') || customFrom || customTo);
    const base = `production_data_${new Date().toISOString().slice(0, 10)}`;
    if (hasFilters && filtered.length < records.length) {
      exportProduction(filtered, products, format, `${base}_filtered`);
    } else {
      exportProduction(records, products, format, base);
    }
  }

  // ── filter pill ─────────────────────────────────────────────────────────────

  function FilterPill({ label, value }: { label: string; value: DateFilter }) {
    return (
      <button
        onClick={() => setDateFilter(value)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          dateFilter === value
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        {label}
      </button>
    );
  }

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Production Data"
        subtitle="Record and manage daily production entries"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={onImportClick}
              disabled={importReading || importing}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {importReading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import Data
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(s => !s)}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Download size={16} /> Export Data
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-44">
                    <button onClick={() => doExport('xlsx')} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <FileSpreadsheet size={15} className="text-green-600" /> Excel (.xlsx)
                    </button>
                    <button onClick={() => doExport('csv')} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <FileSpreadsheet size={15} className="text-gray-500" /> CSV (.csv)
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> Add Entry
            </button>
          </div>
        }
      />

      {/* ── Import / Export ──────────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFileSelected}
      />

      {importSuccess && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Check size={16} /> {importSuccess}
          </div>
          <button onClick={() => setImportSuccess('')} className="text-green-600 hover:text-green-800">
            <X size={16} />
          </button>
        </div>
      )}

      {importError && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} /> {importError}
          </div>
          <button onClick={() => setImportError('')} className="text-red-600 hover:text-red-800">
            <X size={16} />
          </button>
        </div>
      )}

      {importReport && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">Import Report</h4>
            <button onClick={() => setImportReport(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Total rows</div>
              <div className="text-base font-semibold text-gray-800">{importReport.total}</div>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2">
              <div className="text-xs text-green-600">Imported</div>
              <div className="text-base font-semibold text-green-700">{importReport.imported}</div>
            </div>
            <div className="bg-red-50 rounded-lg px-3 py-2">
              <div className="text-xs text-red-600">Failed</div>
              <div className="text-base font-semibold text-red-700">{importReport.failed}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Skipped</div>
              <div className="text-base font-semibold text-gray-700">{importReport.skipped}</div>
            </div>
          </div>
          {importReport.failures.length > 0 && (
            <div className="border-t border-gray-100 pt-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-gray-600 mb-1">Failed rows:</p>
              {importReport.failures.map((f, i) => (
                <div key={i} className="text-xs text-red-600 mb-1">
                  <span className="font-medium">Row {f.rowNumber}:</span> {f.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {importRows && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Confirm Import</h3>
              <button onClick={cancelImport} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-5 py-5 text-sm text-gray-600">
              <p className="mb-2">
                <span className="font-semibold text-gray-800">{importCount}</span> production record{importCount === 1 ? '' : 's'} found
                {importSkipped > 0 && <span className="text-gray-400"> ({importSkipped} empty row{importSkipped === 1 ? '' : 's'} skipped)</span>}.
              </p>
              <p className="text-gray-500">
                Import {importCount} production record{importCount === 1 ? '' : 's'}?<br />
                This will add the imported records to the production database.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={cancelImport}
                disabled={importing}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                {importing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-700">
              {editId ? 'Edit Production Entry' : 'New Production Entry'}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} noValidate>
            {/* ── Common fields ─────────────────────────────────────────────── */}
            <SectionCard title="Common Details" icon={<ClipboardList size={15} className="text-blue-600" />} defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Entry Date">
                  <input
                    type="date"
                    className={inp}
                    value={form.entry_date}
                    onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
                  />
                </Field>
                <Field label="Production Employees">
                  <input
                    type="number"
                    min="0"
                    className={inp}
                    placeholder="0"
                    value={form.production_employees}
                    onChange={e => setForm(f => ({ ...f, production_employees: e.target.value }))}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Day Remarks">
                    <textarea
                      className={`${inp} resize-none`}
                      rows={2}
                      value={form.day_remarks}
                      onChange={e => setForm(f => ({ ...f, day_remarks: e.target.value }))}
                      placeholder="Optional day-level remarks"
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* ── Product Data Entry sections ────────────────────────────────── */}
            <div className="mt-4 space-y-3">
              {form.productRows.map((row, idx) => (
                <SectionCard
                  key={idx}
                  title={`Product Data Entry ${idx + 1}`}
                  icon={<Package size={15} className="text-emerald-600" />}
                  defaultOpen={idx === 0}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label={`Product ${idx + 1}`}>
                      <SearchableSelect
                        options={productOptions}
                        value={row.product_id}
                        onChange={v => setRow(idx, { product_id: v })}
                        placeholder="— Select Product —"
                      />
                    </Field>
                    <Field label="Batch Number">
                      <input
                        className={inp}
                        value={row.batch_number}
                        onChange={e => setRow(idx, { batch_number: e.target.value })}
                        placeholder="Batch #"
                      />
                    </Field>
                    <Field label="Produced Sheets">
                      <input
                        type="number"
                        min="0"
                        className={inp}
                        placeholder="0"
                        value={row.produced_sheets}
                        onChange={e => setRow(idx, { produced_sheets: e.target.value })}
                      />
                    </Field>
                    <Field label="Target Sheets">
                      <input
                        type="number"
                        min="0"
                        className={inp}
                        placeholder="0"
                        value={row.target_sheets}
                        onChange={e => setRow(idx, { target_sheets: e.target.value })}
                      />
                    </Field>
                    <Field label="No. of Tests Produced">
                      <input
                        type="number"
                        min="0"
                        className={inp}
                        placeholder="0"
                        value={row.tests_produced}
                        onChange={e => setRow(idx, { tests_produced: e.target.value })}
                      />
                    </Field>
                    <div className="md:col-span-2 lg:col-span-3">
                      <Field label="Remarks">
                        <textarea
                          className={`${inp} resize-none`}
                          rows={2}
                          value={row.production_remarks}
                          onChange={e => setRow(idx, { production_remarks: e.target.value })}
                          placeholder="Optional remarks for this product"
                        />
                      </Field>
                    </div>
                  </div>
                </SectionCard>
              ))}
            </div>

            {/* ── Packaging section ─────────────────────────────────────────── */}
            <div className="mt-4">
              <SectionCard
                title="Packaging Details"
                icon={<Boxes size={15} className="text-amber-600" />}
                defaultOpen
              >
                {/* Shared packaging staffing */}
                <div className="grid grid-cols-1 gap-4 mb-5">
                  <Field label="Packaging Employees">
                    <input
                      type="number"
                      min="0"
                      className={inp}
                      placeholder="0"
                      value={form.pkg_employees}
                      onChange={e => setForm(f => ({ ...f, pkg_employees: e.target.value }))}
                    />
                  </Field>
                </div>

                {/* 3 packaging product sub-sections, each with No. of Tests */}
                <div className="space-y-4">
                  {form.pkgRows.map((pkg, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-4 bg-gray-50/40">
                      <p className="text-xs font-semibold text-gray-600 mb-3">
                        Packaging Product {idx + 1}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Product">
                          <SearchableSelect
                            options={productOptions}
                            value={pkg.product_id}
                            onChange={v => setPkgRow(idx, { product_id: v })}
                            placeholder="— Select Product —"
                          />
                        </Field>
                        <Field label="No. of Tests">
                          <input
                            type="number"
                            min="0"
                            className={inp}
                            placeholder="0"
                            value={pkg.pouches}
                            onChange={e => setPkgRow(idx, { pouches: e.target.value })}
                          />
                        </Field>
                        <Field label="Remarks">
                          <input
                            className={inp}
                            value={pkg.remarks}
                            onChange={e => setPkgRow(idx, { remarks: e.target.value })}
                            placeholder="Optional remarks"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Validation errors */}
            {errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">{err}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={clearForm}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={13} /> Clear
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                <Check size={15} /> {saving ? 'Saving...' : editId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters & Search ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar size={14} className="text-gray-400" />
          <FilterPill label="All" value="all" />
          <FilterPill label="Today" value="today" />
          <FilterPill label="This Week" value="week" />
          <FilterPill label="This Month" value="month" />
          <FilterPill label="Custom" value="custom" />
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white min-w-[200px]">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            className="text-xs flex-1 outline-none placeholder:text-gray-400 bg-transparent"
            placeholder="Search records..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Records table ────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Batch</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sheets</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Target</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Tests</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Pkg Tests</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">
                  {records.length === 0 ? 'No production records yet. Add your first entry.' : 'No records match the current filter.'}
                </td></tr>
              ) : filtered.map(r => (
                <React.Fragment key={r.id}>
                  <tr
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">{formatDate(r.entry_date)}</td>
                    <td className="px-4 py-3 text-gray-700">{r.products?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.batch_number}</td>
                    <td className="px-4 py-3 text-gray-700 text-right">{r.produced_sheets?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-right">{r.target_sheets?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-right">{r.prod_tests_1?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-right">
                      {((r.pkg_pouches ?? 0) + (r.pkg_pouches_2 ?? 0) + (r.pkg_pouches_3 ?? 0)).toLocaleString() || '—'}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                        {expandedId === r.id ? <ChevronUp size={14} className="text-gray-400 ml-1" /> : <ChevronDown size={14} className="text-gray-400 ml-1" />}
                      </div>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className="bg-gray-50/40">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 max-w-3xl">
                          <Row label="Production Employees" value={r.production_employees?.toString() ?? '—'} />
                          <Row label="No. of Tests Produced" value={r.prod_tests_1?.toLocaleString() ?? '—'} />
                          <Row label="Packaging Product 1" value={r.pkg_product?.name ?? '—'} />
                          <Row label="Pkg Tests 1" value={r.pkg_pouches?.toLocaleString() ?? '—'} />
                          <Row label="Packaging Product 2" value={r.products?.name ? (r.pkg_product_id_2 ? r.pkg_product?.name ?? '—' : '—') : '—'} />
                          <Row label="Pkg Tests 2" value={r.pkg_pouches_2?.toLocaleString() ?? '—'} />
                          <Row label="Packaging Product 3" value={r.pkg_product_id_3 ? 'Set' : '—'} />
                          <Row label="Pkg Tests 3" value={r.pkg_pouches_3?.toLocaleString() ?? '—'} />
                          <Row label="Packaging Employees" value={r.pkg_employees?.toString() ?? '—'} />
                          {r.production_remarks && <Row label="Production Remarks" value={r.production_remarks} />}
                          {r.day_remarks && <Row label="Day Remarks" value={r.day_remarks} />}
                          {r.pkg_remarks && <Row label="Packaging Remarks" value={r.pkg_remarks} />}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/60">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {records.length} {records.length === 1 ? 'record' : 'records'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
