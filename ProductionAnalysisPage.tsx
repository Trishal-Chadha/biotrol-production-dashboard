import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { supabase, Product, ProductionEntry } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

const emptyForm = {
  entry_date: '',
  product_id: '',
  quantity_produced: '',
  lot_number: '',
  batch_number: '',
  operator: '',
  remarks: '',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function ProductionEntryPage() {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    setLoading(true);
    const [{ data: ent }, { data: prod }] = await Promise.all([
      supabase
        .from('production_entries')
        .select('*, products(id,name)')
        .order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
    ]);
    if (ent) setEntries(ent);
    if (prod) setProducts(prod);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(e: ProductionEntry) {
    setForm({
      entry_date: e.entry_date ?? '',
      product_id: e.product_id ?? '',
      quantity_produced: e.quantity_produced?.toString() ?? '',
      lot_number: e.lot_number ?? '',
      batch_number: e.batch_number ?? '',
      operator: e.operator ?? '',
      remarks: e.remarks ?? '',
    });
    setEditId(e.id);
    setError('');
    setShowForm(true);
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      entry_date: form.entry_date || null,
      product_id: form.product_id || null,
      quantity_produced: form.quantity_produced ? parseFloat(form.quantity_produced) : null,
      lot_number: form.lot_number.trim() || null,
      batch_number: form.batch_number.trim() || null,
      operator: form.operator.trim() || null,
      remarks: form.remarks.trim() || null,
    };
    if (editId) {
      const { error } = await supabase.from('production_entries').update(payload).eq('id', editId);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('production_entries').insert(payload);
      if (error) { setError(error.message); setSaving(false); return; }
    }
    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return;
    await supabase.from('production_entries').delete().eq('id', id);
    fetchAll();
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition bg-white";

  return (
    <div>
      <PageHeader
        title="Production Entry"
        subtitle="Record daily production output"
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Add Entry
          </button>
        }
      />

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">{editId ? 'Edit Entry' : 'New Production Entry'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entry Date</label>
              <input type="date" className={inputClass} value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
              <select className={inputClass} value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
                <option value="">— Select Product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity Produced</label>
              <input type="number" step="any" className={inputClass} value={form.quantity_produced} onChange={e => setForm(f => ({ ...f, quantity_produced: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Operator</label>
              <input className={inputClass} value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} placeholder="Operator name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lot Number</label>
              <input className={inputClass} value={form.lot_number} onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="Lot #" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Batch Number</label>
              <input className={inputClass} value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} placeholder="Batch #" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <textarea className={`${inputClass} resize-none`} rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional remarks" />
            </div>
            {error && <div className="md:col-span-2 text-xs text-red-500">{error}</div>}
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60">
                <Check size={15} /> {saving ? 'Saving...' : editId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty Produced</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lot No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Operator</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Remarks</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400">No entries yet.</td></tr>
              ) : entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(e.entry_date)}</td>
                  <td className="px-4 py-3 text-gray-700">{e.products?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{e.quantity_produced ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.lot_number ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.batch_number ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.operator ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{e.remarks ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
