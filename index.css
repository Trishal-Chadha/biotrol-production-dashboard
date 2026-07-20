import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Users, AlertCircle } from 'lucide-react';
import { supabase, Employee } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

const ROLES = [
  'Production Incharge',
  'Packaging Incharge',
  'Supervisor',
  'Operator',
  'Quality Control',
  'Manager',
  'Other',
];

const inp =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white placeholder:text-gray-400';

const emptyForm = { name: '', role: '', active: true };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  async function fetchEmployees() {
    setLoading(true);
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  }

  useEffect(() => { fetchEmployees(); }, []);

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(e: Employee) {
    setForm({ name: e.name, role: e.role ?? '', active: e.active });
    setEditId(e.id);
    setError('');
    setShowForm(true);
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.name.trim()) { setError('Employee name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      active: form.active,
    };
    if (editId) {
      const { error: err } = await supabase.from('employees').update(payload).eq('id', editId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('employees').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    setShowForm(false);
    fetchEmployees();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this employee? This may affect existing production records.')) return;
    await supabase.from('employees').delete().eq('id', id);
    fetchEmployees();
  }

  async function toggleActive(e: Employee) {
    await supabase.from('employees').update({ active: !e.active }).eq('id', e.id);
    fetchEmployees();
  }

  const displayed = employees.filter(e => {
    if (filterActive === 'active') return e.active;
    if (filterActive === 'inactive') return !e.active;
    return true;
  });

  const activeCount = employees.filter(e => e.active).length;
  const inactiveCount = employees.filter(e => !e.active).length;

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage production and packaging staff."
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm shadow-blue-200 transition-all"
          >
            <Plus size={16} strokeWidth={2.5} /> Add Employee
          </button>
        }
      />

      {/* Summary badges */}
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="bg-blue-50 rounded-lg p-2"><Users size={18} className="text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Staff</p>
            <p className="text-xl font-bold text-gray-800">{employees.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="bg-emerald-50 rounded-lg p-2"><Check size={18} className="text-emerald-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-xl font-bold text-gray-800">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="bg-gray-100 rounded-lg p-2"><X size={18} className="text-gray-500" /></div>
          <div>
            <p className="text-xs text-gray-500">Inactive</p>
            <p className="text-xl font-bold text-gray-800">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-gray-800">{editId ? 'Edit Employee' : 'Add New Employee'}</h2>
              <p className="text-xs text-gray-400 mt-0.5">This person will appear in the Production and Packaging Incharge dropdowns.</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={inp}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Ahmed Khan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Role</label>
                <select
                  className={inp}
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="">— Select Role —</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  className={inp}
                  value={form.active ? 'active' : 'inactive'}
                  onChange={e => setForm(f => ({ ...f, active: e.target.value === 'active' }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
                <AlertCircle size={12} /> {error}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-60">
                <Check size={14} /> {saving ? 'Saving...' : editId ? 'Update' : 'Save Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterActive(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filterActive === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? `All (${employees.length})` : f === 'active' ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                      <span className="text-xs">Loading employees...</span>
                    </div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users size={20} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        {employees.length === 0 ? 'No employees yet.' : 'No employees match this filter.'}
                      </p>
                      {employees.length === 0 && (
                        <p className="text-xs text-gray-400">Add employees to use them as Production or Packaging Incharge.</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : displayed.map(e => (
                <tr key={e.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {e.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {e.role ? (
                      <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                        {e.role}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(e)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        e.active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title="Click to toggle status"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${e.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {e.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/40">
            <p className="text-xs text-gray-400">{displayed.length} employee{displayed.length !== 1 ? 's' : ''} shown</p>
          </div>
        )}
      </div>
    </div>
  );
}
