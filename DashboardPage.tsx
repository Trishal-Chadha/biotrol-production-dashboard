import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Check, Search, RotateCcw, Calendar } from 'lucide-react';
import { supabase, SheetEntry } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

// ─── helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(d: string) {
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

// ─── empty form ─────────────────────────────────────────────────────────────

const emptyForm = () => ({
  entry_date: today(),
  sheet_code: '',
  num_sheets: '',
  production_time: '',
  dhd_employees: '',
  packing_employees: '',
  remarks: '',
});

type FormState = ReturnType<typeof emptyForm>;

// ─── validation ─────────────────────────────────────────────────────────────

function validate(form: FormState): string[] {
  const errors: string[] = [];
  if (!form.entry_date) errors.push('Date is required.');
  if (!form.sheet_code.trim()) errors.push('Sheet Code is required.');
  if (!form.production_time.trim()) errors.push('Production Time is required.');
  if (form.num_sheets !== '' && Number(form.num_sheets) < 0)
    errors.push('Number of Sheets cannot be negative.');
  if (form.dhd_employees !== '' && Number(form.dhd_employees) < 0)
    errors.push('DHD Employees cannot be negative.');
  if (form.packing_employees !== '' && Number(form.packing_employees) < 0)
    errors.push('Packing Employees cannot be negative.');
  return errors;
}

// ─── computed fields ─────────────────────────────────────────────────────────

function computeDerived(form: FormState) {
  const dhd = form.dhd_employees !== '' ? Number(form.dhd_employees) : null;
  const packing = form.packing_employees !== '' ? Number(form.packing_employees) : null;
  const total = dhd !== null && packing !== null ? dhd + packing : dhd ?? packing ?? null;
  const sheets = form.num_sheets !== '' ? Number(form.num_sheets) : null;
  const spe = total && total > 0 && sheets !== null ? Number((sheets / total).toFixed(2)) : null;
  return { total_employees: total, sheets_per_employee: spe };
}

// ─── date filter types ───────────────────────────────────────────────────────

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

// ─── component ───────────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition bg-white';

export default function SheetEntryPage() {
  const [entries, setEntries] = useState<SheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // table filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // ── fetch ──────────────────────────────────────────────────────────────────

  async function fetchEntries() {
    setLoading(true);
    const { data } = await supabase
      .from('sheet_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setEntries(data as SheetEntry[]);
    setLoading(false);
  }

  useEffect(() => { fetchEntries(); }, []);

  // ── derived: computed live preview in form ─────────────────────────────────

  const { total_employees: liveTotal, sheets_per_employee: liveSpe } = computeDerived(form);

  // ── filtered entries ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStr = today();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    return entries.filter(e => {
      // date filter
      if (dateFilter === 'today' && e.entry_date !== todayStr) return false;
      if (dateFilter === 'week' && e.entry_date < weekStart) return false;
      if (dateFilter === 'month' && e.entry_date < monthStart) return false;
      if (dateFilter === 'custom') {
        if (customFrom && e.entry_date < customFrom) return false;
        if (customTo && e.entry_date > customTo) return false;
      }
      // text search
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          e.entry_date,
          e.sheet_code,
          e.production_time,
          e.remarks ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, dateFilter, customFrom, customTo, search]);

  // ── form actions ───────────────────────────────────────────────────────────

  function openAdd() {
    setForm(emptyForm());
    setEditId(null);
    setErrors([]);
    setShowForm(true);
  }

  function openEdit(e: SheetEntry) {
    setForm({
      entry_date: e.entry_date,
      sheet_code: e.sheet_code,
      num_sheets: e.num_sheets?.toString() ?? '',
      production_time: e.production_time,
      dhd_employees: e.dhd_employees?.toString() ?? '',
      packing_employees: e.packing_employees?.toString() ?? '',
      remarks: e.remarks ?? '',
    });
    setEditId(e.id);
    setErrors([]);
    setShowForm(true);
  }

  function clearForm() {
    setForm(emptyForm());
    setErrors([]);
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate(form);
    if (errs.length) { setErrors(errs); return; }

    setSaving(true);
    setErrors([]);
    const { total_employees, sheets_per_employee } = computeDerived(form);

    const payload = {
      entry_date: form.entry_date,
      sheet_code: form.sheet_code.trim(),
      num_sheets: form.num_sheets !== '' ? Number(form.num_sheets) : null,
      production_time: form.production_time.trim(),
      dhd_employees: form.dhd_employees !== '' ? Number(form.dhd_employees) : null,
      packing_employees: form.packing_employees !== '' ? Number(form.packing_employees) : null,
      total_employees,
      sheets_per_employee,
      remarks: form.remarks.trim() || null,
    };

    if (editId) {
      const { error } = await supabase.from('sheet_entries').update(payload).eq('id', editId);
      if (error) { setErrors([error.message]); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('sheet_entries').insert(payload);
      if (error) { setErrors([error.message]); setSaving(false); return; }
    }

    setSaving(false);
    setShowForm(false);
    fetchEntries();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sheet entry?')) return;
    await supabase.from('sheet_entries').delete().eq('id', id);
    fetchEntries();
  }

  // ── filter pill helper ─────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Sheet Entry"
        subtitle="Record daily sheet production data"
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Add Entry
          </button>
        }
      />

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              {editId ? 'Edit Sheet Entry' : 'New Sheet Entry'}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.entry_date}
                  onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
                />
              </div>

              {/* Sheet Code */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Sheet Code <span className="text-red-400">*</span>
                </label>
                <input
                  className={inputClass}
                  value={form.sheet_code}
                  onChange={e => setForm(f => ({ ...f, sheet_code: e.target.value }))}
                  placeholder="e.g. SC-2024-001"
                />
              </div>

              {/* Production Time */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Production Time <span className="text-red-400">*</span>
                </label>
                <input
                  className={inputClass}
                  value={form.production_time}
                  onChange={e => setForm(f => ({ ...f, production_time: e.target.value }))}
                  placeholder="e.g. 08:00–16:00"
                />
              </div>

              {/* Number of Sheets */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Number of Sheets</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.num_sheets}
                  onChange={e => setForm(f => ({ ...f, num_sheets: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* DHD Employees */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">DHD Employees</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.dhd_employees}
                  onChange={e => setForm(f => ({ ...f, dhd_employees: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Packing Employees */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Packing Employees</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.packing_employees}
                  onChange={e => setForm(f => ({ ...f, packing_employees: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Auto-computed preview */}
              <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Total Employees (auto)</span>
                  <span className="text-sm font-bold text-gray-800">
                    {liveTotal !== null ? liveTotal : '—'}
                  </span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Sheets / Employee (auto)</span>
                  <span className="text-sm font-bold text-gray-800">
                    {liveSpe !== null ? liveSpe : '—'}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={2}
                  value={form.remarks}
                  onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder="Optional remarks"
                />
              </div>

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
        {/* Date filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar size={14} className="text-gray-400" />
          <FilterPill label="All" value="all" />
          <FilterPill label="Today" value="today" />
          <FilterPill label="This Week" value="week" />
          <FilterPill label="This Month" value="month" />
          <FilterPill label="Custom" value="custom" />
        </div>

        {/* Custom date range */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              placeholder="From"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              placeholder="To"
            />
          </div>
        )}

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white min-w-[200px]">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            className="text-xs flex-1 outline-none placeholder:text-gray-400 bg-transparent"
            placeholder="Search entries..."
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

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sheet Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Prod. Time</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sheets</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">DHD Emp.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Pack Emp.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Total Emp.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sheets/Emp.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Remarks</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-sm text-gray-400">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-sm text-gray-400">
                    {entries.length === 0 ? 'No sheet entries yet. Add your first entry.' : 'No entries match the current filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">{formatDate(e.entry_date)}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{e.sheet_code}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.production_time}</td>
                    <td className="px-4 py-3 text-gray-700 text-right">{e.num_sheets ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-right">{e.dhd_employees ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-right">{e.packing_employees ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-800 font-semibold">{e.total_employees ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-blue-600 font-semibold">{e.sheets_per_employee ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{e.remarks ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/60">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
