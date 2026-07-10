import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, Users, Layers, BarChart2, Activity } from 'lucide-react';
import { supabase, SheetEntry } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

// ─── date helpers ────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function formatDateShort(d: string) {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
}

function formatMonth(d: string) {
  const date = new Date(d + '-01');
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

// ─── filter type ─────────────────────────────────────────────────────────────

type DateFilter = 'today' | 'week' | 'month' | 'custom';

// ─── SVG bar chart ────────────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

function BarChart({ data, color = '#2563eb', height = 140 }: BarChartProps) {
  if (!data.length) return <p className="text-xs text-gray-400 text-center py-6">No data</p>;

  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(8, Math.min(40, Math.floor(560 / data.length) - 6));
  const gap = Math.max(4, Math.floor(560 / data.length) - barW);
  const totalW = data.length * (barW + gap) - gap;
  const svgH = height + 28;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(totalW, 300)} ${svgH}`}
        className="w-full"
        style={{ minWidth: Math.min(totalW, 300) }}
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const barH = (d.value / max) * height;
          const x = i * (barW + gap);
          const y = height - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill={color}
                fillOpacity={0.85}
                className="transition-all duration-300"
              />
              <text
                x={x + barW / 2}
                y={svgH - 2}
                textAnchor="middle"
                fontSize={9}
                fill="#9ca3af"
              >
                {d.label}
              </text>
              {d.value > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 3}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#6b7280"
                  fontWeight="600"
                >
                  {d.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── SVG line chart ───────────────────────────────────────────────────────────

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

function LineChart({ data, color = '#059669', height = 140 }: LineChartProps) {
  if (data.length < 2) return <p className="text-xs text-gray-400 text-center py-6">Not enough data</p>;

  const max = Math.max(...data.map(d => d.value), 1);
  const w = 560;
  const svgH = height + 28;
  const stepX = w / (data.length - 1);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: height - (d.value / max) * height,
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath =
    `M ${points[0].x},${height} ` +
    points.map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x},${height} Z`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${svgH}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <text x={p.x} y={svgH - 2} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {data[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bg: string;
  iconColor: string;
  sub?: string;
}

function KpiCard({ label, value, icon, bg, iconColor, sub }: KpiCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start gap-3">
      <div className={`${bg} rounded-lg p-2.5 flex-shrink-0`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function SheetReportPage() {
  const [entries, setEntries] = useState<SheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    supabase
      .from('sheet_entries')
      .select('*')
      .order('entry_date', { ascending: true })
      .then(({ data }) => {
        if (data) setEntries(data as SheetEntry[]);
        setLoading(false);
      });
  }, []);

  // ── filtered slice for KPIs / charts ──────────────────────────────────────

  const filtered = useMemo(() => {
    const now = new Date();
    const t = todayStr();
    const ws = startOfWeek(now);
    const ms = startOfMonth(now);

    return entries.filter(e => {
      if (filter === 'today') return e.entry_date === t;
      if (filter === 'week') return e.entry_date >= ws;
      if (filter === 'month') return e.entry_date >= ms;
      if (filter === 'custom') {
        if (customFrom && e.entry_date < customFrom) return false;
        if (customTo && e.entry_date > customTo) return false;
        return true;
      }
      return true;
    });
  }, [entries, filter, customFrom, customTo]);

  // ── KPI calculations ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const now = new Date();
    const t = todayStr();
    const ws = startOfWeek(now);
    const ms = startOfMonth(now);

    const todayEntries = entries.filter(e => e.entry_date === t);
    const weekEntries = entries.filter(e => e.entry_date >= ws);
    const monthEntries = entries.filter(e => e.entry_date >= ms);

    const sum = (arr: SheetEntry[], key: keyof SheetEntry) =>
      arr.reduce((acc, e) => acc + (Number(e[key]) || 0), 0);

    const avg = (arr: SheetEntry[], key: keyof SheetEntry) =>
      arr.length ? sum(arr, key) / arr.length : 0;

    // group by date for highest/lowest
    const byDate: Record<string, number> = {};
    entries.forEach(e => {
      if (e.num_sheets) byDate[e.entry_date] = (byDate[e.entry_date] || 0) + e.num_sheets;
    });
    const dateTotals = Object.entries(byDate).sort((a, b) => b[1] - a[1]);
    const highest = dateTotals[0];
    const lowest = dateTotals[dateTotals.length - 1];

    const weekDays = new Set(weekEntries.map(e => e.entry_date)).size || 1;
    const monthDays = new Set(monthEntries.map(e => e.entry_date)).size || 1;

    return {
      todaySheets: sum(todayEntries, 'num_sheets'),
      todayEmployees: sum(todayEntries, 'total_employees'),
      totalEmployeesFiltered: sum(filtered, 'total_employees'),
      sheetsPerEmployee:
        filtered.length
          ? (sum(filtered, 'num_sheets') / Math.max(sum(filtered, 'total_employees'), 1)).toFixed(2)
          : '0',
      weeklyAvg: (sum(weekEntries, 'num_sheets') / weekDays).toFixed(1),
      monthlyAvg: (sum(monthEntries, 'num_sheets') / monthDays).toFixed(1),
      highestDay: highest ? `${formatDateShort(highest[0])} (${highest[1]})` : '—',
      lowestDay: lowest ? `${formatDateShort(lowest[0])} (${lowest[1]})` : '—',
    };
  }, [entries, filtered]);

  // ── chart data ────────────────────────────────────────────────────────────

  // Daily: sheets per day within filtered range (last 14 max)
  const dailyData = useMemo(() => {
    const byDate: Record<string, number> = {};
    filtered.forEach(e => {
      if (e.num_sheets) byDate[e.entry_date] = (byDate[e.entry_date] || 0) + e.num_sheets;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([d, v]) => ({ label: formatDateShort(d), value: v }));
  }, [filtered]);

  // Weekly: sum sheets per ISO week
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: Record<string, { label: string; value: number }> = {};
    entries.forEach(e => {
      const d = new Date(e.entry_date);
      const ws = startOfWeek(d);
      if (!weeks[ws]) weeks[ws] = { label: formatDateShort(ws), value: 0 };
      weeks[ws].value += e.num_sheets || 0;
    });
    return Object.values(weeks).slice(-8);
  }, [entries]);

  // Monthly: sum sheets per month
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    entries.forEach(e => {
      const ym = e.entry_date.slice(0, 7);
      months[ym] = (months[ym] || 0) + (e.num_sheets || 0);
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ym, v]) => ({ label: formatMonth(ym), value: v }));
  }, [entries]);

  // Employee productivity trend: sheets/employee per day
  const productivityData = useMemo(() => {
    const byDate: Record<string, { sheets: number; emp: number }> = {};
    filtered.forEach(e => {
      if (!byDate[e.entry_date]) byDate[e.entry_date] = { sheets: 0, emp: 0 };
      byDate[e.entry_date].sheets += e.num_sheets || 0;
      byDate[e.entry_date].emp += e.total_employees || 0;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([d, v]) => ({
        label: formatDateShort(d),
        value: v.emp > 0 ? Number((v.sheets / v.emp).toFixed(2)) : 0,
      }));
  }, [filtered]);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <PageHeader title="Sheet Report Analysis" subtitle="Analytics and performance insights" />
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Sheet Report Analysis" subtitle="Analytics and performance insights" />

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
        <Calendar size={14} className="text-gray-400" />
        <FilterPill label="Today" active={filter === 'today'} onClick={() => setFilter('today')} />
        <FilterPill label="This Week" active={filter === 'week'} onClick={() => setFilter('week')} />
        <FilterPill label="This Month" active={filter === 'month'} onClick={() => setFilter('month')} />
        <FilterPill label="Custom" active={filter === 'custom'} onClick={() => setFilter('custom')} />
        {filter === 'custom' && (
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
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''} in view
        </span>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Today's Sheets"
          value={kpis.todaySheets.toLocaleString()}
          icon={<Layers size={18} />}
          bg="bg-blue-50"
          iconColor="text-blue-600"
          sub="sheets recorded today"
        />
        <KpiCard
          label="Employees Present"
          value={kpis.todayEmployees}
          icon={<Users size={18} />}
          bg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub="total today"
        />
        <KpiCard
          label="Total Employees"
          value={kpis.totalEmployeesFiltered.toLocaleString()}
          icon={<Users size={18} />}
          bg="bg-sky-50"
          iconColor="text-sky-600"
          sub="in selected period"
        />
        <KpiCard
          label="Sheets / Employee"
          value={kpis.sheetsPerEmployee}
          icon={<Activity size={18} />}
          bg="bg-violet-50"
          iconColor="text-violet-600"
          sub="in selected period"
        />
        <KpiCard
          label="Weekly Average"
          value={kpis.weeklyAvg}
          icon={<BarChart2 size={18} />}
          bg="bg-amber-50"
          iconColor="text-amber-600"
          sub="sheets / day this week"
        />
        <KpiCard
          label="Monthly Average"
          value={kpis.monthlyAvg}
          icon={<BarChart2 size={18} />}
          bg="bg-orange-50"
          iconColor="text-orange-600"
          sub="sheets / day this month"
        />
        <KpiCard
          label="Highest Production Day"
          value={kpis.highestDay}
          icon={<TrendingUp size={18} />}
          bg="bg-green-50"
          iconColor="text-green-600"
        />
        <KpiCard
          label="Lowest Production Day"
          value={kpis.lowestDay}
          icon={<TrendingDown size={18} />}
          bg="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      {/* ── Charts row 1 ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Daily Production (Sheets)">
          <BarChart data={dailyData} color="#2563eb" />
        </ChartCard>
        <ChartCard title="Weekly Production (Sheets)">
          <BarChart data={weeklyData} color="#0891b2" />
        </ChartCard>
      </div>

      {/* ── Charts row 2 ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Production (Sheets)">
          <BarChart data={monthlyData} color="#059669" height={160} />
        </ChartCard>
        <ChartCard title="Employee Productivity Trend (Sheets / Employee)">
          <LineChart data={productivityData} color="#7c3aed" />
        </ChartCard>
      </div>
    </div>
  );
}
