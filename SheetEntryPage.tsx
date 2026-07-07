import React, { useEffect, useState } from 'react';
import {
  Package, ClipboardList, Users, TrendingUp, ArrowRight,
  Calendar, Layers, Target, CheckCircle2,
} from 'lucide-react';
import { supabase, ProductionData, Product } from '../lib/supabase';

interface DashStats {
  products: number;
  employees: number;
  totalRecords: number;
  todayRecords: number;
  monthRecords: number;
  totalUnits: number;
  todayUnits: number;
  monthUnits: number;
  totalSheets: number;
  targetSheets: number;
}

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

interface KpiProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
}

function KpiCard({ label, value, sub, icon, accent, loading }: KpiProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`rounded-xl p-3 flex-shrink-0 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5 tabular-nums">
          {loading ? <span className="text-gray-200">—</span> : value}
        </p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface QuickNavProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  onClick: () => void;
}

function QuickNav({ icon, title, desc, accent, onClick }: QuickNavProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-blue-100 transition-all group text-left w-full"
    >
      <div className={`rounded-lg p-2.5 flex-shrink-0 ${accent}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
}

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [stats, setStats] = useState<DashStats>({
    products: 0, employees: 0, totalRecords: 0, todayRecords: 0,
    monthRecords: 0, totalUnits: 0, todayUnits: 0, monthUnits: 0,
    totalSheets: 0, targetSheets: 0,
  });
  const [recentRecords, setRecentRecords] = useState<ProductionData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: pCount },
        { count: eCount },
        { data: allRec },
        { data: recentRaw },
        { data: prodList },
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('production_data').select('entry_date, produced_units, produced_sheets, target_sheets'),
        supabase.from('production_data').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('id, name'),
      ]);

      const rec = (allRec ?? []) as Pick<ProductionData, 'entry_date' | 'produced_units' | 'produced_sheets' | 'target_sheets'>[];
      const todayRec = rec.filter(r => r.entry_date === today);
      const monthRec = rec.filter(r => r.entry_date >= monthStart);

      setStats({
        products: pCount ?? 0,
        employees: eCount ?? 0,
        totalRecords: rec.length,
        todayRecords: todayRec.length,
        monthRecords: monthRec.length,
        totalUnits: rec.reduce((s, r) => s + (r.produced_units || 0), 0),
        todayUnits: todayRec.reduce((s, r) => s + (r.produced_units || 0), 0),
        monthUnits: monthRec.reduce((s, r) => s + (r.produced_units || 0), 0),
        totalSheets: rec.reduce((s, r) => s + (r.produced_sheets || 0), 0),
        targetSheets: rec.reduce((s, r) => s + (r.target_sheets || 0), 0),
      });
      setRecentRecords((recentRaw ?? []) as ProductionData[]);
      setProducts((prodList ?? []) as Product[]);
      setLoading(false);
    }
    load();
  }, []);

  const efficiency = stats.targetSheets > 0
    ? Math.round((stats.totalSheets / stats.targetSheets) * 100)
    : 0;

  function productName(id: string | null) {
    return products.find(p => p.id === id)?.name ?? '—';
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}Biotrol Professional Production System
        </p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Today's Entries" value={stats.todayRecords} loading={loading}
          icon={<Calendar size={20} className="text-blue-600" />} accent="bg-blue-50"
          sub="production records today" />
        <KpiCard label="Today's Units" value={stats.todayUnits.toLocaleString()} loading={loading}
          icon={<Layers size={20} className="text-emerald-600" />} accent="bg-emerald-50"
          sub="units produced today" />
        <KpiCard label="This Month" value={stats.monthRecords} loading={loading}
          icon={<ClipboardList size={20} className="text-sky-600" />} accent="bg-sky-50"
          sub="entries this month" />
        <KpiCard label="Monthly Units" value={stats.monthUnits.toLocaleString()} loading={loading}
          icon={<TrendingUp size={20} className="text-violet-600" />} accent="bg-violet-50"
          sub="units this month" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Records" value={stats.totalRecords.toLocaleString()} loading={loading}
          icon={<ClipboardList size={20} className="text-amber-600" />} accent="bg-amber-50" />
        <KpiCard label="Total Units Produced" value={stats.totalUnits.toLocaleString()} loading={loading}
          icon={<Package size={20} className="text-orange-600" />} accent="bg-orange-50" />
        <KpiCard label="Sheet Efficiency" value={`${efficiency}%`} loading={loading}
          icon={<Target size={20} className="text-teal-600" />} accent="bg-teal-50"
          sub="sheets produced vs target" />
        <KpiCard label="Active Employees" value={stats.employees} loading={loading}
          icon={<Users size={20} className="text-rose-600" />} accent="bg-rose-50" />
      </div>

      {/* Bottom row: recent records + quick nav */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Recent production records */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent Production Records</h2>
            {onNavigate && (
              <button
                onClick={() => onNavigate('production-data')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={12} />
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sheets</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-xs text-gray-400">Loading...</td></tr>
                ) : recentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10">
                      <p className="text-sm text-gray-400">No production records yet.</p>
                      {onNavigate && (
                        <button onClick={() => onNavigate('production-data')}
                          className="mt-2 text-xs text-blue-600 hover:underline">
                          Add your first entry
                        </button>
                      )}
                    </td>
                  </tr>
                ) : recentRecords.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                    <td className="px-4 py-2.5">
                      <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                        {productName(r.product_id)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.batch_number}</td>
                    <td className="px-4 py-2.5 text-gray-700 text-xs text-right tabular-nums">{r.produced_units.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-gray-700 text-xs text-right tabular-nums">{r.produced_sheets.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      {r.produced_sheets >= r.target_sheets ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={9} /> MET
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          BELOW
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 px-1">Quick Navigation</h2>
          <QuickNav
            icon={<ClipboardList size={18} className="text-blue-600" />}
            title="Production Data"
            desc="Add or view production records"
            accent="bg-blue-50"
            onClick={() => onNavigate?.('production-data')}
          />
          <QuickNav
            icon={<TrendingUp size={18} className="text-emerald-600" />}
            title="Production Analysis"
            desc="Charts and performance KPIs"
            accent="bg-emerald-50"
            onClick={() => onNavigate?.('production-analysis')}
          />
          <QuickNav
            icon={<Package size={18} className="text-amber-600" />}
            title="Products"
            desc="Manage product catalogue"
            accent="bg-amber-50"
            onClick={() => onNavigate?.('products')}
          />
          <QuickNav
            icon={<Users size={18} className="text-violet-600" />}
            title="Employees"
            desc="Manage staff and incharge roles"
            accent="bg-violet-50"
            onClick={() => onNavigate?.('employees')}
          />
        </div>
      </div>
    </div>
  );
}
