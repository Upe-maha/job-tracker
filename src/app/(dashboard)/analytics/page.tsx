// src/app/(dashboard)/analytics/page.tsx
'use client'

import { useDashboard } from '@/hooks/useQueries'
import { APPLICATION_STATUS_OPTIONS } from '@/lib/display'
import PageShell, { PageGrid } from '@/components/common/PageShell'
import ErrorState from '@/components/common/ErrorState'
import { AnalyticsSkeleton } from '@/components/common/Skeletons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

// ─── Custom Tooltip ──────────────────────────────────
interface TooltipEntry {
  name?: string
  value?: number
  payload?: { name?: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (active && payload && payload.length) {
    const entry = payload[0]
    // For bar charts, the category is in entry.payload.name
    // For pie charts, it's often entry.name (but we handle both)
    const name = entry.payload?.name ?? entry.name
    const value = entry.value

    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-sm text-sm">
        <p className="text-foreground font-medium">{name}</p>
        <p className="text-muted-foreground">{value}</p>
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard()

  if (isLoading) {
    return (
      <PageShell>
        <AnalyticsSkeleton />
      </PageShell>
    )
  }

  if (isError || !data) {
    return (
      <PageShell>
        <ErrorState error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      </PageShell>
    )
  }

  const { stats } = data

  // Derived from the enum, and each datum carries its own colour so the chart
  // never has to map a rendered label back to a status key.
  const barData = APPLICATION_STATUS_OPTIONS.map(({ value, label, chart }) => ({
    name: label,
    value: stats[value] ?? 0,
    fill: chart,
  }))

  const pieData = barData.filter(d => d.value > 0)

  const conversionRate = stats.applied > 0
    ? Math.round((stats.interview / stats.applied) * 100)
    : 0

  const offerRate = stats.interview > 0
    ? Math.round((stats.offer / stats.interview) * 100)
    : 0

  return (<>

    <h1 className="text-2xl font-bold">Application Analytics Overview</h1>

    <PageShell>
      {/* Cards */}
      <PageGrid>
        <div className="md:col-span-4 bg-card border border-border rounded-xl p-5">
          <p className="text-muted-foreground text-xs mb-1">Total Applications</p>
          <p className="text-foreground text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="md:col-span-4 bg-card border border-stage-applied-fg/20 rounded-xl p-5">
          <p className="text-muted-foreground text-xs mb-1">Interview Rate</p>
          <p className="text-stage-applied-fg text-3xl font-bold">{conversionRate}%</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            of applied → interview
          </p>
        </div>
        <div className="md:col-span-4 bg-card border border-stage-offer-fg/20 rounded-xl p-5">
          <p className="text-muted-foreground text-xs mb-1">Offer Rate</p>
          <p className="text-stage-offer-fg text-3xl font-bold">{offerRate}%</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            of interviews → offer
          </p>
        </div>
      </PageGrid>

      {/* Charts */}
      <PageGrid>

        {/* Bar Chart */}
        <div className="md:col-span-6 bg-card border border-border rounded-xl p-6">
          <h2 className="text-foreground font-semibold text-sm mb-6">
            Applications by Status
          </h2>
          {stats.total === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barSize={32}>
                <XAxis
                  dataKey="name"
                  tick={{
                    fill: 'var(--muted-foreground)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: 'var(--muted-foreground)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map(entry => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="md:col-span-6 bg-card border border-border rounded-xl p-6">
          <h2 className="text-foreground font-semibold text-sm mb-6">
            Status Distribution
          </h2>
          {pieData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map(entry => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: '11px',
                    color: 'var(--muted-foreground)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

      </PageGrid>

      {/* Breakdown Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-foreground font-semibold text-sm mb-4">
          Status Breakdown
        </h2>
        <div className="space-y-3">
          {barData.map(item => {
            const pct = stats.total > 0
              ? Math.round((item.value / stats.total) * 100)
              : 0
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-foreground text-sm">{item.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {item.value} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.fill,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </PageShell>
  </>
  )
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <p className="text-muted-foreground/50 text-sm">
        Add applications to see charts
      </p>
    </div>
  )
}