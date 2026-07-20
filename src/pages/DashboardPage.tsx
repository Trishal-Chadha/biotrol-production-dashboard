import { useEffect, useMemo, useState } from 'react';
import {
  Package, ClipboardList, Users, TrendingUp, ArrowRight, ArrowUpRight, ArrowDownRight,
  Calendar, Layers, Target, CheckCircle2, Briefcase, UserCheck, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart as ReBar, Bar, LineChart as ReLine, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart as RePie, Pie, Cell,
} from 'recharts';
import { supabase, ProductionData, Product, Employee } from '../lib/supabase';

interface DashStats {
  products: number;
  employees: number;          // from employees table — constant unless employee added/removed
  totalRecords: number;
  todayRecords: number;
  monthRecords: number;
  totalUnits: number;
  todayUnits: number;
  monthUnits: number;
  totalSheets: number;
  targetSheets: number;
  todaySheets: number;
  yesterdaySheets: number;
  avgSheets: number;
  totalBatches: number;
  employeesWorkedToday: number;  // distinct incharges in today's records
}

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
const yesterday = yesterdayStr();

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtShort(d: string) {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
}

function fmtMonth(ym: string) {
  const d = new Date(ym + '-01');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

const PIE_COLORS = ['#2563eb', '#059669', '#f59e0b', '#dc2626', '#7c3aed', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6'];

// ── Custom tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-3 py-2">
      {label && <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800 tabular-nums">{Number(p.value ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

interface KpiProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function KpiCard({ label, value, sub, icon, accent, loading, trend, trendValue }: KpiProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`rounded-xl p-3 flex-shrink-0 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5 tabular-nums">
          {loading ? <span className="text-gray-200">—</span> : value}
        </p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-1 text-[10px] font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : trend === 'down' ? <ArrowDownRight size={12} /> : null}
            {trendValue}
          </div>
        )}
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [stats, setStats] = useState<DashStats>({
    products: 0, employees: 0, totalRecords: 0, todayRecords: 0,
    monthRecords: 0, totalUnits: 0, todayUnits: 0, monthUnits: 0,
    totalSheets: 0, targetSheets: 0, todaySheets: 0, yesterdaySheets: 0,
    avgSheets: 0, totalBatches: 0, employeesWorkedToday: 0,
  });
  const [records, setRecords] = useState<ProductionData[]>([]);
  const [recentRecords, setRecentRecords] = useState<ProductionData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Single optimized fetch: records + employees + products + recent in parallel
      const [
        { count: pCount },
        { count: eCount },
        { data: allRec },
        { data: recentRaw },
        { data: prodList },
        { data: empList },
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('production_data').select('*').order('entry_date', { ascending: true }),
        supabase.from('production_data').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('id, name'),
        supabase.from('employees').select('id, name'),
      ]);

      const rec = (allRec ?? []) as ProductionData[];
      const todayRec = rec.filter(r => r.entry_date === today);
      const yesterdayRec = rec.filter(r => r.entry_date === yesterday);
      const monthRec = rec.filter(r => r.entry_date >= monthStart);
      const uniqueDays = new Set(rec.map(r => r.entry_date)).size || 1;
      const uniqueBatches = new Set(rec.map(r => r.batch_number)).size;

      setStats({
        products: pCount ?? 0,
        employees: eCount ?? 0,                    // always from employees table
        totalRecords: rec.length,
        todayRecords: todayRec.length,
        monthRecords: monthRec.length,
        totalUnits: rec.reduce((s, r) => s + (r.produced_units || 0), 0),
        todayUnits: todayRec.reduce((s, r) => s + (r.produced_units || 0), 0),
        monthUnits: monthRec.reduce((s, r) => s + (r.produced_units || 0), 0),
        totalSheets: rec.reduce((s, r) => s + (r.produced_sheets || 0), 0),
        targetSheets: rec.reduce((s, r) => s + (r.target_sheets || 0), 0),
        todaySheets: todayRec.reduce((s, r) => s + (r.produced_sheets || 0), 0),
        yesterdaySheets: yesterdayRec.reduce((s, r) => s + (r.produced_sheets || 0), 0),
        avgSheets: Math.round(rec.reduce((s, r) => s + (r.produced_sheets || 0), 0) / uniqueDays),
        totalBatches: uniqueBatches,
        // distinct production incharges recorded today
        employeesWorkedToday: new Set(todayRec.map(r => r.production_incharge_id).filter(Boolean)).size,
      });
      setRecords(rec);
      setRecentRecords((recentRaw ?? []) as ProductionData[]);
      setProducts((prodList ?? []) as Product[]);
      setEmployees((empList ?? []) as Employee[]);
      setLoading(false);
    }
    load();
  }, []);

  // ── Derived chart data (single pass over records) ─────────────────────────

  const chartData = useMemo(() => {
    // Daily production trend (last 14 days)
    const byDate: Record<string, { produced: number; target: number }> = {};
    records.forEach(r => {
      if (!byDate[r.entry_date]) byDate[r.entry_date] = { produced: 0, target: 0 };
      byDate[r.entry_date].produced += r.produced_sheets || 0;
      byDate[r.entry_date].target += r.target_sheets || 0;
    });
    const daily = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([d, v]) => ({ date: fmtShort(d), produced: v.produced, target: v.target }));

    // Weekly production trend
    const byWeek: Record<string, number> = {};
    records.forEach(r => {
      const d = new Date(r.entry_date);
      const day = d.getDay();
      d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
      const ws = d.toISOString().slice(0, 10);
      byWeek[ws] = (byWeek[ws] || 0) + (r.produced_sheets || 0);
    });
    const weekly = Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([d, v]) => ({ week: fmtShort(d), sheets: v }));

    // Monthly production trend
    const byMonth: Record<string, number> = {};
    records.forEach(r => {
      const ym = r.entry_date.slice(0, 7);
      byMonth[ym] = (byMonth[ym] || 0) + (r.produced_sheets || 0);
    });
    const monthly = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ym, v]) => ({ month: fmtMonth(ym), sheets: v }));

    // Product-wise production
    const byProd: Record<string, number> = {};
    records.forEach(r => {
      const name = products.find(p => p.id === r.product_id)?.name ?? 'Unknown';
      byProd[name] = (byProd[name] || 0) + (r.produced_sheets || 0);
    });
    const productWise = Object.entries(byProd)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, v]) => ({ name: name.slice(0, 15), sheets: v }));

    // Employee efficiency (sheets per incharge)
    const byEmp: Record<string, { sheets: number; entries: number }> = {};
    records.forEach(r => {
      if (r.production_incharge_id) {
        const name = employees.find(e => e.id === r.production_incharge_id)?.name ?? 'Unknown';
        if (!byEmp[name]) byEmp[name] = { sheets: 0, entries: 0 };
        byEmp[name].sheets += r.produced_sheets || 0;
        byEmp[name].entries += 1;
      }
    });
    const employeeEff = Object.entries(byEmp)
      .map(([name, d]) => ({ name: name.slice(0, 15), sheets: d.sheets, entries: d.entries }))
      .sort((a, b) => b.sheets - a.sheets)
      .slice(0, 10);

    // Target vs Actual production (daily, last 14 days)
    const targetVsActual = daily;

    // Production vs Packaging comparison (daily sheets vs pouches, last 14 days)
    const byDatePkg: Record<string, { sheets: number; pouches: number }> = {};
    records.forEach(r => {
      if (!byDatePkg[r.entry_date]) byDatePkg[r.entry_date] = { sheets: 0, pouches: 0 };
      byDatePkg[r.entry_date].sheets += r.produced_sheets || 0;
      byDatePkg[r.entry_date].pouches +=
        (r.pkg_pouches || 0) + (r.pkg_pouches_2 || 0) + (r.pkg_pouches_3 || 0);
    });
    const prodVsPkg = Object.entries(byDatePkg)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([d, v]) => ({ date: fmtShort(d), sheets: v.sheets, pouches: v.pouches }));

    return { daily, weekly, monthly, productWise, employeeEff, targetVsActual, prodVsPkg };
  }, [records, products, employees]);

  const efficiency = stats.targetSheets > 0
    ? Math.round((stats.totalSheets / stats.targetSheets) * 100)
    : 0;

  const sheetsDiff = stats.yesterdaySheets > 0
    ? ((stats.todaySheets - stats.yesterdaySheets) / stats.yesterdaySheets * 100).toFixed(1)
    : '0';
  const diffTrend: 'up' | 'down' | 'neutral' =
    stats.todaySheets > stats.yesterdaySheets ? 'up' :
    stats.todaySheets < stats.yesterdaySheets ? 'down' : 'neutral';

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

      {/* KPI Row 1 — overview */}
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

      {/* KPI Row 2 — employee + sheet comparison */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Employees" value={stats.employees} loading={loading}
          icon={<Users size={20} className="text-rose-600" />} accent="bg-rose-50"
          sub="from employee database" />
        <KpiCard label="Employees Worked Today" value={stats.employeesWorkedToday} loading={loading}
          icon={<UserCheck size={20} className="text-green-600" />} accent="bg-green-50"
          sub="incharges in today's records" />
        <KpiCard label="Today's Sheets" value={stats.todaySheets.toLocaleString()} loading={loading}
          icon={<Layers size={20} className="text-blue-600" />} accent="bg-blue-50"
          trend={diffTrend} trendValue={`${Math.abs(Number(sheetsDiff))}% vs yesterday`} />
        <KpiCard label="Yesterday's Sheets" value={stats.yesterdaySheets.toLocaleString()} loading={loading}
          icon={<Calendar size={20} className="text-gray-600" />} accent="bg-gray-100" />
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Difference %" value={`${sheetsDiff}%`} loading={loading}
          icon={diffTrend === 'up' ? <ArrowUpRight size={20} className="text-green-600" /> : <ArrowDownRight size={20} className="text-red-600" />}
          accent={diffTrend === 'up' ? 'bg-green-50' : 'bg-red-50'}
          sub="today vs yesterday" />
        <KpiCard label="Avg Sheets / Day" value={stats.avgSheets.toLocaleString()} loading={loading}
          icon={<Target size={20} className="text-teal-600" />} accent="bg-teal-50"
          sub="across all records" />
        <KpiCard label="Total Sheets" value={stats.totalSheets.toLocaleString()} loading={loading}
          icon={<Package size={20} className="text-orange-600" />} accent="bg-orange-50" />
        <KpiCard label="Total Batches" value={stats.totalBatches} loading={loading}
          icon={<Briefcase size={20} className="text-amber-600" />} accent="bg-amber-50" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Daily Production Trend">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDailyProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="produced" stroke="#2563eb" fill="url(#gDailyProd)" name="Sheets Produced" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} animationDuration={800} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Weekly Production Trend">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ReLine data={chartData.weekly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="sheets" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 3, fill: '#0891b2', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} name="Sheets" animationDuration={800} />
              </ReLine>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Monthly Production Trend">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ReBar data={chartData.monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(5, 150, 105, 0.06)' }} />
                <Bar dataKey="sheets" fill="url(#gMonthly)" radius={[6, 6, 0, 0]} name="Sheets" animationDuration={800} />
              </ReBar>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Product-wise Production">
          <div className="h-56">
            {chartData.productWise.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie
                    data={chartData.productWise}
                    cx="50%" cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="sheets"
                    nameKey="name"
                    label={({ name, percent }: { name: string; percent?: number }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                    animationDuration={800}
                  >
                    {chartData.productWise.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </RePie>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-16">No data available</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Employee Efficiency">
          <div className="h-56">
            {chartData.employeeEff.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReBar data={chartData.employeeEff} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gEmpEff" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(5, 150, 105, 0.06)' }} />
                  <Bar dataKey="sheets" fill="url(#gEmpEff)" radius={[0, 6, 6, 0]} name="Sheets" animationDuration={800} />
                </ReBar>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-16">No data available</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Target vs Actual Production">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ReBar data={chartData.targetVsActual} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="produced" fill="#2563eb" radius={[4, 4, 0, 0]} name="Actual" animationDuration={800} />
                <Bar dataKey="target" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Target" animationDuration={800} />
              </ReBar>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Production vs Packaging Comparison">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ReBar data={chartData.prodVsPkg} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="sheets" fill="#2563eb" radius={[4, 4, 0, 0]} name="Production (Sheets)" animationDuration={800} />
                <Bar dataKey="pouches" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Packaging (Tests)" animationDuration={800} />
              </ReBar>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Sheet Efficiency Overview">
          <div className="h-56 flex flex-col items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <RePie>
                  <Pie
                    data={[
                      { name: 'Produced', value: stats.totalSheets },
                      { name: 'Remaining', value: Math.max(0, stats.targetSheets - stats.totalSheets) },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={85}
                    dataKey="value"
                    startAngle={90} endAngle={-270}
                    paddingAngle={2}
                    animationDuration={800}
                  >
                    <Cell fill="#2563eb" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </RePie>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-gray-800 tabular-nums">{efficiency}%</p>
                <p className="text-[10px] text-gray-400">efficiency</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-[10px] text-gray-500">Produced</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                <span className="text-[10px] text-gray-500">Remaining</span>
              </div>
            </div>
          </div>
        </ChartCard>
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
            icon={<Activity size={18} className="text-sky-600" />}
            title="Comparison"
            desc="Period-over-period comparison"
            accent="bg-sky-50"
            onClick={() => onNavigate?.('production-comparison')}
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
