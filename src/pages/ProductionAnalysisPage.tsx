import { useEffect, useState, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, Package2, Layers, Target, CheckCircle2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart as ReBar, Bar, LineChart as ReLine, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart as RePie, Pie, Cell,
} from 'recharts';
import { supabase, ProductionData, Product, Employee } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

// ─── date helpers ─────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const n = new Date(d);
  n.setDate(n.getDate() - day + (day === 0 ? -6 : 1));
  return n.toISOString().slice(0, 10);
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
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

// ─── helpers ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, accent, loading }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent: string; loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
      <div className={`${accent} rounded-xl p-2.5 flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
        <p className="text-xl font-bold text-gray-800 mt-0.5 tabular-nums">
          {loading ? <span className="text-gray-200">—</span> : value}
        </p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
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

type DateFilter = 'today' | 'week' | 'month' | 'custom';

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
      {label}
    </button>
  );
}

function EmptyChart() {
  return <p className="text-xs text-gray-400 text-center py-16">No data for this period.</p>;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ProductionAnalysisPage() {
  const [records, setRecords] = useState<ProductionData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('production_data').select('*').order('entry_date', { ascending: true }),
      supabase.from('products').select('*'),
      supabase.from('employees').select('*'),
    ]).then(([rec, prod, emp]) => {
      if (rec.data) setRecords(rec.data as ProductionData[]);
      if (prod.data) setProducts(prod.data as Product[]);
      if (emp.data) setEmployees(emp.data as Employee[]);
      setLoading(false);
    });
  }, []);

  // ── filtered slice ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const t = todayStr();
    const ws = startOfWeek();
    const ms = startOfMonth();
    return records.filter(r => {
      if (filter === 'today') return r.entry_date === t;
      if (filter === 'week') return r.entry_date >= ws;
      if (filter === 'month') return r.entry_date >= ms;
      if (filter === 'custom') {
        if (customFrom && r.entry_date < customFrom) return false;
        if (customTo && r.entry_date > customTo) return false;
      }
      return true;
    });
  }, [records, filter, customFrom, customTo]);

  // ── KPIs ──────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const t = todayStr();
    const ws = startOfWeek();
    const ms = startOfMonth();
    const todayRec = records.filter(r => r.entry_date === t);
    const weekRec = records.filter(r => r.entry_date >= ws);
    const monthRec = records.filter(r => r.entry_date >= ms);

    const sum = (arr: ProductionData[], k: keyof ProductionData) =>
      arr.reduce((s, r) => s + (Number(r[k]) || 0), 0);

    const byDate: Record<string, number> = {};
    records.forEach(r => { byDate[r.entry_date] = (byDate[r.entry_date] || 0) + (r.produced_sheets || 0); });
    const entries = Object.entries(byDate).sort((a, b) => b[1] - a[1]);

    const weekDays = new Set(weekRec.map(r => r.entry_date)).size || 1;
    const monthDays = new Set(monthRec.map(r => r.entry_date)).size || 1;

    const totalSheets = sum(filtered, 'produced_sheets');
    const totalTarget = sum(filtered, 'target_sheets');
    const efficiency = totalTarget > 0 ? Math.round((totalSheets / totalTarget) * 100) : 0;

    return {
      todayUnits: sum(todayRec, 'produced_units'),
      todaySheets: sum(todayRec, 'produced_sheets'),
      totalUnits: sum(filtered, 'produced_units'),
      totalSheets,
      totalTarget,
      efficiency,
      weeklyAvg: (sum(weekRec, 'produced_sheets') / weekDays).toFixed(0),
      monthlyAvg: (sum(monthRec, 'produced_sheets') / monthDays).toFixed(0),
      bestDay: entries[0] ? `${fmtShort(entries[0][0])} (${entries[0][1].toLocaleString()})` : '—',
      worstDay: entries.length > 1 ? `${fmtShort(entries[entries.length - 1][0])} (${entries[entries.length - 1][1].toLocaleString()})` : '—',
    };
  }, [records, filtered]);

  // ── chart data ────────────────────────────────────────────────────────

  const dailyData = useMemo(() => {
    const byDate: Record<string, { produced: number; target: number }> = {};
    filtered.forEach(r => {
      if (!byDate[r.entry_date]) byDate[r.entry_date] = { produced: 0, target: 0 };
      byDate[r.entry_date].produced += r.produced_sheets || 0;
      byDate[r.entry_date].target += r.target_sheets || 0;
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
      .map(([d, v]) => ({ date: fmtShort(d), produced: v.produced, target: v.target }));
  }, [filtered]);

  const weeklyData = useMemo(() => {
    const byWeek: Record<string, number> = {};
    records.forEach(r => {
      const d = new Date(r.entry_date);
      const ws = startOfWeek(d);
      byWeek[ws] = (byWeek[ws] || 0) + (r.produced_sheets || 0);
    });
    return Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).slice(-10)
      .map(([d, v]) => ({ week: fmtShort(d), sheets: v }));
  }, [records]);

  const monthlyData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    records.forEach(r => {
      const ym = r.entry_date.slice(0, 7);
      byMonth[ym] = (byMonth[ym] || 0) + (r.produced_sheets || 0);
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([ym, v]) => ({ month: fmtMonth(ym), sheets: v }));
  }, [records]);

  const productWiseData = useMemo(() => {
    const byProd: Record<string, number> = {};
    filtered.forEach(r => {
      const name = products.find(p => p.id === r.product_id)?.name ?? 'Unknown';
      byProd[name] = (byProd[name] || 0) + (r.produced_sheets || 0);
    });
    return Object.entries(byProd)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, v]) => ({ name: name.slice(0, 15), sheets: v }));
  }, [filtered, products]);

  const employeeEffData = useMemo(() => {
    const byEmp: Record<string, { sheets: number; entries: number }> = {};
    filtered.forEach(r => {
      if (r.production_incharge_id) {
        const name = employees.find(e => e.id === r.production_incharge_id)?.name ?? 'Unknown';
        if (!byEmp[name]) byEmp[name] = { sheets: 0, entries: 0 };
        byEmp[name].sheets += r.produced_sheets || 0;
        byEmp[name].entries += 1;
      }
    });
    return Object.entries(byEmp)
      .map(([name, d]) => ({ name: name.slice(0, 15), sheets: d.sheets, entries: d.entries }))
      .sort((a, b) => b.sheets - a.sheets)
      .slice(0, 10);
  }, [filtered, employees]);

  const prodVsPkgData = useMemo(() => {
    const byDate: Record<string, { sheets: number; pouches: number }> = {};
    filtered.forEach(r => {
      if (!byDate[r.entry_date]) byDate[r.entry_date] = { sheets: 0, pouches: 0 };
      byDate[r.entry_date].sheets += r.produced_sheets || 0;
      byDate[r.entry_date].pouches +=
        (r.pkg_pouches || 0) + (r.pkg_pouches_2 || 0) + (r.pkg_pouches_3 || 0);
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
      .map(([d, v]) => ({ date: fmtShort(d), sheets: v.sheets, pouches: v.pouches }));
  }, [filtered]);

  // ─────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader title="Production Analysis" subtitle="Performance insights and production trends." />

      {/* Filter bar */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
        <Calendar size={14} className="text-gray-400" />
        <Pill label="Today" active={filter === 'today'} onClick={() => setFilter('today')} />
        <Pill label="This Week" active={filter === 'week'} onClick={() => setFilter('week')} />
        <Pill label="This Month" active={filter === 'month'} onClick={() => setFilter('month')} />
        <Pill label="Custom" active={filter === 'custom'} onClick={() => setFilter('custom')} />
        {filter === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Today's Units" value={kpis.todayUnits.toLocaleString()} loading={loading}
          icon={<Package2 size={18} />} accent="bg-blue-50 text-blue-600" sub="units produced today" />
        <KpiCard label="Today's Sheets" value={kpis.todaySheets.toLocaleString()} loading={loading}
          icon={<Layers size={18} />} accent="bg-emerald-50 text-emerald-600" sub="sheets produced today" />
        <KpiCard label="Total Sheets (Period)" value={kpis.totalSheets.toLocaleString()} loading={loading}
          icon={<Package2 size={18} />} accent="bg-sky-50 text-sky-600" />
        <KpiCard label="Sheet Efficiency" value={`${kpis.efficiency}%`} loading={loading}
          icon={<Target size={18} />} accent="bg-violet-50 text-violet-600" sub="produced vs target" />
        <KpiCard label="Weekly Avg (Sheets/Day)" value={kpis.weeklyAvg} loading={loading}
          icon={<TrendingUp size={18} />} accent="bg-amber-50 text-amber-600" />
        <KpiCard label="Monthly Avg (Sheets/Day)" value={kpis.monthlyAvg} loading={loading}
          icon={<CheckCircle2 size={18} />} accent="bg-orange-50 text-orange-600" />
        <KpiCard label="Best Production Day" value={kpis.bestDay} loading={loading}
          icon={<TrendingUp size={18} />} accent="bg-green-50 text-green-600" />
        <KpiCard label="Lowest Production Day" value={kpis.worstDay} loading={loading}
          icon={<TrendingDown size={18} />} accent="bg-red-50 text-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Daily Production Trend">
          <div className="h-64">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="produced" stroke="#2563eb" fill="url(#gDaily)" name="Sheets Produced" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="Weekly Production Trend">
          <div className="h-64">
            {weeklyData.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReLine data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="sheets" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 3, fill: '#0891b2', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} name="Sheets" animationDuration={800} />
                </ReLine>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="Monthly Production Trend">
          <div className="h-64">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReBar data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="Product-wise Production">
          <div className="h-64">
            {productWiseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie
                    data={productWiseData}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="sheets"
                    nameKey="name"
                    label={({ name, percent }: { name: string; percent?: number }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                    animationDuration={800}
                  >
                    {productWiseData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </RePie>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="Employee Efficiency">
          <div className="h-64">
            {employeeEffData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReBar data={employeeEffData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="Target vs Actual Production">
          <div className="h-64">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReBar data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="produced" fill="#2563eb" radius={[4, 4, 0, 0]} name="Actual" animationDuration={800} />
                  <Bar dataKey="target" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Target" animationDuration={800} />
                </ReBar>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="Production vs Packaging Comparison">
          <div className="h-64">
            {prodVsPkgData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReBar data={prodVsPkgData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="sheets" fill="#2563eb" radius={[4, 4, 0, 0]} name="Production (Sheets)" animationDuration={800} />
                  <Bar dataKey="pouches" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Packaging (Tests)" animationDuration={800} />
                </ReBar>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
