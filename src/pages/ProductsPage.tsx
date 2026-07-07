import React, { useEffect, useState, useRef } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, Search, Download, Upload, FileSpreadsheet,
  Eye, Filter, AlertCircle, CheckCircle2, XCircle, FileX
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, Product } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

interface ImportRow {
  productCode: string;
  productName: string;
  productCategory: string;
  isValid: boolean;
  error?: string;
  isDuplicate?: boolean;
  existingId?: string;
}

interface ProductsPageProps {
  readOnly?: boolean;
}

export default function ProductsPage({ readOnly = false }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [form, setForm] = useState({ code: '', name: '', category: '', status: 'active' });
  const [editId, setEditId] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importOption, setImportOption] = useState<'skip' | 'update'>('skip');
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setProducts(data);
    setLoading(false);
  }

  useEffect(() => { fetchProducts(); }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && p.active) ||
      (statusFilter === 'inactive' && !p.active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  function resetForm() {
    setForm({ code: '', name: '', category: '', status: 'active' });
    setEditId(null);
    setError('');
  }

  function openAdd() {
    resetForm();
    setShowAddForm(true);
  }

  function openEdit(p: Product) {
    setForm({
      code: p.code ?? '',
      name: p.name,
      category: p.category ?? '',
      status: p.active ? 'active' : 'inactive'
    });
    setEditId(p.id);
    setError('');
    setShowAddForm(true);
  }

  function openView(p: Product) {
    setViewProduct(p);
    setShowViewModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.code.trim()) { setError('Product code is required.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      category: form.category.trim() || null,
      active: form.status === 'active',
    };

    if (editId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editId);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) { setError(error.message); setSaving(false); return; }
    }
    setSaving(false);
    setShowAddForm(false);
    fetchProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  }

  async function toggleStatus(p: Product) {
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    fetchProducts();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false });

        const processed: ImportRow[] = rows.map((row, idx) => {
          const keys = Object.keys(row).map(k => k.toLowerCase().replace(/\s+/g, ''));
          const codeKey = keys.find(k => k.includes('code')) || Object.keys(row)[0];
          const nameKey = keys.find(k => k.includes('name') && !k.includes('code')) || Object.keys(row)[1];
          const catKey = keys.find(k => k.includes('category') || k.includes('cat')) || Object.keys(row)[2];

          const productCode = (row[codeKey] || Object.values(row)[0] || '').toString().trim();
          const productName = (row[nameKey] || Object.values(row)[1] || '').toString().trim();
          const productCategory = (row[catKey] || Object.values(row)[2] || '').toString().trim();

          if (!productCode && !productName && !productCategory) {
            return { productCode: '', productName: '', productCategory: '', isValid: false, error: 'Empty row' };
          }

          if (!productCode) {
            return { productCode, productName, productCategory, isValid: false, error: 'Product code is required' };
          }
          if (!productName) {
            return { productCode, productName, productCategory, isValid: false, error: 'Product name is required' };
          }

          const existing = products.find(p =>
            p.code?.toLowerCase() === productCode.toLowerCase() &&
            p.category?.toLowerCase() === productCategory.toLowerCase()
          );

          return {
            productCode,
            productName,
            productCategory,
            isValid: true,
            isDuplicate: !!existing,
            existingId: existing?.id
          };
        }).filter(row => row.productCode || row.productName || row.productCategory);

        setImportData(processed);
        setShowImportModal(true);
      } catch (err) {
        alert('Failed to read file. Please ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  async function handleImport() {
    setImporting(true);
    const toImport = importData.filter(r => r.isValid && (!r.isDuplicate || importOption === 'update'));

    for (const row of toImport) {
      if (row.isDuplicate && row.existingId) {
        await supabase.from('products').update({
          name: row.productName,
          code: row.productCode,
          category: row.productCategory || null,
        }).eq('id', row.existingId);
      } else {
        await supabase.from('products').insert({
          name: row.productName,
          code: row.productCode,
          category: row.productCategory || null,
          active: true,
        });
      }
    }

    setImporting(false);
    setShowImportModal(false);
    setImportData([]);
    fetchProducts();
  }

  function handleExport() {
    const exportData = products.map(p => ({
      'Product Code': p.code || '',
      'Product Name': p.name,
      'Product Category': p.category || '',
      'Status': p.active ? 'Active' : 'Inactive'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products_export.xlsx');
  }

  function downloadTemplate() {
    const template = [
      { 'Product Code': 'PRD-001', 'Product Name': 'Example Product', 'Product Category': 'Category A' },
      { 'Product Code': 'PRD-002', 'Product Name': 'Another Product', 'Product Category': 'Category B' }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'product_import_template.xlsx');
  }

  const validCount = importData.filter(r => r.isValid && !r.isDuplicate).length;
  const duplicateCount = importData.filter(r => r.isValid && r.isDuplicate).length;
  const invalidCount = importData.filter(r => !r.isValid).length;

  return (
    <div>
      <PageHeader
        title="Product Master"
        subtitle={readOnly ? "View product catalogue" : "Manage your product catalogue"}
        actions={
          readOnly ? (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={16} /> Export
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} /> Add Product
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Upload size={16} /> Import Products
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={16} /> Export
              </button>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-gray-300"
              >
                <FileSpreadsheet size={16} /> Template
              </button>
            </div>
          )
        }
      />

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition bg-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">{editId ? 'Edit Product' : 'Add New Product'}</h2>
            <button onClick={() => { setShowAddForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Code *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. PRD-001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Category</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Disinfectant"
                  list="category-list"
                />
                <datalist id="category-list">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition bg-white"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {error && <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); resetForm(); }}
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

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">Loading...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No products found.</td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-700 text-xs">{p.code || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category || '—'}</td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    ) : (
                      <button
                        onClick={() => toggleStatus(p)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          p.active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {p.active ? 'Active' : 'Inactive'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openView(p)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      {!readOnly && (
                        <>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showViewModal && viewProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Product Details</h2>
              <button onClick={() => { setShowViewModal(false); setViewProduct(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Product Code</p>
                  <p className="text-sm font-mono text-gray-800">{viewProduct.code || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Product Name</p>
                  <p className="text-sm text-gray-800">{viewProduct.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Category</p>
                  <p className="text-sm text-gray-800">{viewProduct.category || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    viewProduct.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${viewProduct.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {viewProduct.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                  <p className="text-sm text-gray-800">
                    {new Date(viewProduct.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => { setShowViewModal(false); setViewProduct(null); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Import Preview</h2>
              <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-2xl font-bold text-gray-800">{importData.length}</p>
                  <p className="text-xs text-gray-500">Total Products</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{validCount}</p>
                  <p className="text-xs text-green-600">Valid Products</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-2xl font-bold text-amber-700">{duplicateCount}</p>
                  <p className="text-xs text-amber-600">Duplicates</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
                  <p className="text-xs text-red-600">Invalid Rows</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Code</th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Name</th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {importData.map((row, idx) => (
                    <tr key={idx} className={!row.isValid ? 'bg-red-50/50' : row.isDuplicate ? 'bg-amber-50/50' : ''}>
                      <td className="py-2.5 font-mono text-xs text-gray-700">{row.productCode || '—'}</td>
                      <td className="py-2.5 text-gray-800">{row.productName || '—'}</td>
                      <td className="py-2.5 text-gray-500">{row.productCategory || '—'}</td>
                      <td className="py-2.5">
                        {!row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircle size={10} /> {row.error}
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <AlertCircle size={10} /> Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 size={10} /> Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {duplicateCount > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 bg-blue-50">
                <p className="text-xs font-medium text-blue-700 mb-2">Duplicate products found. Choose how to handle them:</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importOption"
                      value="skip"
                      checked={importOption === 'skip'}
                      onChange={() => setImportOption('skip')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Skip Existing Products</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importOption"
                      value="update"
                      checked={importOption === 'update'}
                      onChange={() => setImportOption('update')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Update Existing Products</span>
                  </label>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => { setShowImportModal(false); setImportData([]); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                <Check size={15} /> {importing ? 'Importing...' : `Import ${importOption === 'update' ? validCount + duplicateCount : validCount} Products`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
