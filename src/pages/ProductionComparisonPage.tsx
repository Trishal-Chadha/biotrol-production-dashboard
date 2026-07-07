import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar, TrendingUp, TrendingDown, Package2, Layers, Users, Target,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Download, FileText, FileSpreadsheet,
  Printer, Filter, BarChart3, PieChart, LineChart, Award, Briefcase, Clock,
  ChevronDown, ChevronUp, RefreshCw, X, Info
} from 'lucide-react';
import {
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Legend,
  AreaChart, Area, ComposedChart
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { supabase, ProductionData, Product, Employee } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

// ─── Date Helpers ─────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const n = new Date(d);
  n.setDate(n.getDate() - day + (day === 0 ? -6 : 1));
  return n.toISOString().slice(0, 10);
}

function endOfWeek(d = new Date()) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end.toISOString().slice(0, 10);
}

function startOfLastWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return startOfWeek(d);
}

function endOfLastWeek() {
  const start = startOfLastWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end.toISOString().slice(0, 10);
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function startOfLastMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfLastMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function startOfYear() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}

function startOfLastYear() {
  return new Date(new Date().getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
}

function endOfLastYear() {
  return new Date(new Date().getFullYear() - 1, 11, 31).toISOString().slice(0, 10);
}

function last7Days() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function last30Days() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function fmtShort(d: string) {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
}

function fmtMonth(ym: string) {
  const d = new Date(ym + '-01');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const COLORS = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];
const COLORS_EXTENDED = [...COLORS, '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#64748b', '#0ea5e9', '#22c55e', '#eab308'];

// ─── Quick Filter Options ─────────────────────────────────────────────────────

type QuickFilter = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

interface QuickFilterOption {
  id: QuickFilter;
  label: string;
  from: () => string;
  to: () => string;
}

const quickFilters: QuickFilterOption[] = [
  { id: 'today', label: 'Today', from: todayStr, to: todayStr },
  { id: 'yesterday', label: 'Yesterday', from: yesterdayStr, to: yesterdayStr },
  { id: 'last7', label: 'Last 7 Days', from: last7Days, to: todayStr },
  { id: 'last30', label: 'Last 30 Days', from: last30Days, to: todayStr },
  { id: 'thisMonth', label: 'This Month', from: startOfMonth, to: endOfMonth },
  { id: 'lastMonth', label: 'Last Month', from: startOfLastMonth, to: endOfLastMonth },
  { id: 'thisYear', label: 'This Year', from: startOfYear, to: todayStr },
  { id: 'custom', label: 'Custom', from: () => '', to: () => '' },
];

// ─── Comparison Mode Options ─────────────────────────────────────────────────

type ComparisonMode = 'todayVsYesterday' | 'weekVsLastWeek' | 'monthVsLastMonth' | 'yearVsLastYear' | 'customRange';

interface ComparisonRange {
  labelA: string;
  labelB: string;
  fromA: string;
  toA: string;
  fromB: string;
  toB: string;
}

// ─── KPI Card Component ───────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, accent, loading, trend, trendValue, onClick
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`${accent} rounded-xl p-2.5 flex-shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
        <p className="text-xl font-bold text-gray-800 mt-0.5 tabular-nums">
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

// ─── Chart Card Component ─────────────────────────────────────────────────────

function ChartCard({
  title, children, actions, className = ''
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Pill Component ───────────────────────────────────────────────────────────

function Pill({
  label, active, onClick, size = 'default'
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  size?: 'default' | 'small';
}) {
  return (
    <button
      onClick={onClick}
      className={`${size === 'small' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} rounded-lg font-semibold transition-colors ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductionComparisonPage() {
  // Data state
  const [records, setRecords] = useState<ProductionData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');

  // Comparison state
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('monthVsLastMonth');
  const [customRangeA, setCustomRangeA] = useState({ from: '', to: '' });
  const [customRangeB, setCustomRangeB] = useState({ from: '', to: '' });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [activeChartView, setActiveChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const contentRef = useRef<HTMLDivElement>(null);

  // ── Data Fetch ───────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [recRes, prodRes, empRes] = await Promise.all([
        supabase.from('production_data').select('*').order('entry_date', { ascending: true }),
        supabase.from('products').select('*'),
        supabase.from('employees').select('*'),
      ]);
      if (recRes.data) setRecords(recRes.data as ProductionData[]);
      if (prodRes.data) setProducts(prodRes.data as Product[]);
      if (empRes.data) setEmployees(empRes.data as Employee[]);
      setLoading(false);
    }
    fetchAll();
  }, []);

  // ── Derived Data ─────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  const batches = useMemo(() => {
    const batchSet = new Set(records.map(r => r.batch_number).filter(Boolean));
    return Array.from(batchSet).sort() as string[];
  }, [records]);

  // ── Date Range Calculation ───────────────────────────────────────────────────

  const dateRange = useMemo(() => {
    if (quickFilter === 'custom') {
      return { from: customFrom, to: customTo };
    }
    const opt = quickFilters.find(f => f.id === quickFilter);
    return opt ? { from: opt.from(), to: opt.to() } : { from: '', to: '' };
  }, [quickFilter, customFrom, customTo]);

  // ── Filtered Records ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (dateRange.from && r.entry_date < dateRange.from) return false;
      if (dateRange.to && r.entry_date > dateRange.to) return false;
      if (productFilter && r.product_id !== productFilter) return false;
      if (batchFilter && r.batch_number !== batchFilter) return false;
      if (employeeFilter && r.production_incharge_id !== employeeFilter) return false;
      if (inchargeFilter && r.production_incharge_id !== inchargeFilter) return false;
      if (categoryFilter) {
        const prod = products.find(p => p.id === r.product_id);
        if (prod?.category !== categoryFilter) return false;
      }
      return true;
    });
  }, [records, dateRange, productFilter, categoryFilter, batchFilter, employeeFilter, inchargeFilter, products]);

  // ── Comparison Ranges ────────────────────────────────────────────────────────

  const comparisonRanges = useMemo((): ComparisonRange => {
    const today = todayStr();
    const yesterday = yesterdayStr();

    switch (comparisonMode) {
      case 'todayVsYesterday':
        return {
          labelA: 'Today',
          labelB: 'Yesterday',
          fromA: today, toA: today,
          fromB: yesterday, toB: yesterday,
        };
      case 'weekVsLastWeek':
        return {
          labelA: 'This Week',
          labelB: 'Last Week',
          fromA: startOfWeek(), toA: endOfWeek(),
          fromB: startOfLastWeek(), toB: endOfLastWeek(),
        };
      case 'monthVsLastMonth':
        return {
          labelA: 'This Month',
          labelB: 'Last Month',
          fromA: startOfMonth(), toA: endOfMonth(),
          fromB: startOfLastMonth(), toB: endOfLastMonth(),
        };
      case 'yearVsLastYear':
        return {
          labelA: 'This Year',
          labelB: 'Last Year',
          fromA: startOfYear(), toA: today,
          fromB: startOfLastYear(), toB: endOfLastYear(),
        };
      case 'customRange':
        return {
          labelA: 'Period A',
          labelB: 'Period B',
          fromA: customRangeA.from, toA: customRangeA.to,
          fromB: customRangeB.from, toB: customRangeB.to,
        };
    }
  }, [comparisonMode, customRangeA, customRangeB]);

  // ── Comparison Data ──────────────────────────────────────────────────────────

  const comparisonData = useMemo(() => {
    const rangeA = records.filter(r =>
      (!comparisonRanges.fromA || r.entry_date >= comparisonRanges.fromA) &&
      (!comparisonRanges.toA || r.entry_date <= comparisonRanges.toA)
    );
    const rangeB = records.filter(r =>
      (!comparisonRanges.fromB || r.entry_date >= comparisonRanges.fromB) &&
      (!comparisonRanges.toB || r.entry_date <= comparisonRanges.toB)
    );

    const sum = (arr: ProductionData[], key: keyof ProductionData) =>
      arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    const avg = (arr: ProductionData[], key: keyof ProductionData) => {
      const vals = arr.map(r => Number(r[key]) || 0).filter(v => v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    const uniqueDays = (arr: ProductionData[]) => new Set(arr.map(r => r.entry_date)).size || 1;
    const uniqueBatches = (arr: ProductionData[]) => new Set(arr.map(r => r.batch_number)).size;

    const totalSheetsA = sum(rangeA, 'produced_sheets');
    const totalSheetsB = sum(rangeB, 'produced_sheets');
    const sheetsDiff = totalSheetsB > 0 ? ((totalSheetsA - totalSheetsB) / totalSheetsB * 100).toFixed(1) : '0';
    const sheetsTrend = totalSheetsA > totalSheetsB ? 'up' : totalSheetsA < totalSheetsB ? 'down' : 'neutral';

    const avgSheetsA = totalSheetsA / uniqueDays(rangeA);
    const avgSheetsB = totalSheetsB / uniqueDays(rangeB);

    const totalEmpA = sum(rangeA, 'production_employees');
    const totalEmpB = sum(rangeB, 'production_employees');

    return {
      rangeA,
      rangeB,
      sheetsA: totalSheetsA,
      sheetsB: totalSheetsB,
      sheetsDiff,
      sheetsTrend,
      avgSheetsA: avgSheetsA.toFixed(0),
      avgSheetsB: avgSheetsB.toFixed(0),
      unitsA: sum(rangeA, 'produced_units'),
      unitsB: sum(rangeB, 'produced_units'),
      batchesA: uniqueBatches(rangeA),
      batchesB: uniqueBatches(rangeB),
      daysA: uniqueDays(rangeA),
      daysB: uniqueDays(rangeB),
      totalEmpA,
      totalEmpB,
      avgEmpA: (totalEmpA / uniqueDays(rangeA)).toFixed(1),
      avgEmpB: (totalEmpB / uniqueDays(rangeB)).toFixed(1),
    };
  }, [records, comparisonRanges]);

  // ── KPI Calculations ──────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const today = todayStr();
    const yesterday = yesterdayStr();

    const todayRec = records.filter(r => r.entry_date === today);
    const yesterdayRec = records.filter(r => r.entry_date === yesterday);

    const sum = (arr: ProductionData[], key: keyof ProductionData) =>
      arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);

    const todaySheets = sum(todayRec, 'produced_sheets');
    const yesterdaySheets = sum(yesterdayRec, 'produced_sheets');
    const diff = yesterdaySheets > 0 ? ((todaySheets - yesterdaySheets) / yesterdaySheets * 100).toFixed(1) : '0';

    const uniqueDays = new Set(filtered.map(r => r.entry_date)).size || 1;
    const avgSheets = sum(filtered, 'produced_sheets') / uniqueDays;
    const avgEmp = sum(filtered, 'production_employees') / uniqueDays;
    const batchCount = new Set(filtered.map(r => r.batch_number)).size;

    return {
      todaySheets: todaySheets.toLocaleString(),
      yesterdaySheets: yesterdaySheets.toLocaleString(),
      diff: diff + '%',
      diffTrend: todaySheets > yesterdaySheets ? 'up' : todaySheets < yesterdaySheets ? 'down' : 'neutral',
      totalSheets: sum(filtered, 'produced_sheets').toLocaleString(),
      avgSheets: avgSheets.toFixed(0),
      totalEmp: sum(filtered, 'production_employees').toLocaleString(),
      avgEmp: avgEmp.toFixed(1),
      batchCount,
    };
  }, [records, filtered]);

  // ── Chart Data ───────────────────────────────────────────────────────────────

  const dailyTrendData = useMemo(() => {
    const byDate: Record<string, { produced: number; target: number; date: string }> = {};
    filtered.forEach(r => {
      if (!byDate[r.entry_date]) byDate[r.entry_date] = { produced: 0, target: 0, date: r.entry_date };
      byDate[r.entry_date].produced += r.produced_sheets || 0;
      byDate[r.entry_date].target += r.target_sheets || 0;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([, v]) => ({
        date: fmtShort(v.date),
        fullDate: v.date,
        produced: v.produced,
        target: v.target,
      }));
  }, [filtered]);

  const monthlyTrendData = useMemo(() => {
    const byMonth: Record<string, { produced: number; target: number; month: string }> = {};
    records.forEach(r => {
      const ym = r.entry_date.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = { produced: 0, target: 0, month: ym };
      byMonth[ym].produced += r.produced_sheets || 0;
      byMonth[ym].target += r.target_sheets || 0;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => ({
        month: fmtMonth(v.month),
        fullMonth: v.month,
        produced: v.produced,
        target: v.target,
      }));
  }, [records]);

  const productWiseData = useMemo(() => {
    const byProduct: Record<string, number> = {};
    filtered.forEach(r => {
      const prod = products.find(p => p.id === r.product_id);
      const name = prod?.name || 'Unknown';
      byProduct[name] = (byProduct[name] || 0) + (r.produced_sheets || 0);
    });
    return Object.entries(byProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.slice(0, 15), value }));
  }, [filtered, products]);

  const categoryData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    filtered.forEach(r => {
      const prod = products.find(p => p.id === r.product_id);
      const cat = prod?.category || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + (r.produced_sheets || 0);
    });
    return Object.entries(byCategory)
      .map(([name, value], idx) => ({ name, value, color: COLORS_EXTENDED[idx % COLORS_EXTENDED.length] }));
  }, [filtered, products]);

  const employeeProductivity = useMemo(() => {
    const byEmployee: Record<string, { sheets: number; entries: number }> = {};
    filtered.forEach(r => {
      if (r.production_incharge_id) {
        const emp = employees.find(e => e.id === r.production_incharge_id);
        const name = emp?.name || 'Unknown';
        if (!byEmployee[name]) byEmployee[name] = { sheets: 0, entries: 0 };
        byEmployee[name].sheets += r.produced_sheets || 0;
        byEmployee[name].entries += 1;
      }
    });
    return Object.entries(byEmployee)
      .map(([name, data]) => ({ name: name.slice(0, 18), sheets: data.sheets, entries: data.entries }))
      .sort((a, b) => b.sheets - a.sheets)
      .slice(0, 10);
  }, [filtered, employees]);

  const batchWiseData = useMemo(() => {
    const byBatch: Record<string, number> = {};
    filtered.forEach(r => {
      byBatch[r.batch_number] = (byBatch[r.batch_number] || 0) + (r.produced_sheets || 0);
    });
    return Object.entries(byBatch)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([batch, value]) => ({ batch: batch.slice(0, 12), value }));
  }, [filtered]);

  // ── Top Performers ──────────────────────────────────────────────────────────

  const topPerformers = useMemo(() => {
    // Top Products
    const productStats: Record<string, number> = {};
    filtered.forEach(r => {
      const prod = products.find(p => p.id === r.product_id);
      const name = prod?.name || 'Unknown';
      productStats[name] = (productStats[name] || 0) + (r.produced_sheets || 0);
    });
    const topProducts = Object.entries(productStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, sheets]) => ({ name, sheets }));

    // Top Employees
    const employeeStats: Record<string, number> = {};
    filtered.forEach(r => {
      if (r.production_incharge_id) {
        const emp = employees.find(e => e.id === r.production_incharge_id);
        const name = emp?.name || 'Unknown';
        employeeStats[name] = (employeeStats[name] || 0) + (r.produced_sheets || 0);
      }
    });
    const topEmployees = Object.entries(employeeStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, sheets]) => ({ name, sheets }));

    // Top Days
    const dayStats: Record<string, number> = {};
    filtered.forEach(r => {
      dayStats[r.entry_date] = (dayStats[r.entry_date] || 0) + (r.produced_sheets || 0);
    });
    const topDays = Object.entries(dayStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([date, sheets]) => ({ date: fmtDate(date), sheets }));

    return { topProducts, topEmployees, topDays };
  }, [filtered, products, employees]);

  // ── Comparison Table Data ───────────────────────────────────────────────────

  const comparisonTableData = useMemo(() => {
    return filtered
      .slice(-50)
      .map(r => {
        const prevRec = records.find(prev =>
          prev.entry_date < r.entry_date &&
          prev.product_id === r.product_id
        );
        const diff = prevRec ? r.produced_sheets - prevRec.produced_sheets : 0;
        const growth = prevRec && prevRec.produced_sheets > 0
          ? ((r.produced_sheets - prevRec.produced_sheets) / prevRec.produced_sheets * 100).toFixed(1)
          : '0';

        return {
          date: fmtDate(r.entry_date),
          product: products.find(p => p.id === r.product_id)?.name || '—',
          batch: r.batch_number,
          sheets: r.produced_sheets,
          employees: r.production_employees,
          incharge: employees.find(e => e.id === r.production_incharge_id)?.name || '—',
          diff,
          growth: growth + '%',
          trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
        };
      });
  }, [filtered, records, products, employees]);

  // ── Insights ────────────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    const result: string[] = [];

    // Production change
    if (comparisonData.sheetsTrend === 'up') {
      result.push(`Production increased by ${Math.abs(Number(comparisonData.sheetsDiff))}% compared to ${comparisonRanges.labelB}.`);
    } else if (comparisonData.sheetsTrend === 'down') {
      result.push(`Production decreased by ${Math.abs(Number(comparisonData.sheetsDiff))}% compared to ${comparisonRanges.labelB}.`);
    } else {
      result.push(`Production remained the same compared to ${comparisonRanges.labelB}.`);
    }

    // Best product
    const bestProduct = topPerformers.topProducts[0];
    if (bestProduct) {
      result.push(`Best performing product: ${bestProduct.name} (${bestProduct.sheets.toLocaleString()} sheets).`);
    }

    // Best employee
    const bestEmployee = topPerformers.topEmployees[0];
    if (bestEmployee) {
      result.push(`Top performing employee: ${bestEmployee.name} (${bestEmployee.sheets.toLocaleString()} sheets).`);
    }

    // Best day
    const bestDay = topPerformers.topDays[0];
    if (bestDay) {
      result.push(`Highest production day: ${bestDay.date} (${bestDay.sheets.toLocaleString()} sheets).`);
    }

    // Lowest day
    const worstDay = topPerformers.topDays[topPerformers.topDays.length - 1];
    if (worstDay) {
      result.push(`Lowest production day: ${worstDay.date} (${worstDay.sheets.toLocaleString()} sheets).`);
    }

    // Average
    result.push(`Average daily production: ${kpis.avgSheets} sheets.`);

    // Employee productivity
    const empTrend = comparisonData.avgEmpA > comparisonData.avgEmpB ? 'increased' : 'decreased';
    const empDiff = comparisonData.avgEmpB > 0
      ? Math.abs((Number(comparisonData.avgEmpA) - Number(comparisonData.avgEmpB)) / Number(comparisonData.avgEmpB) * 100).toFixed(1)
      : '0';
    result.push(`Employee productivity ${empTrend} by ${empDiff}%.`);

    return result;
  }, [comparisonData, topPerformers, kpis, comparisonRanges]);

  // ── Export Functions ────────────────────────────────────────────────────────

  const exportPDF = async () => {
    if (!contentRef.current) return;
    const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pdfHeight);
    pdf.save('production-comparison-analysis.pdf');
  };

  const exportExcel = () => {
    const exportData = filtered.map(r => ({
      Date: fmtDate(r.entry_date),
      Product: products.find(p => p.id === r.product_id)?.name || '—',
      Category: products.find(p => p.id === r.product_id)?.category || '—',
      'Batch Number': r.batch_number,
      'Sheets Produced': r.produced_sheets,
      'Target Sheets': r.target_sheets,
      Employees: r.production_employees,
      Incharge: employees.find(e => e.id === r.production_incharge_id)?.name || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production Data');
    XLSX.writeFile(wb, 'production-comparison-analysis.xlsx');
  };

  const exportCSV = () => {
    const csvContent = [
      ['Date', 'Product', 'Category', 'Batch Number', 'Sheets Produced', 'Target Sheets', 'Employees', 'Incharge'],
      ...filtered.map(r => [
        fmtDate(r.entry_date),
        products.find(p => p.id === r.product_id)?.name || '—',
        products.find(p => p.id === r.product_id)?.category || '—',
        r.batch_number,
        r.produced_sheets,
        r.target_sheets,
        r.production_employees,
        employees.find(e => e.id === r.production_incharge_id)?.name || '—',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'production-comparison-analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setProductFilter('');
    setCategoryFilter('');
    setBatchFilter('');
    setEmployeeFilter('');
    setInchargeFilter('');
    setQuickFilter('thisMonth');
    setCustomFrom('');
    setCustomTo('');
  };

  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div ref={contentRef}>
      <PageHeader
        title="Production Comparison Analysis"
        subtitle="Compare production performance across different periods"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        }
      />

      {/* Quick Filters Bar */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          {quickFilters.map(f => (
            <Pill
              key={f.id}
              label={f.label}
              active={quickFilter === f.id}
              onClick={() => setQuickFilter(f.id)}
              size="small"
            />
          ))}
          {quickFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              />
            </div>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Filter size={14} />
            More Filters
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Product</label>
              <select
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              >
                <option value="">All Products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Batch Number</label>
              <select
                value={batchFilter}
                onChange={e => setBatchFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              >
                <option value="">All Batches</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Incharge</label>
              <select
                value={inchargeFilter}
                onChange={e => setInchargeFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
              >
                <option value="">All Incharges</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 transition-colors"
              >
                <RefreshCw size={12} /> Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Mode Selection */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Compare:</span>
          {[
            { id: 'todayVsYesterday', label: 'Today vs Yesterday' },
            { id: 'weekVsLastWeek', label: 'This Week vs Last Week' },
            { id: 'monthVsLastMonth', label: 'This Month vs Last Month' },
            { id: 'yearVsLastYear', label: 'This Year vs Last Year' },
            { id: 'customRange', label: 'Custom Range' },
          ].map(opt => (
            <Pill
              key={opt.id}
              label={opt.label}
              active={comparisonMode === opt.id}
              onClick={() => setComparisonMode(opt.id as ComparisonMode)}
              size="small"
            />
          ))}
        </div>

        {comparisonMode === 'customRange' && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">Period A</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customRangeA.from}
                  onChange={e => setCustomRangeA(prev => ({ ...prev, from: e.target.value }))}
                  className="border border-blue-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={customRangeA.to}
                  onChange={e => setCustomRangeA(prev => ({ ...prev, to: e.target.value }))}
                  className="border border-blue-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
                />
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-2">Period B</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customRangeB.from}
                  onChange={e => setCustomRangeB(prev => ({ ...prev, from: e.target.value }))}
                  className="border border-emerald-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition bg-white"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={customRangeB.to}
                  onChange={e => setCustomRangeB(prev => ({ ...prev, to: e.target.value }))}
                  className="border border-emerald-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard
          label="Today's Sheets"
          value={kpis.todaySheets}
          icon={<Layers size={16} />}
          accent="bg-blue-50 text-blue-600"
          loading={loading}
        />
        <KpiCard
          label="Yesterday's Sheets"
          value={kpis.yesterdaySheets}
          icon={<Clock size={16} />}
          accent="bg-gray-100 text-gray-600"
          loading={loading}
        />
        <KpiCard
          label="Difference"
          value={kpis.diff}
          icon={kpis.diffTrend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          accent={kpis.diffTrend === 'up' ? 'bg-green-50 text-green-600' : kpis.diffTrend === 'down' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}
          loading={loading}
          trend={kpis.diffTrend}
          trendValue="vs yesterday"
        />
        <KpiCard
          label="Total Sheets"
          value={kpis.totalSheets}
          sub={`${filtered.length} records`}
          icon={<Package2 size={16} />}
          accent="bg-sky-50 text-sky-600"
          loading={loading}
        />
        <KpiCard
          label="Avg Sheets/Day"
          value={kpis.avgSheets}
          icon={<Target size={16} />}
          accent="bg-violet-50 text-violet-600"
          loading={loading}
        />
        <KpiCard
          label="Total Employees"
          value={kpis.totalEmp}
          icon={<Users size={16} />}
          accent="bg-amber-50 text-amber-600"
          loading={loading}
        />
        <KpiCard
          label="Avg Emp/Day"
          value={kpis.avgEmp}
          icon={<Users size={16} />}
          accent="bg-orange-50 text-orange-600"
          loading={loading}
        />
        <KpiCard
          label="Total Batches"
          value={kpis.batchCount}
          icon={<Briefcase size={16} />}
          accent="bg-teal-50 text-teal-600"
          loading={loading}
        />
      </div>

      {/* Comparison Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600" />
          Comparison: {comparisonRanges.labelA} vs {comparisonRanges.labelB}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">{comparisonRanges.labelA}</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{comparisonData.sheetsA.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">sheets ({comparisonData.daysA} days)</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">{comparisonRanges.labelB}</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{comparisonData.sheetsB.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">sheets ({comparisonData.daysB} days)</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Difference</p>
            <p className={`text-xl font-bold mt-1 ${comparisonData.sheetsTrend === 'up' ? 'text-green-600' : comparisonData.sheetsTrend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
              {comparisonData.sheetsDiff}%
            </p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              {comparisonData.sheetsTrend === 'up' ? <ArrowUpRight size={10} className="text-green-500" /> :
               comparisonData.sheetsTrend === 'down' ? <ArrowDownRight size={10} className="text-red-500" /> : null}
              {comparisonData.sheetsTrend === 'up' ? 'Increase' : comparisonData.sheetsTrend === 'down' ? 'Decrease' : 'No change'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Avg/Day Change</p>
            <p className="text-xl font-bold text-gray-800 mt-1">
              {Math.abs(Number(comparisonData.avgSheetsA) - Number(comparisonData.avgSheetsB)).toFixed(0)}
            </p>
            <p className="text-[10px] text-gray-400">
              {comparisonData.avgSheetsA} vs {comparisonData.avgSheetsB}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-4 mb-6">
        {/* Chart View Toggle */}
        <div className="flex items-center gap-2">
          <Pill label="Daily" active={activeChartView === 'daily'} onClick={() => setActiveChartView('daily')} size="small" />
          <Pill label="Weekly" active={activeChartView === 'weekly'} onClick={() => setActiveChartView('weekly')} size="small" />
          <Pill label="Monthly" active={activeChartView === 'monthly'} onClick={() => setActiveChartView('monthly')} size="small" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Production Trend */}
          <ChartCard title="Daily Production Trend">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData}>
                  <defs>
                    <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Area type="monotone" dataKey="target" stroke="#9ca3af" fill="url(#colorTarget)" name="Target" />
                  <Area type="monotone" dataKey="produced" stroke="#2563eb" fill="url(#colorProduced)" name="Produced" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Monthly Production Trend */}
          <ChartCard title="Monthly Production Trend">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="produced" fill="#2563eb" name="Produced" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" fill="#d1d5db" name="Target" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Product-wise Production */}
          <ChartCard title="Product-wise Production (Sheets)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={productWiseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Category Distribution */}
          <ChartCard title="Product Category Distribution">
            <div className="h-64 flex items-center justify-center">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400">No category data</p>
              )}
            </div>
          </ChartCard>

          {/* Employee Productivity */}
          <ChartCard title="Employee Productivity (Sheets)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={employeeProductivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="sheets" fill="#059669" radius={[0, 4, 4, 0]} name="Sheets" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Batch-wise Production */}
          <ChartCard title="Batch-wise Production (Top 10)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={batchWiseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="batch" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Top Performers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Top 10 Products */}
        <ChartCard title="Top 10 Products" actions={<Award size={14} className="text-amber-500" />}>
          <div className="space-y-2">
            {topPerformers.topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="truncate max-w-[120px]">{p.name}</span>
                </div>
                <span className="font-semibold text-gray-700">{p.sheets.toLocaleString()}</span>
              </div>
            ))}
            {topPerformers.topProducts.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </ChartCard>

        {/* Top 10 Employees */}
        <ChartCard title="Top 10 Employees" actions={<Award size={14} className="text-blue-500" />}>
          <div className="space-y-2">
            {topPerformers.topEmployees.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="truncate max-w-[120px]">{e.name}</span>
                </div>
                <span className="font-semibold text-gray-700">{e.sheets.toLocaleString()}</span>
              </div>
            ))}
            {topPerformers.topEmployees.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </ChartCard>

        {/* Top 10 Production Days */}
        <ChartCard title="Top 10 Production Days" actions={<Award size={14} className="text-green-500" />}>
          <div className="space-y-2">
            {topPerformers.topDays.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < 3 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span>{d.date}</span>
                </div>
                <span className="font-semibold text-gray-700">{d.sheets.toLocaleString()}</span>
              </div>
            ))}
            {topPerformers.topDays.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Summary Insights */}
      <ChartCard title="Summary Insights" actions={<Info size={14} className="text-blue-500" />} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-700">{insight}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Comparison Table */}
      <ChartCard title="Comparison Table (Last 50 Records)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-2 font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500 uppercase tracking-wide">Batch</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase tracking-wide">Sheets</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase tracking-wide">Employees</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500 uppercase tracking-wide">Incharge</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase tracking-wide">Diff</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase tracking-wide">Growth</th>
              </tr>
            </thead>
            <tbody>
              {comparisonTableData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">No data available</td>
                </tr>
              ) : (
                comparisonTableData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2 px-2 font-medium text-gray-800">{row.date}</td>
                    <td className="py-2 px-2 text-gray-600 truncate max-w-[120px]">{row.product}</td>
                    <td className="py-2 px-2 text-gray-600 font-mono">{row.batch}</td>
                    <td className="py-2 px-2 text-right font-semibold text-gray-800">{row.sheets.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{row.employees}</td>
                    <td className="py-2 px-2 text-gray-600 truncate max-w-[100px]">{row.incharge}</td>
                    <td className={`py-2 px-2 text-right font-medium ${row.diff > 0 ? 'text-green-600' : row.diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {row.diff > 0 ? '+' : ''}{row.diff}
                    </td>
                    <td className={`py-2 px-2 text-right font-medium ${row.trend === 'up' ? 'text-green-600' : row.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                      {row.growth}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
