import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  CreditCard, 
  Award, 
  BarChart3, 
  Info, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import type { Appointment } from '../types';

interface MonthlyRevenueChartProps {
  appointments: Appointment[];
  primaryColor?: string;
  onViewAppointments?: () => void;
}

type ViewMetric = 'revenue' | 'appointments' | 'both';

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({
  appointments = [],
  primaryColor = '#b0004a',
  onViewAppointments,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0-based
  const [selectedMetric, setSelectedMetric] = useState<ViewMetric>('revenue');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // 1. Filter completed appointments for the current year
  const completedAppointmentsThisYear = useMemo(() => {
    return appointments.filter((apt) => {
      if (apt.status !== 'completed') return false;
      if (!apt.date) return false;
      const parts = apt.date.split('-');
      const year = parseInt(parts[0], 10);
      return year === currentYear;
    });
  }, [appointments, currentYear]);

  // 2. Aggregate monthly metrics across all 12 calendar months
  const monthlyData = useMemo(() => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const fullMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const data = monthNames.map((shortName, index) => ({
      month: shortName,
      fullMonth: fullMonthNames[index],
      monthIndex: index,
      revenue: 0,
      completedCount: 0,
      avgTicket: 0,
      isCurrentMonth: index === currentMonthIdx,
      isPastOrCurrent: index <= currentMonthIdx,
    }));

    completedAppointmentsThisYear.forEach((apt) => {
      const parts = apt.date.split('-');
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        // In salon billing, completed appointment revenue is servicePrice or amountPaid
        const rev = apt.servicePrice || apt.amountPaid || 0;
        data[monthIdx].revenue += rev;
        data[monthIdx].completedCount += 1;
      }
    });

    data.forEach((item) => {
      item.avgTicket = item.completedCount > 0 ? Math.round(item.revenue / item.completedCount) : 0;
    });

    return data;
  }, [completedAppointmentsThisYear, currentMonthIdx]);

  // 3. Analytics summaries
  const totalAnnualRevenue = useMemo(() => {
    return monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  }, [monthlyData]);

  const totalCompletedAppointments = useMemo(() => {
    return monthlyData.reduce((sum, m) => sum + m.completedCount, 0);
  }, [monthlyData]);

  const peakMonth = useMemo(() => {
    let peak = monthlyData[0];
    monthlyData.forEach((m) => {
      if (m.revenue > peak.revenue) peak = m;
    });
    return peak;
  }, [monthlyData]);

  const averageMonthlyRevenue = useMemo(() => {
    const pastMonthsCount = Math.max(1, currentMonthIdx + 1);
    const pastMonthsRevenue = monthlyData
      .slice(0, pastMonthsCount)
      .reduce((sum, m) => sum + m.revenue, 0);
    return Math.round(pastMonthsRevenue / pastMonthsCount);
  }, [monthlyData, currentMonthIdx]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs min-w-[200px] animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
            <span className="font-bold text-slate-200">
              {dataPoint.fullMonth} {currentYear}
            </span>
            {dataPoint.isCurrentMonth && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono font-semibold">
                Current
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                Revenue:
              </span>
              <span className="font-extrabold text-white font-mono text-sm">
                ₹{dataPoint.revenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                Completed:
              </span>
              <span className="font-bold text-slate-200 font-mono">
                {dataPoint.completedCount} bookings
              </span>
            </div>
            {dataPoint.completedCount > 0 && (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Avg Ticket:</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  ₹{dataPoint.avgTicket.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section 
      aria-label="Annual Revenue Analytics"
      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6"
    >
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-extrabold text-xl text-slate-900">
                  Monthly Revenue Analytics
                </h2>
                <span className="bg-slate-100 text-slate-700 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                  {currentYear} Calendar Year
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated strictly from completed client appointments in {currentYear}.
              </p>
            </div>
          </div>
        </div>

        {/* METRIC VIEW TOGGLE BUTTONS */}
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSelectedMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedMetric === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Revenue (₹)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('appointments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedMetric === 'appointments'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
            <span>Completed Count</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedMetric === 'both'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Dual View</span>
          </button>
        </div>
      </div>

      {/* REVENUE KPI SUMMARY STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/90 rounded-xl p-3.5">
          <span className="text-[11px] font-mono-caps font-bold text-slate-500 block">
            Annual Completed Revenue
          </span>
          <div className="font-display font-extrabold text-xl text-slate-900 mt-1">
            ₹{totalAnnualRevenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed completed earnings
          </span>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/90 rounded-xl p-3.5">
          <span className="text-[11px] font-mono-caps font-bold text-slate-500 block">
            Completed Appointments
          </span>
          <div className="font-display font-extrabold text-xl text-slate-900 mt-1">
            {totalCompletedAppointments}
          </div>
          <span className="text-[10px] text-sky-600 font-semibold flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            In {currentYear}
          </span>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/90 rounded-xl p-3.5">
          <span className="text-[11px] font-mono-caps font-bold text-slate-500 block">
            Highest Revenue Month
          </span>
          <div className="font-display font-extrabold text-xl text-slate-900 mt-1 flex items-baseline gap-1.5">
            <span>{peakMonth.fullMonth}</span>
            <span className="text-xs font-mono font-bold text-emerald-700">
              (₹{peakMonth.revenue.toLocaleString('en-IN')})
            </span>
          </div>
          <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
            <Award className="w-3 h-3" />
            Peak performance period
          </span>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/90 rounded-xl p-3.5">
          <span className="text-[11px] font-mono-caps font-bold text-slate-500 block">
            Avg Monthly Revenue (YTD)
          </span>
          <div className="font-display font-extrabold text-xl text-slate-900 mt-1">
            ₹{averageMonthlyRevenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
            <Sparkles className="w-3 h-3 text-purple-500" />
            Based on active {currentMonthIdx + 1} months
          </span>
        </div>
      </div>

      {/* RECHARTS LINE CHART CONTAINER */}
      <div className="w-full bg-slate-50/60 border border-slate-200/70 rounded-2xl p-4 sm:p-5">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              onMouseMove={(state: any) => {
                if (state && state.activeLabel) {
                  setHoveredMonth(state.activeLabel);
                }
              }}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              
              <XAxis
                dataKey="month"
                stroke="#64748b"
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />

              {/* Primary Y-Axis for Revenue */}
              {(selectedMetric === 'revenue' || selectedMetric === 'both') && (
                <YAxis
                  yAxisId="revenueAxis"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: number) => {
                    if (val === 0) return '₹0';
                    if (val >= 1000) {
                      return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
                    }
                    return `₹${val}`;
                  }}
                />
              )}

              {/* Secondary Y-Axis for Appointments Count */}
              {(selectedMetric === 'appointments' || selectedMetric === 'both') && (
                <YAxis
                  yAxisId="countAxis"
                  orientation={selectedMetric === 'both' ? 'right' : 'left'}
                  stroke="#0284c7"
                  tick={{ fontSize: 11, fill: '#0284c7' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tickFormatter={(val: number) => `${val} apts`}
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              
              <Legend
                verticalAlign="top"
                align="right"
                height={38}
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px', fontWeight: 600 }}
              />

              {/* Reference indicator for current month */}
              <ReferenceLine
                x={monthlyData[currentMonthIdx]?.month}
                yAxisId={selectedMetric === 'appointments' ? 'countAxis' : 'revenueAxis'}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: 'Current Month',
                  position: 'top',
                  fill: '#059669',
                  fontSize: 10,
                  fontWeight: 700
                }}
              />

              {/* Line: Completed Revenue (₹) */}
              {(selectedMetric === 'revenue' || selectedMetric === 'both') && (
                <Line
                  yAxisId="revenueAxis"
                  type="monotone"
                  dataKey="revenue"
                  name="Completed Revenue (₹)"
                  stroke={primaryColor}
                  strokeWidth={3}
                  activeDot={{
                    r: 8,
                    strokeWidth: 2,
                    fill: primaryColor,
                    stroke: '#ffffff'
                  }}
                  dot={{
                    r: 4.5,
                    strokeWidth: 2,
                    fill: '#ffffff',
                    stroke: primaryColor
                  }}
                  animationDuration={1200}
                />
              )}

              {/* Line: Completed Appointments Count */}
              {(selectedMetric === 'appointments' || selectedMetric === 'both') && (
                <Line
                  yAxisId="countAxis"
                  type="monotone"
                  dataKey="completedCount"
                  name="Completed Appointments"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  strokeDasharray={selectedMetric === 'both' ? '4 4' : undefined}
                  activeDot={{
                    r: 7,
                    strokeWidth: 2,
                    fill: '#0284c7',
                    stroke: '#ffffff'
                  }}
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    fill: '#ffffff',
                    stroke: '#0284c7'
                  }}
                  animationDuration={1200}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MONTH-BY-MONTH BREAKDOWN TILES */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono-caps font-bold px-1">
          <span>Monthly Revenue Distribution ({currentYear})</span>
          <span>Click any month to inspect</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {monthlyData.map((m) => {
            const isHovered = hoveredMonth === m.month;
            const isCurrent = m.isCurrentMonth;
            const isPeak = m.month === peakMonth.month && peakMonth.revenue > 0;
            return (
              <div
                key={m.month}
                onMouseEnter={() => setHoveredMonth(m.month)}
                onMouseLeave={() => setHoveredMonth(null)}
                className={`p-3 rounded-xl border transition-all ${
                  isHovered
                    ? 'border-slate-800 bg-white shadow-md scale-[1.02]'
                    : isCurrent
                      ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                      : isPeak
                        ? 'border-amber-300 bg-amber-50/30'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-800">
                    {m.month}
                  </span>
                  {isPeak ? (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded font-mono">
                      Peak
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded font-mono">
                      Now
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {m.completedCount} apts
                    </span>
                  )}
                </div>

                <div className="font-display font-extrabold text-sm text-slate-900">
                  ₹{m.revenue.toLocaleString('en-IN')}
                </div>

                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                  <span>{m.completedCount} completed</span>
                  <span>{m.avgTicket > 0 ? `₹${m.avgTicket}/ea` : '-'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER HELPER CALLOUT */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            <strong>Real-time syncing:</strong> Whenever an appointment is marked as <strong>Completed</strong> in the Client Appointments table, the monthly revenue line chart updates automatically.
          </span>
        </div>
        {onViewAppointments && (
          <button
            type="button"
            onClick={onViewAppointments}
            className="text-xs font-bold text-[#b0004a] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Manage Appointments</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </section>
  );
};
