import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, Package2, Layers, Users, Target, CheckCircle2 } from 'lucide-react';
import { supabase, ProductionData, Product } from '../lib/supabase';
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

// ─── SVG bar chart ─────────────────────────────────────────────────────────────

function BarChart({ data, color = '#2563eb', height = 130 }: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  if (!data.length) return <p className="text-xs text-gray-400 text-center py-8">No data for this period.</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(10, Math.min(44, Math.floor(540 / data.length) - 6));
  const gap = Math.max(4, Math.floor(540 / data.length) - barW);
  const totalW = data.length * (barW + gap) - gap;
  const svgH = height + 30;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${Math.max(totalW, 280)} ${svgH}`} className="w-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const bh = Math.max(2, (d.value / max) * height);
          const x = i * (barW + gap);
          const y = height - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bh} rx={3} fill={color} fillOpacity={0.8} />
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={8} fill="#6b7280" fontWeight="600">
                  {d.value.toLocaleString()}
                </text>
              )}
              <text x={x + barW / 2} y={svgH - 2} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── SVG multi-bar chart ──────────────────────────────────────────────────────

function MultiBarChart({ data, height = 130 }: {
  data: { label: string; produced: number; target: number }[];
  height?: number;
}) {
  if (!data.length) return <p className="text-xs text-gray-400 text-center py-8">No data for this period.</p>;
  const max = Math.max(...data.flatMap(d => [d.produced, d.target]), 1);
  const slotW = Math.max(24, Math.min(80, Math.floor(540 / data.length)));
  const barW = Math.floor(slotW * 0.38);
  const totalW = data.length * slotW;
  const svgH = height + 30;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${Math.max(totalW, 280)} ${svgH}`} className="w-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const slot = i * slotW;
          const phProd = Math.max(2, (d.produced / max) * height);
          const phTarget = Math.max(2, (d.target / max) * height);
          return (
            <g key={i}>
              <rect x={slot + 2} y={height - phProd} width={barW} height={phProd} rx={2} fill="#2563eb" fillOpacity={0.85} />
              <rect x={slot + barW + 4} y={height - phTarget} width={barW} height={phTarget} rx={2} fill="#d1d5db" />
              <text x={slot + slotW / 2} y={svgH - 2} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.label}</text>
            </g>
          );
        })}
        {/* legend */}
        <g transform={`translate(0, ${svgH - 12})`}>
          <rect x={0} y={-3} width={8} height={8} rx={1} fill="#2563eb" fillOpacity={0.85} />
          <text x={11} y={5} fontSize={8} fill="#6b7280">Produced</text>
          <rect x={68} y={-3} width={8} height={8} rx={1} fill="#d1d5db" />
          <text x={79} y={5} fontSize={8} fill="#6b7280">Target</text>
        </g>
      </svg>
    </div>
  );
}

// ─── line chart ──────────────────────────────────────────────────────────────

function LineChart({ data, color = '#059669', height = 130 }: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return <p className="text-xs text-gray-400 text-center py-8">Not enough data.</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 540;
  const svgH = height + 30;
  const stepX = W / (data.length - 1);
  const pts = data.map((d, i) => ({ x: i * stepX, y: height - (d.value / max) * height }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M ${pts[0].x},${height} ` + pts.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${pts[pts.length - 1].x},${height} Z`;
  const gid = `g${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${svgH}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="white" stroke={color} strokeWidth={1.5} />
            <text x={p.x} y={svgH - 2} textAnchor="middle" fontSize={9} fill="#9ca3af">{data[i].label}</text>
          </g>
        ))}
      </svg>
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

// ─── component ───────────────────────────────────────────────────────────────

export default function ProductionAnalysisPage() {
  const [records, setRecords] = useState<ProductionData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('production_data').select('*').order('entry_date', { ascending: true }),
      supabase.from('products').select('*'),
    ]).then(([{ data: rec }, { data: prod }]) => {
      if (rec) setRecords(rec as ProductionData[]);
      if (prod) setProducts(prod as Product[]);
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

    // best/worst days
    const byDate: Record<string, number> = {};
    records.forEach(r => { byDate[r.entry_date] = (byDate[r.entry_date] || 0) + (r.produced_units || 0); });
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
      weeklyAvg: (sum(weekRec, 'produced_units') / weekDays).toFixed(0),
      monthlyAvg: (sum(monthRec, 'produced_units') / monthDays).toFixed(0),
      bestDay: entries[0] ? `${fmtShort(entries[0][0])} (${entries[0][1].toLocaleString()})` : '—',
      worstDay: entries.length > 1 ? `${fmtShort(entries[entries.length - 1][0])} (${entries[entries.length - 1][1].toLocaleString()})` : '—',
    };
  }, [records, filtered]);

  // ── chart data ────────────────────────────────────────────────────────

  const dailyUnitsData = useMemo(() => {
    const byDate: Record<string, number> = {};
    filtered.forEach(r => { byDate[r.entry_date] = (byDate[r.entry_date] || 0) + (r.produced_units || 0); });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
      .map(([d, v]) => ({ label: fmtShort(d), value: v }));
  }, [filtered]);

  const dailySheetsVsTarget = useMemo(() => {
    const byDate: Record<string, { produced: number; target: number }> = {};
    filtered.forEach(r => {
      if (!byDate[r.entry_date]) byDate[r.entry_date] = { produced: 0, target: 0 };
      byDate[r.entry_date].produced += r.produced_sheets || 0;
      byDate[r.entry_date].target += r.target_sheets || 0;
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
      .map(([d, v]) => ({ label: fmtShort(d), ...v }));
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    records.forEach(r => { const ym = r.entry_date.slice(0, 7); byMonth[ym] = (byMonth[ym] || 0) + (r.produced_units || 0); });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([ym, v]) => ({ label: fmtMonth(ym), value: v }));
  }, [records]);

  const weeklyData = useMemo(() => {
    const byWeek: Record<string, number> = {};
    records.forEach(r => {
      const d = new Date(r.entry_date);
      const ws = startOfWeek(d);
      byWeek[ws] = (byWeek[ws] || 0) + (r.produced_units || 0);
    });
    return Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).slice(-10)
      .map(([d, v]) => ({ label: fmtShort(d), value: v }));
  }, [records]);

  // product breakdown
  const productBreakdown = useMemo(() => {
    const byProd: Record<string, number> = {};
    filtered.forEach(r => {
      const k = r.product_id ?? '__none__';
      byProd[k] = (byProd[k] || 0) + (r.produced_units || 0);
    });
    return Object.entries(byProd)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([pid, v]) => ({
        label: products.find(p => p.id === pid)?.name?.slice(0, 10) ?? 'Unknown',
        value: v,
      }));
  }, [filtered, products]);

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
        <KpiCard label="Total Units (Period)" value={kpis.totalUnits.toLocaleString()} loading={loading}
          icon={<Package2 size={18} />} accent="bg-sky-50 text-sky-600" />
        <KpiCard label="Sheet Efficiency" value={`${kpis.efficiency}%`} loading={loading}
          icon={<Target size={18} />} accent="bg-violet-50 text-violet-600" sub="produced vs target" />
        <KpiCard label="Weekly Avg (Units/Day)" value={kpis.weeklyAvg} loading={loading}
          icon={<TrendingUp size={18} />} accent="bg-amber-50 text-amber-600" />
        <KpiCard label="Monthly Avg (Units/Day)" value={kpis.monthlyAvg} loading={loading}
          icon={<CheckCircle2 size={18} />} accent="bg-orange-50 text-orange-600" />
        <KpiCard label="Best Production Day" value={kpis.bestDay} loading={loading}
          icon={<TrendingUp size={18} />} accent="bg-green-50 text-green-600" />
        <KpiCard label="Lowest Production Day" value={kpis.worstDay} loading={loading}
          icon={<TrendingDown size={18} />} accent="bg-red-50 text-red-500" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Daily Units Produced">
          <BarChart data={dailyUnitsData} color="#2563eb" />
        </ChartCard>
        <ChartCard title="Sheets Produced vs. Target (Daily)">
          <MultiBarChart data={dailySheetsVsTarget} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Weekly Production Trend">
          <LineChart data={weeklyData} color="#0891b2" />
        </ChartCard>
        <ChartCard title="Monthly Production (Units)">
          <BarChart data={monthlyData} color="#059669" height={150} />
        </ChartCard>
      </div>

      {/* Product breakdown */}
      {productBreakdown.length > 0 && (
        <div className="mt-4">
          <ChartCard title="Units by Product (Period)">
            <BarChart data={productBreakdown} color="#7c3aed" height={120} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
