import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  Search, Calendar, Package2, Layers, Users, CheckCircle2,
  AlertCircle, RotateCcw,
} from 'lucide-react';
import { supabase, Product, Employee, ProductionData } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

// ─── helpers ─────────────────────────────────────────────────────────────────

const todayIso = () => new Date().toISOString().slice(0, 10);

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function startOfMonth() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
}

const PAGE_SIZE = 15;

// ─── shared input style ───────────────────────────────────────────────────────

const inp =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white placeholder:text-gray-400';

// ─── empty form ───────────────────────────────────────────────────────────────

interface ProductRow {
  product_id: string;
  batch_number: string;
  produced_sheets: string;
  target_sheets: string;
  production_incharge_id: string;
  production_remarks: string;
}

const emptyProductRow = (): ProductRow => ({
  product_id: '',
  batch_number: '',
  produced_sheets: '',
  target_sheets: '',
  production_incharge_id: '',
  production_remarks: '',
});

interface PackagingRow {
  product_id: string;
  pouches: string;
  remarks: string;
}

const emptyPackagingRow = (): PackagingRow => ({
  product_id: '',
  pouches: '',
  remarks: '',
});

const emptyForm = () => ({
  entry_date: todayIso(),
  productRows: [emptyProductRow(), emptyProductRow(), emptyProductRow()],
  production_employees: '',
  pkgRows: [emptyPackagingRow(), emptyPackagingRow(), emptyPackagingRow()],
  pkg_employees: '',
  pkg_incharge_id: '',
  test_pouch_produced: '',
  day_remarks: '',
});

type FormState = ReturnType<typeof emptyForm>;

// ─── validation ───────────────────────────────────────────────────────────────

interface FieldErrors {
  [key: string]: string;
}

function validate(f: FormState): FieldErrors {
  const e: FieldErrors = {};
  if (!f.entry_date) e.entry_date = 'Required';
  f.productRows.forEach((row, idx) => {
    if (row.produced_sheets !== '' && Number(row.produced_sheets) < 0) e[`row_${idx}_produced_sheets`] = 'Must be ≥ 0';
    if (row.target_sheets !== '' && Number(row.target_sheets) < 0) e[`row_${idx}_target_sheets`] = 'Must be ≥ 0';
  });
  f.pkgRows.forEach((row, idx) => {
    if (row.pouches !== '' && Number(row.pouches) < 0) e[`pkg_${idx}_pouches`] = 'Must be ≥ 0';
  });
  if (f.production_employees !== '' && Number(f.production_employees) < 0) e.production_employees = 'Must be ≥ 0';
  if (f.test_pouch_produced !== '' && Number(f.test_pouch_produced) < 0) e.test_pouch_produced = 'Must be ≥ 0';
  if (f.pkg_employees !== '' && Number(f.pkg_employees) < 0) e.pkg_employees = 'Must be ≥ 0';
  return e;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, accent, loading,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${accent}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5 tabular-nums">
          {loading ? <span className="text-gray-300">—</span> : value}
        </p>
      </div>
    </div>
  );
}

// ─── section card ─────────────────────────────────────────────────────────────

function SectionCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </span>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── form field wrapper ───────────────────────────────────────────────────────

function Field({
  label, error, children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── view modal ───────────────────────────────────────────────────────────────

function ViewModal({ record, products, employees, onClose }: {
  record: ProductionData;
  products: Product[];
  employees: Employee[];
  onClose: () => void;
}) {
  const prod = products.find(p => p.id === record.product_id);
  const pkgProds = [
    products.find(p => p.id === record.pkg_product_id),
    products.find(p => p.id === record.pkg_product_id_2),
    products.find(p => p.id === record.pkg_product_id_3),
  ];
  const pkgPouches = [record.pkg_pouches, record.pkg_pouches_2, record.pkg_pouches_3];
  const pkgRemarks = [record.pkg_remarks, record.pkg_remarks_2, record.pkg_remarks_3];
  const prodIncharge = employees.find(e => e.id === record.production_incharge_id);
  const pkgIncharge = employees.find(e => e.id === record.pkg_incharge_id);

  function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="flex py-2.5 border-b border-gray-50 last:border-0">
        <span className="text-xs font-medium text-gray-500 w-48 flex-shrink-0">{label}</span>
        <span className="text-sm text-gray-800 font-medium">{value ?? '—'}</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">Production Record</h2>
            <p className="text-xs text-gray-400 mt-0.5">Batch: {record.batch_number} · {fmtDate(record.entry_date)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Production</p>
            <Row label="Date" value={fmtDate(record.entry_date)} />
            <Row label="Product" value={prod?.name} />
            <Row label="Batch Number" value={record.batch_number} />
            <Row label="No. Sheets Produced" value={record.produced_sheets.toLocaleString()} />
            <Row label="Target Sheets" value={record.target_sheets.toLocaleString()} />
            <Row label="Production Employees" value={record.production_employees} />
            <Row label="Production Incharge" value={prodIncharge?.name} />
            {record.production_remarks && <Row label="Remarks" value={record.production_remarks} />}
          </div>
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Packaging</p>
            <Row label="Packaging Employees" value={record.pkg_employees} />
            <Row label="Packaging Incharge" value={pkgIncharge?.name} />
            {[0, 1, 2].map(i => (pkgProds[i] || pkgPouches[i] != null || pkgRemarks[i]) && (
              <div key={i} className="pt-2 first:pt-0">
                {i > 0 && <div className="border-t border-gray-100 my-2" />}
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Product {i + 1}</p>
                <Row label="Product" value={pkgProds[i]?.name} />
                <Row label="No. of Tests" value={pkgPouches[i]} />
                {pkgRemarks[i] && <Row label="Remarks" value={pkgRemarks[i]} />}
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Final Details</p>
            <Row label="Test / Pouch Produced" value={record.test_pouch_produced.toLocaleString()} />
            {record.day_remarks && <Row label="Remarks of Day" value={record.day_remarks} />}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ProductionDataPage() {
  const [records, setRecords] = useState<ProductionData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // view modal
  const [viewRecord, setViewRecord] = useState<ProductionData | null>(null);

  // filters
  const [searchQ, setSearchQ] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // pagination
  const [page, setPage] = useState(1);

  // ── data fetch ───────────────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('production_data')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setRecords(data as ProductionData[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const [{ data: prod }, { data: emp }] = await Promise.all([
        supabase.from('products').select('*').eq('active', true).order('name'),
        supabase.from('employees').select('*').eq('active', true).order('name'),
      ]);
      if (prod) setProducts(prod);
      if (emp) setEmployees(emp);
    }
    init();
    fetchRecords();
  }, [fetchRecords]);

  // ── KPI calculations ─────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const t = todayIso();
    const ms = startOfMonth();
    return {
      total: records.length,
      today: records.filter(r => r.entry_date === t).length,
      month: records.filter(r => r.entry_date >= ms).length,
      totalUnits: records.reduce((s, r) => s + (r.produced_units || 0), 0),
    };
  }, [records]);

  // ── filtered + paginated ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterProduct && r.product_id !== filterProduct) return false;
      if (filterFrom && r.entry_date < filterFrom) return false;
      if (filterTo && r.entry_date > filterTo) return false;
      if (searchQ) {
        const q = searchQ.toLowerCase();
        const prod = products.find(p => p.id === r.product_id);
        const haystack = [r.batch_number, r.entry_date, prod?.name ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, filterProduct, filterFrom, filterTo, searchQ, products]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [filterProduct, filterFrom, filterTo, searchQ]);

  // ── drawer helpers ───────────────────────────────────────────────────────

  function openAdd() {
    setForm(emptyForm());
    setFieldErrors({});
    setEditId(null);
    setDrawerOpen(true);
  }

  function openEdit(r: ProductionData) {
    setForm({
      entry_date: r.entry_date,
      productRows: [
        {
          product_id: r.product_id ?? '',
          batch_number: r.batch_number,
          produced_sheets: String(r.produced_sheets),
          target_sheets: String(r.target_sheets),
          production_incharge_id: r.production_incharge_id ?? '',
          production_remarks: r.production_remarks ?? '',
        },
        emptyProductRow(),
        emptyProductRow(),
      ],
      production_employees: String(r.production_employees),
      pkgRows: [
        { product_id: r.pkg_product_id ?? '', pouches: r.pkg_pouches != null ? String(r.pkg_pouches) : '', remarks: r.pkg_remarks ?? '' },
        { product_id: r.pkg_product_id_2 ?? '', pouches: r.pkg_pouches_2 != null ? String(r.pkg_pouches_2) : '', remarks: r.pkg_remarks_2 ?? '' },
        { product_id: r.pkg_product_id_3 ?? '', pouches: r.pkg_pouches_3 != null ? String(r.pkg_pouches_3) : '', remarks: r.pkg_remarks_3 ?? '' },
      ],
      pkg_employees: r.pkg_employees != null ? String(r.pkg_employees) : '',
      pkg_incharge_id: r.pkg_incharge_id ?? '',
      test_pouch_produced: String(r.test_pouch_produced),
      day_remarks: r.day_remarks ?? '',
    });
    setFieldErrors({});
    setEditId(r.id);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditId(null);
  }

  function clearForm() {
    setForm(emptyForm());
    setFieldErrors({});
  }

  function setF(patch: Partial<FormState>) {
    setForm(f => ({ ...f, ...patch }));
  }

  function setRow(idx: number, patch: Partial<ProductRow>) {
    setForm(f => ({
      ...f,
      productRows: f.productRows.map((r, i) => i === idx ? { ...r, ...patch } : r),
    }));
  }

  function setPkgRow(idx: number, patch: Partial<PackagingRow>) {
    setForm(f => ({
      ...f,
      pkgRows: f.pkgRows.map((r, i) => i === idx ? { ...r, ...patch } : r),
    }));
  }

  // ── save ─────────────────────────────────────────────────────────────────

  async function handleSave(andNew = false) {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setSaving(true);
    setFieldErrors({});

    const numOrZero = (v: string) => v === '' ? 0 : Number(v) || 0;

    const packagingFields = {
      pkg_employees: form.pkg_employees !== '' ? Number(form.pkg_employees) : null,
      pkg_incharge_id: form.pkg_incharge_id || null,
      pkg_product_id: form.pkgRows[0].product_id || null,
      pkg_pouches: form.pkgRows[0].pouches !== '' ? Number(form.pkgRows[0].pouches) : null,
      pkg_remarks: form.pkgRows[0].remarks.trim() || null,
      pkg_product_id_2: form.pkgRows[1].product_id || null,
      pkg_pouches_2: form.pkgRows[1].pouches !== '' ? Number(form.pkgRows[1].pouches) : null,
      pkg_remarks_2: form.pkgRows[1].remarks.trim() || null,
      pkg_product_id_3: form.pkgRows[2].product_id || null,
      pkg_pouches_3: form.pkgRows[2].pouches !== '' ? Number(form.pkgRows[2].pouches) : null,
      pkg_remarks_3: form.pkgRows[2].remarks.trim() || null,
    };

    const commonFields = {
      entry_date: form.entry_date || todayIso(),
      production_employees: numOrZero(form.production_employees),
      test_pouch_produced: numOrZero(form.test_pouch_produced),
      day_remarks: form.day_remarks.trim() || null,
      ...packagingFields,
    };

    if (editId) {
      const row = form.productRows[0];
      const payload = {
        ...commonFields,
        product_id: row.product_id || null,
        batch_number: row.batch_number.trim(),
        produced_sheets: numOrZero(row.produced_sheets),
        produced_units: numOrZero(row.produced_sheets),
        target_sheets: numOrZero(row.target_sheets),
        production_incharge_id: row.production_incharge_id || null,
        production_remarks: row.production_remarks.trim() || null,
      };
      const { error: err } = await supabase.from('production_data').update(payload).eq('id', editId);
      setSaving(false);
      if (err) { setFieldErrors({ _root: err.message }); return; }
    } else {
      const rowsWithData = form.productRows.filter(row =>
        row.product_id || row.produced_sheets !== '' || row.batch_number.trim()
      );
      const insertRows = rowsWithData.length > 0 ? rowsWithData : [form.productRows[0]];

      const payloads = insertRows.map(row => ({
        ...commonFields,
        product_id: row.product_id || null,
        batch_number: row.batch_number.trim(),
        produced_sheets: numOrZero(row.produced_sheets),
        produced_units: numOrZero(row.produced_sheets),
        target_sheets: numOrZero(row.target_sheets),
        production_incharge_id: row.production_incharge_id || null,
        production_remarks: row.production_remarks.trim() || null,
      }));

      const { error: err } = await supabase.from('production_data').insert(payloads);
      setSaving(false);
      if (err) { setFieldErrors({ _root: err.message }); return; }
    }

    fetchRecords();

    if (andNew) {
      setForm(emptyForm());
      setFieldErrors({});
      setEditId(null);
    } else {
      closeDrawer();
    }
  }

  // ── delete ───────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this production record?')) return;
    await supabase.from('production_data').delete().eq('id', id);
    fetchRecords();
  }

  // ─────────────────────────────────────────────────────────────────────────

  function productName(id: string | null) {
    return products.find(p => p.id === id)?.name ?? '—';
  }

  function employeeName(id: string | null) {
    return employees.find(e => e.id === id)?.name ?? '—';
  }

  const E = fieldErrors;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <PageHeader
        title="Production Data"
        subtitle="View and manage all production records."
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm shadow-blue-200 transition-all"
          >
            <Plus size={16} strokeWidth={2.5} /> New Entry
          </button>
        }
      />

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Entries" value={kpis.total.toLocaleString()} loading={loading}
          icon={<Layers size={20} className="text-blue-600" />} accent="bg-blue-50" />
        <KpiCard label="Today's Entries" value={kpis.today} loading={loading}
          icon={<Calendar size={20} className="text-emerald-600" />} accent="bg-emerald-50" />
        <KpiCard label="This Month" value={kpis.month} loading={loading}
          icon={<CheckCircle2 size={20} className="text-violet-600" />} accent="bg-violet-50" />
        <KpiCard label="Total Units Produced" value={kpis.totalUnits.toLocaleString()} loading={loading}
          icon={<Package2 size={20} className="text-amber-600" />} accent="bg-amber-50" />
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        {/* Date from */}
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-gray-400" />
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            placeholder="From"
          />
          <span className="text-xs text-gray-400">–</span>
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
          />
        </div>

        {/* Product filter */}
        <select
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white text-gray-600"
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
        >
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white min-w-[220px]">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            className="text-xs flex-1 outline-none placeholder:text-gray-400 bg-transparent"
            placeholder="Search batch, product..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          {searchQ && (
            <button onClick={() => setSearchQ('')} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Clear filters */}
        {(filterProduct || filterFrom || filterTo || searchQ) && (
          <button
            onClick={() => { setFilterProduct(''); setFilterFrom(''); setFilterTo(''); setSearchQ(''); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
          >
            <RotateCcw size={12} /> Clear
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {[
                  'Date', 'Product', 'Batch Number',
                  'No. Sheets Produced', 'Target Sheets',
                  'Employees (Prod.)', 'Production Incharge', 'Actions',
                ].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                      <span className="text-xs">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-sm text-gray-400">
                    {records.length === 0 ? 'No production records yet. Click "+ New Entry" to create one.' : 'No records match your filters.'}
                  </td>
                </tr>
              ) : paginated.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                      {productName(r.product_id)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.batch_number}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">{r.produced_sheets.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="tabular-nums text-gray-700">{r.target_sheets.toLocaleString()}</span>
                      {r.produced_sheets >= r.target_sheets ? (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">MET</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">BELOW</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Users size={13} className="text-gray-400" /> {r.production_employees}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{employeeName(r.production_incharge_id)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewRecord(r)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing <span className="font-medium text-gray-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of{' '}
              <span className="font-medium text-gray-700">{filtered.length}</span> records
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-gray-200"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs rounded-lg transition-all font-medium ${page === p ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:border-gray-200 border border-transparent'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-gray-200"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View Modal ───────────────────────────────────────────────────── */}
      {viewRecord && (
        <ViewModal
          record={viewRecord}
          products={products}
          employees={employees}
          onClose={() => setViewRecord(null)}
        />
      )}

      {/* ── Slide-over Drawer ────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeDrawer}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[72%] min-w-[480px] max-w-5xl bg-gray-50 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">
              {editId ? 'Edit Production Entry' : 'New Production Entry'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editId ? 'Update the production record below.' : 'Fill in the production, packaging and final details.'}
            </p>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {E._root && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {E._root}
            </div>
          )}

          {/* ── CARD 1: PRODUCTION ──────────────────────────────────── */}
          <SectionCard number="1" title="Production">
            {/* Shared fields */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <Field label="Date">
                <input type="date" className={inp} value={form.entry_date} onChange={e => setF({ entry_date: e.target.value })} />
              </Field>
              <Field label="Employees in Production">
                <input type="number" min="0" className={inp} placeholder="0" value={form.production_employees} onChange={e => setF({ production_employees: e.target.value })} />
              </Field>
            </div>

            {/* Product rows */}
            {form.productRows.map((row, idx) => (
              <div key={idx} className={idx > 0 ? 'mt-5 pt-5 border-t border-gray-100' : ''}>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Product {idx + 1}</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Product">
                    <select className={inp} value={row.product_id} onChange={e => setRow(idx, { product_id: e.target.value })}>
                      <option value="">— Select Product —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Batch Number">
                    <input className={inp} placeholder="e.g. BT-2024-001" value={row.batch_number} onChange={e => setRow(idx, { batch_number: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="No. Sheets Produced">
                    <input type="number" min="0" className={inp} placeholder="0" value={row.produced_sheets} onChange={e => setRow(idx, { produced_sheets: e.target.value })} />
                  </Field>
                  <Field label="No. Target Sheets">
                    <input type="number" min="0" className={inp} placeholder="0" value={row.target_sheets} onChange={e => setRow(idx, { target_sheets: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Production Incharge">
                    <select className={inp} value={row.production_incharge_id} onChange={e => setRow(idx, { production_incharge_id: e.target.value })}>
                      <option value="">— Select —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Remarks">
                  <textarea
                    className={`${inp} resize-none`}
                    rows={2}
                    placeholder="Optional production remarks..."
                    value={row.production_remarks}
                    onChange={e => setRow(idx, { production_remarks: e.target.value })}
                  />
                </Field>
              </div>
            ))}
          </SectionCard>

          {/* ── CARD 2: PACKAGING ───────────────────────────────────── */}
          <SectionCard number="2" title="Packaging">
            {/* Shared staffing fields at top */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <Field label="Packaging Incharge" error={E.pkg_incharge_id}>
                <select className={inp} value={form.pkg_incharge_id} onChange={e => setF({ pkg_incharge_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </Field>
              <Field label="Employees in Packaging" error={E.pkg_employees}>
                <input type="number" min="0" className={inp} placeholder="0" value={form.pkg_employees} onChange={e => setF({ pkg_employees: e.target.value })} />
              </Field>
            </div>

            {/* Packaging product sections */}
            {form.pkgRows.map((row, idx) => (
              <div key={idx} className={idx > 0 ? 'mt-5 pt-5 border-t border-gray-100' : ''}>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Product {idx + 1}</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Product">
                    <select className={inp} value={row.product_id} onChange={e => setPkgRow(idx, { product_id: e.target.value })}>
                      <option value="">— Select Product —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="No. of Tests" error={E[`pkg_${idx}_pouches`]}>
                    <input type="number" min="0" className={inp} placeholder="0" value={row.pouches} onChange={e => setPkgRow(idx, { pouches: e.target.value })} />
                  </Field>
                </div>
                <Field label="Remarks">
                  <textarea
                    className={`${inp} resize-none`}
                    rows={2}
                    placeholder="Optional packaging remarks..."
                    value={row.remarks}
                    onChange={e => setPkgRow(idx, { remarks: e.target.value })}
                  />
                </Field>
              </div>
            ))}
          </SectionCard>

          {/* ── CARD 3: FINAL DETAILS ───────────────────────────────── */}
          <SectionCard number="3" title="Final Details">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="No. of Test / Pouch Produced" error={E.test_pouch_produced}>
                <input type="number" min="0" className={inp} placeholder="0" value={form.test_pouch_produced} onChange={e => setF({ test_pouch_produced: e.target.value })} />
              </Field>
            </div>
            <Field label="Remarks of Day">
              <textarea
                className={`${inp} resize-none`}
                rows={3}
                placeholder="Summary notes for the day..."
                value={form.day_remarks}
                onChange={e => setF({ day_remarks: e.target.value })}
              />
            </Field>
          </SectionCard>

        </div>

        {/* ── Sticky action bar ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeDrawer}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 text-sm font-semibold text-blue-700 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Save & New
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg shadow-sm shadow-blue-200 transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              {saving ? 'Saving...' : editId ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
