// src/app/(dashboard)/analytics/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
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

async function fetchAnalytics() {
  const res = await fetch('/api/dashboard')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const statusColors: Record<string, string> = {
  wishlist:  '#64748b',
  applied:   '#3b82f6',
  interview: '#eab308',
  offer:     '#22c55e',
  rejected:  '#ef4444',
}

// ─── Custom Tooltip ──────────────────────────────────
function CustomTooltip({ active, payload }: any) {
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
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchAnalytics,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Loading analytics...</p>
      </div>
    )
  }

  const { stats } = data

  const barData = [
    { name: 'Wishlist',  value: stats.wishlist },
    { name: 'Applied',   value: stats.applied },
    { name: 'Interview', value: stats.interview },
    { name: 'Offer',     value: stats.offer },
    { name: 'Rejected',  value: stats.rejected },
  ]

  const pieData = barData.filter(d => d.value > 0)

  const conversionRate = stats.applied > 0
    ? Math.round((stats.interview / stats.applied) * 100)
    : 0

  const offerRate = stats.interview > 0
    ? Math.round((stats.offer / stats.interview) * 100)
    : 0

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Insights into your job search performance
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-muted-foreground text-xs mb-1">Total Applications</p>
          <p className="text-foreground text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border border-blue-500/20 rounded-xl p-5">
          <p className="text-muted-foreground text-xs mb-1">Interview Rate</p>
          <p className="text-blue-500 text-3xl font-bold">{conversionRate}%</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            of applied → interview
          </p>
        </div>
        <div className="bg-card border border-green-500/20 rounded-xl p-5">
          <p className="text-muted-foreground text-xs mb-1">Offer Rate</p>
          <p className="text-green-500 text-3xl font-bold">{offerRate}%</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            of interviews → offer
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
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
                      fill={statusColors[entry.name.toLowerCase()]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
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
                      fill={statusColors[entry.name.toLowerCase()]}
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

      </div>

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
                      backgroundColor: statusColors[item.name.toLowerCase()],
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
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