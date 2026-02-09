'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  AreaChart,
  Area,
} from 'recharts'
import { getInitialGreeting } from '@/lib/mentor-chat/prompt'
import type { MentorChatPhase, MentorChatContext } from '@/lib/mentor-chat/types'

type ThemeCard = {
  id: string
  name: string
  icon: string
}

type Subject = {
  id: string
  name: string
  subtitle: string
  icon?: string
}

type ChatSession = {
  id: string
  title: string
  updatedAt: string
}

/**
 * Dashboard
 *
 * - For students: themed world selection panel (TARGET ANALYSIS style).
 * - For admins/teachers: simple placeholder (under construction).
 */
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mentis-navy">Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7E6]">
        <p className="text-mentis-navy">Sin sesión. Redirigiendo...</p>
      </div>
    )
  }

  const userRole = session.user?.role
  if (userRole === 'STUDENT') {
    return <StudentDashboard studentName={session.user?.name ?? 'Estudiante'} />
  }

  return (
    <OrganizerDashboard
      userName={session.user?.name ?? 'Usuario'}
      userRole={session.user?.role ?? 'TEACHER'}
    />
  )
}

type OrgStudent = {
  id: string
  name: string
  email: string | null
  createdAt: string
  prPoints: number
  lastChatAt: string | null
  streak: number
  hintsUsed: number
  segment?: 'autonomo' | 'constante_dependiente' | 'intermitente' | 'sin_actividad'
  flags?: string[]
  learningLevel?: 'sin_actividad' | 'bajo' | 'medio' | 'alto'
}
type OrgSummary = {
  id: string
  userId: string
  content: string
  sourceType?: string | null
  sourceId?: string | null
  createdAt: string
  user: { name: string }
}

export type OverviewResponse = {
  days: number
  activeOnly: boolean
  kpis: {
    totalStudents: number
    totalPoints: number
    summariesCount: number
    activeCount: number
    avgPoints: number
    bestStreak: number
    sessionsCount14d: number
    summariesCount14d: number
    hintsTotal14d: number | null
    hintsAvgPerSession14d: number | null
    activeStudents14d: number
    inactiveStudents14d: number
  }
  students: { id: string; name: string; email: string | null; prPoints: number; lastChatAt: string | null; streak: number; hintsUsed: number; flags: string[] }[]
  summaries: { id: string; userId: string; content: string; createdAt: string; user: { name: string } }[]
  series: {
    sessions_per_day: { date: string; label: string; sessions: number; hints: number }[]
    hints_per_day: { date: string; label: string; sessions: number; hints: number }[]
  }
  top_error_tags: { tag: string; pct_sessions: number; trend: number }[] | 'N/A'
  segmentation_counts: { autonomo: number; constante_dependiente: number; intermitente: number; sin_actividad: number }
  alerts: { studentId: string; name: string; flags: string[] }[]
  recommended_actions: { text: string; studentId: string | null; link: string }[]
}

const CHART_COLORS = {
  primary: '#1e3a5f',
  yellow: '#facc15',
  yellowLight: '#fde047',
  yellowDark: '#eab308',
  green: '#22c55e',
  orange: '#f97316',
  gray: '#94a3b8',
}

const FLAG_LABELS: Record<string, string> = {
  dependencia_alta: 'Dependencia alta',
  estancamiento: 'Estancamiento',
  inactivo_7d: 'Inactivo 7d',
  inactivo_14d: 'Inactivo 14d',
}

const NIVEL_LABEL: Record<string, string> = {
  sin_actividad: 'Sin actividad',
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
}

const NIVEL_STYLE: Record<string, string> = {
  sin_actividad: 'inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200',
  bajo: 'inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200',
  medio: 'inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold bg-mentis-yellow/30 text-amber-900 border border-mentis-yellow/50',
  alto: 'inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold bg-mentis-navy/15 text-mentis-navy border border-mentis-navy/30',
}

const DEPENDENCIA_LABEL: Record<string, string> = {
  sin_actividad: 'Sin actividad',
  autonomo: 'Autónomo',
  constante_dependiente: 'Constante dependiente',
  intermitente: 'Intermitente',
}

const DEPENDENCIA_STYLE: Record<string, string> = {
  sin_actividad: 'inline-flex px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200',
  autonomo: 'inline-flex px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200',
  constante_dependiente: 'inline-flex px-2 py-1 rounded-lg text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200',
  intermitente: 'inline-flex px-2 py-1 rounded-lg text-[10px] font-medium bg-mentis-yellow/20 text-mentis-navy/90 border border-mentis-yellow/40',
}

function OrganizerOverviewCharts({
  overview,
  overviewLoading,
  overviewError,
  days,
  onDaysChange,
  activeOnly,
  onActiveOnlyChange,
}: {
  overview: OverviewResponse | null
  overviewLoading: boolean
  overviewError: string | null
  days: number
  onDaysChange: (d: number) => void
  activeOnly: boolean
  onActiveOnlyChange: (v: boolean) => void
}) {
  const kpis = overview?.kpis
  const students = overview?.students ?? []
  const summaries = overview?.summaries ?? []
  const totalStudents = kpis?.totalStudents ?? 0
  const totalPoints = kpis?.totalPoints ?? 0
  const avgPoints = kpis?.avgPoints ?? 0
  const activeWithChat = kpis?.activeCount ?? 0
  const bestStreak = kpis?.bestStreak ?? 0
  const engagementPercent = totalStudents > 0 ? Math.round((activeWithChat / totalStudents) * 100) : 0
  const noActivity = kpis?.inactiveStudents14d ?? 0
  const totalHints = students.reduce((acc, s) => acc + s.hintsUsed, 0)
  const avgHints = activeWithChat > 0 ? Math.round(totalHints / activeWithChat) : 0

  const barData = useMemo(() => {
    return [...students]
      .sort((a, b) => b.prPoints - a.prPoints)
      .slice(0, 10)
      .map((s) => ({ name: s.name.split(' ')[0], puntos: s.prPoints, fullName: s.name }))
  }, [students])

  const donutData = useMemo(() => {
    const alto = students.filter((s) => s.prPoints >= 150).length
    const medio = students.filter((s) => s.prPoints >= 50 && s.prPoints < 150).length
    const bajo = students.filter((s) => s.prPoints >= 1 && s.prPoints < 50).length
    const sinActividad = students.filter((s) => s.prPoints === 0).length
    return [
      { label: 'Alto (≥150 pts)', value: alto, color: '#1e3a5f' },
      { label: 'Medio (50-149)', value: medio, color: '#334a6f' },
      { label: 'Bajo (1-49)', value: bajo, color: '#eab308' },
      { label: 'Sin actividad', value: sinActividad, color: '#94a3b8' },
    ].filter((d) => d.value > 0)
  }, [students])

  const activityByDay = useMemo(() => {
    const series = overview?.series?.sessions_per_day ?? []
    return series.map((d) => ({
      date: d.date,
      resúmenes: d.sessions,
      label: d.label,
    }))
  }, [overview?.series])

  const topStreaks = useMemo(
    () => [...students].sort((a, b) => b.streak - a.streak).slice(0, 5),
    [students]
  )

  const rawHintsPerDay = overview?.series?.hints_per_day ?? []
  const hintsTotal = overview?.kpis?.hintsTotal14d ?? 0
  const hintsPerDaySeries = useMemo(() => {
    if (rawHintsPerDay.some((d) => d.hints > 0)) return rawHintsPerDay
    if (hintsTotal <= 0 || rawHintsPerDay.length === 0) return rawHintsPerDay
    const copy = rawHintsPerDay.map((d) => ({ ...d, hints: 0 }))
    const lastIdx = copy.length - 1
    copy[lastIdx] = { ...copy[lastIdx], hints: hintsTotal }
    return copy
  }, [rawHintsPerDay, hintsTotal])
  const segmentation = overview?.segmentation_counts
  const segmentDonutData = segmentation
    ? [
        { label: 'Autónomo', value: segmentation.autonomo, color: '#1e3a5f' },
        { label: 'Constante dependiente', value: segmentation.constante_dependiente, color: '#334a6f' },
        { label: 'Intermitente', value: segmentation.intermitente, color: '#eab308' },
        { label: 'Sin actividad', value: segmentation.sin_actividad, color: '#94a3b8' },
      ].filter((d) => d.value > 0)
    : []

  if (overviewLoading && !overview) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-mentis-navy/60">Cargando vista general…</p>
      </div>
    )
  }
  if (overviewError && !overview) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-800">
        {overviewError}
      </div>
    )
  }
  if (!overview) {
    return null
  }

  return (
    <div className="space-y-10">
      {/* Hero + Filtros */}
      <div className="rounded-3xl bg-gradient-to-br from-mentis-navy/8 via-white/90 to-mentis-yellow/10 border border-mentis-yellow/30 shadow-lg p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-mentis-navy tracking-tight">
              Vista general
            </h2>
            <p className="text-sm text-mentis-navy/60 mt-1">
              Últimos {days} días · {overview.activeOnly ? 'Solo activos' : 'Todos los alumnos'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/50">Período</span>
            <div className="flex rounded-2xl bg-white/90 border border-mentis-yellow/40 shadow-inner p-1">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDaysChange(d)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${days === d ? 'bg-mentis-yellow text-mentis-navy shadow-md' : 'text-mentis-navy/60 hover:bg-mentis-yellow/20 hover:text-mentis-navy'}`}
                >
                  {d} d
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer pl-1">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => onActiveOnlyChange(e.target.checked)}
                className="rounded border-mentis-navy/30 text-mentis-navy focus:ring-mentis-yellow size-4"
              />
              <span className="text-sm font-medium text-mentis-navy/80">Solo activos</span>
            </label>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-2xl bg-white shadow-md border border-mentis-yellow/20 p-5 md:p-6 hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-mentis-navy/50">Estudiantes</p>
          <p className="text-3xl md:text-4xl font-bold text-mentis-navy mt-1 tracking-tight">{totalStudents}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-md border border-mentis-yellow/20 p-5 md:p-6 hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-mentis-navy/50">Puntos totales</p>
          <p className="text-3xl md:text-4xl font-bold text-mentis-navy mt-1 tracking-tight">{totalPoints}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-md border border-mentis-yellow/20 p-5 md:p-6 hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-mentis-navy/50">Resúmenes</p>
          <p className="text-3xl md:text-4xl font-bold text-mentis-navy mt-1 tracking-tight">{summaries.length}</p>
        </div>
        <div className="rounded-2xl bg-mentis-yellow/30 shadow-md border border-mentis-yellow/50 p-5 md:p-6 hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-800/80">Activos</p>
          <p className="text-3xl md:text-4xl font-bold text-mentis-navy mt-1 tracking-tight">{activeWithChat}</p>
          <p className="text-[10px] text-mentis-navy/60 mt-0.5">{engagementPercent}% con chat</p>
        </div>
        <div className="rounded-2xl bg-white shadow-md border border-mentis-yellow/20 p-5 md:p-6 hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-mentis-navy/50">Media puntos</p>
          <p className="text-3xl md:text-4xl font-bold text-mentis-navy mt-1 tracking-tight">{avgPoints}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-md border border-mentis-yellow/20 p-5 md:p-6 hover:shadow-lg transition-shadow">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-mentis-navy/50">Mejor racha</p>
          <p className="text-3xl md:text-4xl font-bold text-mentis-navy mt-1 tracking-tight">{bestStreak}</p>
        </div>
      </div>

      {/* Fila A: Alertas + Acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">
              Alertas pedagógicas
            </h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Alumnos que requieren atención</p>
          </div>
          <div className="p-6 md:p-8">
            {overview.alerts.length === 0 ? (
              <p className="text-sm text-mentis-navy/50 py-4">Ninguna alerta en el período.</p>
            ) : (
              <ul className="space-y-3">
                {overview.alerts.slice(0, 5).map((a) => (
                  <li key={a.studentId} className="flex flex-wrap items-center justify-between gap-3 py-3.5 px-4 rounded-2xl bg-mentis-navy/[0.04] border border-mentis-yellow/20 hover:border-mentis-yellow/40 transition-colors">
                    <span className="font-semibold text-mentis-navy">{a.name}</span>
                    <div className="flex flex-wrap gap-2">
                      {a.flags.map((f) => (
                        <span key={f} className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-100/90 text-amber-800 border border-amber-200/60">
                          {FLAG_LABELS[f] ?? f}
                        </span>
                      ))}
                    </div>
                    <Link href={`/organizer/students/${a.studentId}`} className="shrink-0 text-xs font-bold text-mentis-navy uppercase tracking-wider hover:underline">
                      Ver alumno →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">
              Acciones recomendadas
            </h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Siguiente paso sugerido</p>
          </div>
          <div className="p-6 md:p-8">
            {overview.recommended_actions.length === 0 ? (
              <p className="text-sm text-mentis-navy/50 py-4">Nada pendiente.</p>
            ) : (
              <ul className="space-y-3">
                {overview.recommended_actions.map((action, i) => (
                  <li key={i}>
                    <Link href={action.link} className="flex items-start gap-3 py-2.5 px-4 rounded-2xl bg-mentis-navy/[0.04] border border-transparent hover:border-mentis-yellow/30 hover:bg-mentis-yellow/10 transition-all group">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-mentis-yellow/30 text-mentis-navy font-bold text-xs flex items-center justify-center group-hover:bg-mentis-yellow/50">{i + 1}</span>
                      <span className="text-sm text-mentis-navy/90 group-hover:text-mentis-navy font-medium">{action.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Puntos PR por estudiante</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Comparativa en el período</p>
          </div>
          <div className="p-6 md:p-8">
            <div className="h-80">
              {barData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-mentis-navy/40 text-sm">Sin datos aún</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 32, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 12, fill: CHART_COLORS.primary }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: CHART_COLORS.primary }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(30,58,95,0.12)' }}
                      formatter={(value: number | undefined) => [value ?? 0, 'Puntos PR']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                    />
                    <Bar dataKey="puntos" fill={CHART_COLORS.yellow} radius={[0, 8, 8, 0]} name="Puntos" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Nivel de puntos</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Distribución por rango</p>
          </div>
          <div className="p-6 md:p-8">
            <div className="h-80 flex items-center justify-center">
              {donutData.length === 0 ? (
                <p className="text-mentis-navy/40 text-sm">Sin datos aún</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      innerRadius={64}
                      outerRadius={100}
                      paddingAngle={2}
                      label={false}
                      labelLine={false}
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(30,58,95,0.12)' }}
                      formatter={(value: number | undefined) => [value ?? 0, 'estudiantes']}
                    />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingTop: 16 }}
                      formatter={(value) => <span className="text-xs text-mentis-navy/80">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dependencia + Progreso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Dependencia y autonomía</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Pistas por día en el período</p>
          </div>
          <div className="p-6 md:p-8">
            <p className="text-xs text-mentis-navy/55 mb-4">
              Pistas por día (últimos {days} días). Sin datos históricos de pistas se muestra valor actual.
            </p>
            <div className="h-56">
              {hintsPerDaySeries.length > 0 && hintsPerDaySeries.some((d) => d.hints > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hintsPerDaySeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="hintsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_COLORS.primary }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.primary }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(30,58,95,0.12)' }}/>
                    <Area type="monotone" dataKey="hints" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#hintsGradient)" name="Pistas" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-mentis-navy/50 text-sm">
                  <p className="font-medium text-mentis-navy/70">Media: {kpis?.hintsAvgPerSession14d ?? avgHints} pistas/sesión</p>
                  <p className="text-[10px] mt-1">Cuando los alumnos usen pistas, aquí verás la evolución por día.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Progreso del grupo</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Sesiones e índice de mejora</p>
          </div>
          <div className="p-6 md:p-8">
            <p className="text-xs text-mentis-navy/55 mb-4">
              Sesiones en el período: {kpis?.sessionsCount14d ?? 0}. Puntos totales repartidos en resúmenes.
            </p>
            <div className="h-56 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-mentis-navy">{kpis?.sessionsCount14d ?? 0}</p>
                <p className="text-[10px] text-mentis-navy/55 mt-1">sesiones últimos {days} d</p>
                {typeof totalPoints === 'number' && (kpis?.sessionsCount14d ?? 0) > 0 && (
                  <p className="text-lg font-semibold text-mentis-navy/90 mt-4">
                    {Math.round(totalPoints / (kpis?.sessionsCount14d ?? 1))} pts/sesión
                  </p>
                )}
                <p className="text-[10px] text-mentis-navy/50 mt-1">Mejora semanal con checkpoints (próximamente)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Errores + Segmentación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Errores frecuentes</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Top conceptos a reforzar</p>
          </div>
          <div className="p-6 md:p-8">
            {overview.top_error_tags === 'N/A' || overview.top_error_tags.length === 0 ? (
              <p className="text-sm text-mentis-navy/50">N/A — Integrar tags cuando existan en el sistema.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.top_error_tags} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <XAxis dataKey="tag" tick={{ fontSize: 10, fill: CHART_COLORS.primary }} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.primary }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(30,58,95,0.12)' }}/>
                    <Bar dataKey="pct_sessions" fill={CHART_COLORS.yellow} radius={[4, 4, 0, 0]} name="% sesiones" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Segmentación de alumnos</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Perfiles por autonomía y actividad</p>
          </div>
          <div className="p-6 md:p-8">
            <div className="h-64 flex items-center justify-center">
              {segmentDonutData.length === 0 ? (
                <p className="text-mentis-navy/40 text-sm">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentDonutData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={2}
                      label={false}
                      labelLine={false}
                    >
                      {segmentDonutData.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(30,58,95,0.12)' }} formatter={(v: number) => [v, 'alumnos']} />
                    <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12 }} formatter={(v) => <span className="text-xs text-mentis-navy/80">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resúmenes por día + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Resúmenes por día</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Últimos 14 días</p>
          </div>
          <div className="p-6 md:p-8">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityByDay} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.yellow} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS.yellow} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.primary }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.primary }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(30,58,95,0.12)' }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Date(payload[0].payload.date).toLocaleDateString('es-ES') : ''}
                    formatter={(value: number | undefined) => [value ?? 0, 'resúmenes']}
                  />
                  <Area type="monotone" dataKey="resúmenes" stroke={CHART_COLORS.yellowDark} strokeWidth={2.5} fill="url(#areaGradient)" name="Resúmenes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-mentis-navy/8 shadow-xl border border-mentis-yellow/20 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/10">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Resumen</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Pistas y actividad</p>
          </div>
          <div className="p-6 md:p-8 flex-1">
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-mentis-navy/50">Pistas usadas (total)</p>
                <p className="text-2xl font-bold text-mentis-navy mt-0.5">{totalHints}</p>
                <p className="text-xs text-mentis-navy/55 mt-0.5">Media {avgHints} por activo</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-mentis-navy/50">Sin actividad aún</p>
                <p className="text-2xl font-bold text-mentis-navy mt-0.5">{noActivity}</p>
                <p className="text-xs text-mentis-navy/55 mt-0.5">Estudiantes por conectar</p>
              </div>
              <p className="text-sm text-mentis-navy/70 leading-relaxed pt-2">
                Los puntos PR se ganan con respuestas en el chat. Las rachas premian la constancia. Revisa la pestaña Estudiantes para el detalle por alumno.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rachas + CTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white shadow-xl border border-mentis-yellow/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
            <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Rachas destacadas</h3>
            <p className="text-[10px] text-mentis-navy/50 mt-0.5">Días consecutivos con actividad</p>
          </div>
          <div className="p-6 md:p-8">
            {topStreaks.length === 0 ? (
              <p className="text-mentis-navy/40 text-sm">Sin datos aún</p>
            ) : (
              <ul className="space-y-3">
                {topStreaks.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3 px-4 rounded-2xl bg-mentis-navy/[0.04] border border-mentis-yellow/20 hover:border-mentis-yellow/40 transition-colors">
                    <span className="font-semibold text-mentis-navy">{s.name}</span>
                    <span className="text-lg font-bold text-mentis-navy tabular-nums">{s.streak ?? 0} días</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-mentis-yellow/25 to-mentis-navy/10 shadow-xl border border-mentis-yellow/40 overflow-hidden p-6 md:p-8 flex flex-col justify-center">
          <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider mb-2">Vista detallada</h3>
          <p className="text-sm text-mentis-navy/75 leading-relaxed">
            En la pestaña <strong>Estudiantes</strong> verás la lista con email, puntos y último chat. Haz clic en una fila para abrir el detalle con resúmenes y mini-prompt del profesor.
          </p>
        </div>
      </div>
    </div>
  )
}

function OrganizerDashboard({
  userName,
  userRole,
}: {
  userName: string
  userRole: string
}) {
  const [data, setData] = useState<{
    students: OrgStudent[]
    summaries: OrgSummary[]
    totalStudents: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'students' | 'summaries'>('overview')
  const router = useRouter()

  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [overviewDays, setOverviewDays] = useState(14)
  const [overviewActiveOnly, setOverviewActiveOnly] = useState(false)

  type StudentsSortKey = 'name' | 'nivel' | 'dependencia' | 'puntos' | 'racha' | 'pistas' | 'alertas' | 'ultimo_chat'
  const [studentsSortKey, setStudentsSortKey] = useState<StudentsSortKey | null>(null)
  const [studentsSortDir, setStudentsSortDir] = useState<'asc' | 'desc'>('desc')
  const [studentsSearch, setStudentsSearch] = useState('')

  const NIVEL_ORDER: Record<string, number> = { sin_actividad: 0, bajo: 1, medio: 2, alto: 3 }
  const SEGMENT_ORDER: Record<string, number> = { sin_actividad: 0, intermitente: 1, constante_dependiente: 2, autonomo: 3 }

  const sortedStudents = useMemo(() => {
    if (!data?.students.length) return []
    const list = [...data.students]
    if (!studentsSortKey) return list
    const dir = studentsSortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      let cmp = 0
      switch (studentsSortKey) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '')
          break
        case 'nivel':
          cmp = (NIVEL_ORDER[a?.learningLevel ?? 'sin_actividad'] ?? 0) - (NIVEL_ORDER[b?.learningLevel ?? 'sin_actividad'] ?? 0)
          break
        case 'dependencia':
          cmp = (SEGMENT_ORDER[a?.segment ?? 'sin_actividad'] ?? 0) - (SEGMENT_ORDER[b?.segment ?? 'sin_actividad'] ?? 0)
          break
        case 'puntos':
          cmp = (a.prPoints ?? 0) - (b.prPoints ?? 0)
          break
        case 'racha':
          cmp = (a.streak ?? 0) - (b.streak ?? 0)
          break
        case 'pistas':
          cmp = (a.hintsUsed ?? 0) - (b.hintsUsed ?? 0)
          break
        case 'alertas':
          cmp = (a.flags?.length ?? 0) - (b.flags?.length ?? 0)
          break
        case 'ultimo_chat':
          cmp = (a.lastChatAt ? new Date(a.lastChatAt).getTime() : 0) - (b.lastChatAt ? new Date(b.lastChatAt).getTime() : 0)
          break
        default:
          return 0
      }
      return dir * (cmp || (a.name ?? '').localeCompare(b.name ?? ''))
    })
    return list
  }, [data?.students, studentsSortKey, studentsSortDir])

  const filteredStudents = useMemo(() => {
    if (!studentsSearch.trim()) return sortedStudents
    const q = studentsSearch.trim().toLowerCase()
    return sortedStudents.filter(
      (s) =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
    )
  }, [sortedStudents, studentsSearch])

  const handleStudentsSort = (key: StudentsSortKey) => {
    if (studentsSortKey === key) {
      setStudentsSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setStudentsSortKey(key)
      setStudentsSortDir('desc')
    }
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/organization/students')
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar datos')
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (tab !== 'overview') return
    let cancelled = false
    setOverviewLoading(true)
    setOverviewError(null)
    fetch(`/api/organization/overview?days=${overviewDays}&activeOnly=${overviewActiveOnly}`)
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar vista general')
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setOverviewData(json)
      })
      .catch((err) => {
        if (!cancelled) setOverviewError(err.message ?? 'Error')
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false)
      })
    return () => { cancelled = true }
  }, [tab, overviewDays, overviewActiveOnly])

  const roleLabel = userRole === 'ORGANIZATION_ADMIN' ? 'Organizador' : 'Profesor'

  return (
    <div className="min-h-screen bg-[#FFF7E6]">
      <header className="sticky top-0 z-20 border-b border-mentis-yellow/40 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="w-full max-w-[140rem] mx-auto px-4 md:px-6 lg:px-10 xl:px-12 py-3 flex flex-wrap items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <img
              src="https://www.mentislearn.com/wp-content/uploads/2026/02/WhatsApp_Image_2026-01-16_at_14.33.09__2_-removebg-preview.png"
              alt="Mentis"
              className="h-12 md:h-14 w-auto object-contain shrink-0"
            />
            <p className="text-xs md:text-sm text-mentis-navy/60 hidden sm:block truncate">
              {userName} · {roleLabel}
            </p>
          </div>

          <nav className="flex items-center rounded-2xl bg-mentis-yellow/10 border border-mentis-yellow/40 p-1 shadow-inner" aria-label="Secciones del panel">
            <button
              type="button"
              onClick={() => setTab('overview')}
              className={`px-4 md:px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                tab === 'overview'
                  ? 'bg-white text-mentis-navy shadow-md border border-mentis-yellow/50'
                  : 'text-mentis-navy/70 hover:bg-white/60 hover:text-mentis-navy'
              }`}
            >
              Vista general
            </button>
            <button
              type="button"
              onClick={() => setTab('students')}
              className={`px-4 md:px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                tab === 'students'
                  ? 'bg-white text-mentis-navy shadow-md border border-mentis-yellow/50'
                  : 'text-mentis-navy/70 hover:bg-white/60 hover:text-mentis-navy'
              }`}
            >
              Estudiantes
            </button>
            <button
              type="button"
              onClick={() => setTab('summaries')}
              className={`px-4 md:px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                tab === 'summaries'
                  ? 'bg-white text-mentis-navy shadow-md border border-mentis-yellow/50'
                  : 'text-mentis-navy/70 hover:bg-white/60 hover:text-mentis-navy'
              }`}
            >
              Resúmenes
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-full border border-mentis-navy/20 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-mentis-navy/80 hover:bg-mentis-navy hover:text-white transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[140rem] mx-auto px-4 md:px-6 lg:px-10 xl:px-12 py-6 md:py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-mentis-navy/60">Cargando datos de la organización…</p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-800">
            {error}
          </div>
        )}
        {!loading && !error && data && (
          <>
            {tab === 'overview' && (
              <OrganizerOverviewCharts
                overview={overviewData}
                overviewLoading={overviewLoading}
                overviewError={overviewError}
                days={overviewDays}
                onDaysChange={setOverviewDays}
                activeOnly={overviewActiveOnly}
                onActiveOnlyChange={setOverviewActiveOnly}
              />
            )}

            {tab === 'students' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="students-search" className="sr-only">
                    Buscar estudiantes por nombre o email
                  </label>
                  <span className="relative flex-1 max-w-md">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-mentis-navy/50">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                    </span>
                    <input
                      id="students-search"
                      type="search"
                      value={studentsSearch}
                      onChange={(e) => setStudentsSearch(e.target.value)}
                      placeholder="Buscar por nombre o email…"
                      className={`w-full rounded-xl border border-mentis-yellow/50 bg-white py-3 pl-11 text-sm text-mentis-navy placeholder:text-mentis-navy/40 focus:border-mentis-yellow focus:outline-none focus:ring-2 focus:ring-mentis-yellow/30 ${studentsSearch ? 'pr-11' : 'pr-4'}`}
                    />
                    {studentsSearch && (
                      <button
                        type="button"
                        onClick={() => setStudentsSearch('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-mentis-navy/50 hover:text-mentis-navy"
                        aria-label="Borrar búsqueda"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </span>
                  {studentsSearch && (
                    <span className="text-sm text-mentis-navy/60 whitespace-nowrap">
                      {filteredStudents.length} de {data.students.length} estudiantes
                    </span>
                  )}
                </div>
                <div className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="border-b border-mentis-yellow/40 bg-mentis-navy/5">
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70">
                          <button type="button" onClick={() => handleStudentsSort('name')} className="flex items-center gap-1.5 hover:text-mentis-navy group">
                            Estudiante
                            <span className="inline-flex shrink-0 opacity-60 group-hover:opacity-100" aria-hidden>
                              {studentsSortKey === 'name' ? (
                                studentsSortDir === 'desc' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M18 15l-6-6-6 6" /></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M6 9l6 6 6-6" /></svg>
                                )
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-navy/50"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                              )}
                            </span>
                          </button>
                        </th>
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70 hidden lg:table-cell">Email</th>
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70">
                          <button type="button" onClick={() => handleStudentsSort('nivel')} className="flex items-center gap-1.5 hover:text-mentis-navy group">
                            Nivel
                            <span className="inline-flex shrink-0 opacity-60 group-hover:opacity-100" aria-hidden>
                              {studentsSortKey === 'nivel' ? (
                                studentsSortDir === 'desc' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M18 15l-6-6-6 6" /></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M6 9l6 6 6-6" /></svg>
                                )
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-navy/50"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                              )}
                            </span>
                          </button>
                        </th>
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70">
                          <button type="button" onClick={() => handleStudentsSort('dependencia')} className="flex items-center gap-1.5 hover:text-mentis-navy group">
                            Dependencia
                            <span className="inline-flex shrink-0 opacity-60 group-hover:opacity-100" aria-hidden>
                              {studentsSortKey === 'dependencia' ? (
                                studentsSortDir === 'desc' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M18 15l-6-6-6 6" /></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M6 9l6 6 6-6" /></svg>
                                )
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-navy/50"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                              )}
                            </span>
                          </button>
                        </th>
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">
                          <button type="button" onClick={() => handleStudentsSort('puntos')} className="inline-flex items-center gap-1.5 ml-auto hover:text-mentis-navy group">
                            Puntos
                            <span className="inline-flex shrink-0 opacity-60 group-hover:opacity-100" aria-hidden>
                              {studentsSortKey === 'puntos' ? (
                                studentsSortDir === 'desc' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M18 15l-6-6-6 6" /></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M6 9l6 6 6-6" /></svg>
                                )
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-navy/50"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                              )}
                            </span>
                          </button>
                        </th>
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">
                          <button type="button" onClick={() => handleStudentsSort('racha')} className="inline-flex items-center gap-1.5 ml-auto hover:text-mentis-navy group">
                            Racha
                            <span className="inline-flex shrink-0 opacity-60 group-hover:opacity-100" aria-hidden>
                              {studentsSortKey === 'racha' ? (
                                studentsSortDir === 'desc' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M18 15l-6-6-6 6" /></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M6 9l6 6 6-6" /></svg>
                                )
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-navy/50"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                              )}
                            </span>
                          </button>
                        </th>
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">
                          <button type="button" onClick={() => handleStudentsSort('pistas')} className="inline-flex items-center gap-1.5 ml-auto hover:text-mentis-navy group">
                            Pistas
                            <span className="inline-flex shrink-0 opacity-60 group-hover:opacity-100" aria-hidden>
                              {studentsSortKey === 'pistas' ? (
                                studentsSortDir === 'desc' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M18 15l-6-6-6 6" /></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M6 9l6 6 6-6" /></svg>
                                )
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-navy/50"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                              )}
                            </span>
                          </button>
                        </th>
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70">
                          <button type="button" onClick={() => handleStudentsSort('alertas')} className="flex items-center gap-1.5 hover:text-mentis-navy group">
                            Alertas
                            <span className="inline-flex shrink-0 opacity-60 group-hover:opacity-100" aria-hidden>
                              {studentsSortKey === 'alertas' ? (
                                studentsSortDir === 'desc' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M18 15l-6-6-6 6" /></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M6 9l6 6 6-6" /></svg>
                                )
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-navy/50"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                              )}
                            </span>
                          </button>
                        </th>
                        <th className="px-4 md:px-5 py-4 text-xs font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">
                          <button type="button" onClick={() => handleStudentsSort('ultimo_chat')} className="inline-flex items-center gap-1.5 ml-auto hover:text-mentis-navy group">
                            Último chat
                            <span className="inline-flex shrink-0 opacity-60 group-hover:opacity-100" aria-hidden>
                              {studentsSortKey === 'ultimo_chat' ? (
                                studentsSortDir === 'desc' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M18 15l-6-6-6 6" /></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-yellow"><path d="M6 9l6 6 6-6" /></svg>
                                )
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mentis-navy/50"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
                              )}
                            </span>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mentis-yellow/20">
                      {data.students.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 md:px-6 py-10 text-center text-mentis-navy/60 text-base">
                            Aún no hay estudiantes. Los alumnos se unen con el código de la organización.
                          </td>
                        </tr>
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 md:px-6 py-10 text-center text-mentis-navy/60 text-base">
                            No hay estudiantes que coincidan con &quot;{studentsSearch.trim()}&quot;. Prueba con otro nombre o email.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => (
                          <tr
                            key={s.id}
                            onClick={() => router.push(`/organizer/students/${s.id}`)}
                            className="hover:bg-mentis-yellow/10 cursor-pointer transition-colors"
                          >
                            <td className="px-4 md:px-5 py-4 font-medium text-mentis-navy text-base">{s.name}</td>
                            <td className="px-4 md:px-5 py-4 text-sm text-mentis-navy/80 hidden lg:table-cell">{s.email ?? '—'}</td>
                            <td className="px-4 md:px-5 py-4">
                              <span className={`${NIVEL_STYLE[s?.learningLevel ?? 'sin_actividad']} text-xs`}>
                                {NIVEL_LABEL[s?.learningLevel ?? 'sin_actividad']}
                              </span>
                            </td>
                            <td className="px-4 md:px-5 py-4">
                              <span className={`${DEPENDENCIA_STYLE[s?.segment ?? 'sin_actividad']} text-xs`}>
                                {DEPENDENCIA_LABEL[s?.segment ?? 'sin_actividad']}
                              </span>
                            </td>
                            <td className="px-4 md:px-5 py-4 text-right font-semibold text-mentis-navy tabular-nums text-base">{s.prPoints ?? 0}</td>
                            <td className="px-4 md:px-5 py-4 text-right text-sm text-mentis-navy/80 tabular-nums">{s.streak ?? 0} d</td>
                            <td className="px-4 md:px-5 py-4 text-right text-sm text-mentis-navy/80 tabular-nums">{s.hintsUsed ?? 0}</td>
                            <td className="px-4 md:px-5 py-4">
                              {(s.flags?.length ?? 0) > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {(s.flags ?? []).slice(0, 2).map((f) => (
                                    <span key={f} className="inline-flex px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200/60">
                                      {FLAG_LABELS[f] ?? f}
                                    </span>
                                  ))}
                                  {(s.flags?.length ?? 0) > 2 && (
                                    <span className="text-xs text-mentis-navy/50">+{(s.flags?.length ?? 0) - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-mentis-navy/40 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-4 md:px-5 py-4 text-right text-sm text-mentis-navy/70 whitespace-nowrap">
                              {s.lastChatAt
                                ? new Date(s.lastChatAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            )}

            {tab === 'summaries' && (
              <div className="space-y-4">
                {data.summaries.length === 0 ? (
                  <div className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-md p-12 text-center text-mentis-navy/60 text-sm">
                    Aún no hay resúmenes de aprendizaje. Los estudiantes pueden generar &quot;Mini resumen&quot; desde el chat con Mentis.
                  </div>
                ) : (
                  data.summaries.map((sum) => (
                    <div
                      key={sum.id}
                      className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-md overflow-hidden"
                    >
                      <div className="px-4 md:px-6 py-3 border-b border-mentis-yellow/30 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-mentis-navy text-sm">
                          {sum.user.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-mentis-navy/50">
                          {new Date(sum.createdAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="px-4 md:px-6 py-4 text-sm text-mentis-navy/90 whitespace-pre-wrap leading-relaxed">
                        {sum.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function StudentDashboard({ studentName }: { studentName: string }) {
  const [themes, setThemes] = useState<ThemeCard[]>([
    { id: 'pokemon', name: 'Pokémon', icon: 'PK' },
    { id: 'football', name: 'Football', icon: 'FB' },
    { id: 'lego', name: 'Lego', icon: 'LG' },
    { id: 'animals', name: 'Animales', icon: 'AN' },
    { id: 'space', name: 'Espacio', icon: 'SP' },
    { id: 'videogames', name: 'Videojuegos', icon: 'VG' },
  ])

  const [showNewTheme, setShowNewTheme] = useState(false)
  const [newThemeName, setNewThemeName] = useState('')
  const [view, setView] = useState<'missions' | 'teachers'>('missions')
  const [selectedTheme, setSelectedTheme] = useState<ThemeCard | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('language')
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [sidebarMode, setSidebarMode] = useState<'subjects' | 'chats' | 'tools'>('subjects')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatPrompt, setChatPrompt] = useState<string>('')
  const [chatMessages, setChatMessages] = useState<
    Record<string, { role: 'user' | 'assistant'; content: string }[]>
  >({})
  const [isSending, setIsSending] = useState(false)

  const [chatSessions, setChatSessions] = useState<Record<string, ChatSession[]>>({
    language: [],
    maths: [],
    world: [],
    english: [],
    arts: [],
  })

  /** Estado del chat pedagógico guiado por conversación (phase + context). */
  const [guidedStateByChatId, setGuidedStateByChatId] = useState<
    Record<string, { phase: MentorChatPhase; context: MentorChatContext }>
  >({})

  // Herramientas: nivel de tutoría, puntos y botón de ayuda
  const [tutorLevel, setTutorLevel] = useState<'N1' | 'N2' | 'N3'>('N2')
  const [thoughtTracePercent, setThoughtTracePercent] = useState(0)
  const [streak, setStreak] = useState(0)
  const [prPoints, setPrPoints] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false)

  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const lastMessageRef = useRef<HTMLDivElement | null>(null)

  const syncProgressToApi = useCallback((updates: { prPoints?: number; streak?: number; hintsUsed?: number; lastChatAt?: string }) => {
    fetch('/api/student-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      syncProgressToApi({ prPoints, streak, hintsUsed })
    }, 1500)
    return () => clearTimeout(t)
  }, [prPoints, streak, hintsUsed, syncProgressToApi])

  const SPECIAL_SYMBOLS = ['±', '∞', '√', '∫', 'π', '×', '÷', '²', '³', '°', '≤', '≥', '≠', '≈', '∑', '∏', 'α', 'β', 'θ', 'Δ', '→', '←', '·', '½', '¼', '€', '°']

  const tutorLevelContent: Record<string, { tag: string; title: string; description: string }> = {
    N1: {
      tag: 'CONCEPTOS BÁSICOS',
      title: 'Nivel 1: Introducción',
      description: 'Mentis te guía paso a paso con preguntas muy sencillas para afianzar lo esencial.',
    },
    N2: {
      tag: 'PRACTICA GUIADA',
      title: 'Nivel 2: Práctica',
      description: 'Resuelve ejercicios con pistas cuando lo necesites. Ideal para consolidar.',
    },
    N3: {
      tag: 'MODELADO Y FUNCIONES',
      title: 'Nivel 3: Modelado',
      description: 'Analiza la relación entre el área de un cuadrado y su lado. Si el lado (L) se duplica, ¿qué ocurre con el área (A)?',
    },
  }

  const subjects: Subject[] = [
    { id: 'language', name: 'LANGUAGE', subtitle: 'READING' },
    { id: 'maths', name: 'MATHS', subtitle: 'NUMBERS' },
    { id: 'world', name: 'WORLD', subtitle: 'SCIENCE' },
    { id: 'english', name: 'ENGLISH', subtitle: 'COMMUNICATION & VOCAB' },
    { id: 'arts', name: 'ARTS', subtitle: 'CREATIVITY & OBSERVATION' },
  ]

  const currentMessages = useMemo(
    () => (selectedChatId && chatMessages[selectedChatId] ? chatMessages[selectedChatId] : []),
    [selectedChatId, chatMessages]
  )

  /** Nombre de la asignatura elegida en el lateral (el sistema ya lo conoce). */
  const selectedSubjectName = subjects.find((s) => s.id === selectedSubjectId)?.name ?? ''

  /** Estado guiado del chat actual. Siempre inyectamos la asignatura del UI en el contexto. */
  const currentGuidedState = selectedChatId
    ? guidedStateByChatId[selectedChatId] ?? { phase: 'idle' as MentorChatPhase, context: { subject: selectedSubjectName } as MentorChatContext }
    : { phase: 'idle' as MentorChatPhase, context: { subject: selectedSubjectName } as MentorChatContext }
  /** Contexto que se envía a la API: estado del chat + asignatura actual del lateral. */
  const apiContext: MentorChatContext = { ...currentGuidedState.context, subject: selectedSubjectName }
  const canRequestHint =
    currentGuidedState.phase === 'solving' ||
    currentGuidedState.phase === 'evaluating' ||
    currentGuidedState.phase === 'waiting_for_correction'

  /** Pide una pista conceptual al Profesor Mentis (solo activo en fase solving/evaluating/waiting_for_correction). */
  const handleRequestHint = async () => {
    const chatId = selectedChatId
    if (!chatId || isSending || !canRequestHint) return
    try {
      setIsSending(true)
      const state = guidedStateByChatId[chatId] ?? { phase: 'solving', context: {} }
      const messages = chatMessages[chatId] || []
      const res = await fetch('/api/mentor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: state.phase,
          context: apiContext,
          messages,
          requestingHint: true,
        }),
      })
      if (!res.ok) throw new Error('Hint request failed')
      const data = await res.json()
      const hint = data?.reply ?? 'Mentis te dará una pista. Inténtalo de nuevo.'
      setChatMessages((prev) => ({
        ...prev,
        [chatId]: [
          ...(prev[chatId] || []),
          { role: 'assistant', content: `💡 Pista: ${hint}` },
        ],
      }))
      setHintsUsed((prev) => prev + 1)
      syncProgressToApi({ hintsUsed: hintsUsed + 1 })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  // Auto-scroll al último mensaje cuando cambian los mensajes (hacia arriba = mostrar lo nuevo abajo)
  useEffect(() => {
    if (currentMessages.length === 0) return
    const t = setTimeout(() => {
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 100)
    return () => clearTimeout(t)
  }, [currentMessages.length, currentMessages])

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThemeName.trim()) return

    // Derivar unas buenas iniciales automáticamente a partir del nombre
    const words = newThemeName
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    let initials = ''

    if (words.length === 1) {
      // Un solo término: tomar las 2–3 primeras letras
      initials = words[0].slice(0, 3)
    } else {
      // Varios términos: tomar la primera letra de cada palabra hasta 3
      initials = words
        .map((w) => w[0])
        .join('')
        .slice(0, 3)
    }

    if (!initials) {
      initials = 'UV'
    }

    setThemes((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: newThemeName.trim(),
        icon: initials.toUpperCase(),
      },
    ])

    setNewThemeName('')
    setShowNewTheme(false)
  }

  const isChatView = Boolean(selectedTheme)

  return (
    <div
      className="min-h-screen bg-[#FFF7E6]"
    >
      {/* Top navigation bar */}
      {!selectedTheme && (
        <header className="flex items-center justify-between px-8 py-5 border-b border-yellow-200 bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-mentis-yellow flex items-center justify-center shadow-md">
              <span className="font-bold text-mentis-navy text-lg">M</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-mentis-navy tracking-wide">
                MENTIS
              </p>
              <p className="text-[11px] uppercase tracking-[0.25em] text-mentis-navy/60">
                LAB COGNITIF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex rounded-full bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setView('missions')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-colors ${
                  view === 'missions'
                    ? 'bg-mentis-yellow text-mentis-navy shadow-sm'
                    : 'text-mentis-navy/60'
                }`}
              >
                Missions
              </button>
              <button
                type="button"
                onClick={() => setView('teachers')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-colors ${
                  view === 'teachers'
                    ? 'bg-mentis-yellow text-mentis-navy shadow-sm'
                    : 'text-mentis-navy/60'
                }`}
              >
                Assignments
              </button>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-full bg-transparent border border-mentis-navy/20 px-4 py-2 font-medium text-mentis-navy/80 hover:bg-mentis-navy hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={isChatView ? 'h-screen w-full flex' : 'px-6 py-10 md:px-16 md:py-12'}>
        {view === 'missions' ? (
          <>
            {!selectedTheme ? (
              <>
                <div className="text-center mb-10">
                  <p className="text-xs uppercase tracking-[0.3em] text-mentis-navy/60 mb-2">
                    Bienvenue, {studentName}
                  </p>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-mentis-navy tracking-wide mb-4">
                    TARGET ANALYSIS
                  </h1>
                  <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-mentis-navy/55">
                    Inicializa tu universo de misión eligiendo una temática
                  </p>
                </div>

                <section className="max-w-5xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setSelectedTheme(theme)
                          setSelectedSubjectId('language')
                          setSidebarMode('subjects')
                        }}
                        className="group h-full rounded-[32px] bg-white shadow-md px-6 py-7 flex flex-col items-center justify-center gap-4 hover:-translate-y-1 hover:shadow-lg transition-all text-center"
                      >
                        <div className="h-20 w-20 rounded-3xl bg-mentis-yellow flex items-center justify-center shadow-md text-xl font-extrabold text-mentis-navy tracking-wide uppercase">
                          <span>{theme.icon}</span>
                        </div>
                        <p className="text-sm font-semibold tracking-wide text-mentis-navy uppercase">
                          {theme.name}
                        </p>
                      </button>
                    ))}

                    {/* New theme card */}
                    <button
                      type="button"
                      onClick={() => setShowNewTheme(true)}
                      className="h-full rounded-[32px] border-2 border-dashed border-mentis-yellow/70 bg-white/60 px-6 py-7 flex flex-col items-center justify-center gap-3 hover:bg-white hover:-translate-y-1 hover:shadow-md transition-all text-center"
                    >
                      <div className="h-20 w-20 rounded-3xl bg-mentis-yellow/40 flex items-center justify-center text-3xl text-mentis-navy">
                        <span className="font-bold">+</span>
                      </div>
                      <p className="text-sm font-semibold tracking-wide text-mentis-navy uppercase">
                        Nuevo universo
                      </p>
                      <p className="text-[11px] text-mentis-navy/60 text-center max-w-[10rem]">
                        Crea tu propia temática para aprender a tu manera.
                      </p>
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <section className="flex-1 flex">
                {/* Lateral: colapsado (solo botón mostrar) o completo */}
                {sidebarCollapsed ? (
                  <div className="w-12 bg-[#FFEEC2] border-r border-mentis-yellow/40 shrink-0 flex flex-col items-center py-4">
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(false)}
                      className="h-10 w-10 rounded-full bg-mentis-yellow flex items-center justify-center text-mentis-navy shadow-md hover:bg-mentis-yellow/90 transition-colors"
                      title="Mostrar menú lateral"
                      aria-label="Mostrar menú lateral"
                    >
                      <span className="text-base font-bold leading-none" aria-hidden>»</span>
                    </button>
                  </div>
                ) : (
                <div className="w-80 md:w-[26rem] bg-[#FFEEC2] text-mentis-navy flex flex-col gap-4 px-5 py-5 border-r border-mentis-yellow/40 shrink-0">
                  <aside className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTheme(null)
                          setSelectedChatId(null)
                          setSidebarMode('subjects')
                          setChatMessages({})
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/70 border border-mentis-yellow/60 hover:bg-white transition-all text-xs font-semibold"
                      >
                        <span className="h-7 w-7 rounded-full bg-mentis-yellow flex items-center justify-center text-mentis-navy text-sm">
                          ⌂
                        </span>
                        <span className="tracking-[0.16em] uppercase">
                          Home
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarCollapsed(true)}
                        className="h-9 w-9 rounded-full bg-white/80 border border-mentis-yellow/60 flex items-center justify-center text-mentis-navy shadow-sm hover:bg-white transition-colors"
                        title="Ocultar menú lateral"
                        aria-label="Ocultar menú lateral"
                      >
                        <span className="text-base font-bold leading-none" aria-hidden>«</span>
                      </button>
                    </div>

                    {/* Menú horizontal: texto completo solo en la pestaña activa; el resto abreviado */}
                    <div className="flex rounded-2xl bg-white/80 border border-mentis-yellow/50 p-1.5 shadow-sm gap-1">
                      <button
                        type="button"
                        onClick={() => setSidebarMode('subjects')}
                        title="Asignaturas"
                        className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-[0.12em] transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
                          sidebarMode === 'subjects'
                            ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                            : 'text-mentis-navy/70 hover:text-mentis-navy hover:bg-mentis-yellow/20'
                        }`}
                      >
                        {sidebarMode === 'subjects' ? 'Asignaturas' : 'Asig.'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarMode('chats')}
                        title="Historial"
                        className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-[0.12em] transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
                          sidebarMode === 'chats'
                            ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                            : 'text-mentis-navy/70 hover:text-mentis-navy hover:bg-mentis-yellow/20'
                        }`}
                      >
                        {sidebarMode === 'chats' ? 'Historial' : 'Hist.'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarMode('tools')}
                        title="Herramientas"
                        className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-[0.12em] transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
                          sidebarMode === 'tools'
                            ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                            : 'text-mentis-navy/70 hover:text-mentis-navy hover:bg-mentis-yellow/20'
                        }`}
                      >
                        {sidebarMode === 'tools' ? 'Herramientas' : 'Herr.'}
                      </button>
                    </div>

                    {sidebarMode === 'subjects' ? (
                      <>
                        {subjects.map((subject) => {
                          const isActive = subject.id === selectedSubjectId
                          const hasChats = (chatSessions[subject.id] || []).length > 0
                          return (
                            <button
                              key={subject.id}
                              type="button"
                              onClick={() => {
                                setSelectedSubjectId(subject.id)
                                setSidebarMode(hasChats ? 'chats' : 'subjects')
                              }}
                              className={`w-full flex items-center gap-4 px-4 py-4 rounded-[999px] transition-all ${
                                isActive
                                  ? 'bg-white text-mentis-navy shadow-md border border-mentis-yellow/60'
                                  : 'bg-[#FFF7E6] text-mentis-navy border border-transparent hover:border-mentis-yellow/60'
                              }`}
                            >
                              <div
                                className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold ${
                                  isActive
                                    ? 'bg-mentis-yellow text-mentis-navy'
                                    : 'bg-mentis-yellow/30 text-mentis-navy'
                                }`}
                              >
                                <span>
                                  {subject.name
                                    .split(' ')
                                    .map((w) => w[0])
                                    .join('')
                                    .slice(0, 2)}
                                </span>
                              </div>
                              <div className="flex flex-col items-start">
                                <span
                                  className={`text-xs font-semibold tracking-[0.18em] uppercase ${
                                    isActive ? 'text-mentis-navy' : 'text-mentis-navy/80'
                                  }`}
                                >
                                  {subject.name}
                                </span>
                                <span
                                  className={`text-[10px] font-medium tracking-[0.2em] uppercase ${
                                    isActive ? 'text-mentis-yellow/80' : 'text-white/50'
                                  }`}
                                >
                                  {subject.subtitle}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </>
                    ) : sidebarMode === 'chats' ? (
                      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const subjectId = selectedSubjectId || 'language'
                            const newId = `${subjectId}-${Date.now()}`
                            const subjectName =
                              subjects.find((s) => s.id === subjectId)?.name || 'Chat'
                            const newSession: ChatSession = {
                              id: newId,
                              title: `Nuevo chat · ${subjectName}`,
                              updatedAt: 'Ahora mismo',
                            }
                            setChatSessions((prev) => ({
                              ...prev,
                              [subjectId]: [newSession, ...(prev[subjectId] || [])],
                            }))
                            setSelectedChatId(newId)
                            setChatMessages((prev) => ({ ...prev, [newId]: [] }))
                            setGuidedStateByChatId((prev) => ({
                              ...prev,
                              [newId]: { phase: 'idle', context: { subject: selectedSubjectName } },
                            }))
                          }}
                          className="shrink-0 h-10 w-full rounded-2xl border-2 border-dashed border-mentis-yellow/70 bg-white/70 flex items-center justify-center gap-2 text-mentis-navy font-semibold text-sm hover:bg-mentis-yellow/20 hover:border-mentis-yellow transition-colors"
                          aria-label="Nuevo chat"
                        >
                          <span className="text-xl leading-none">+</span>
                          <span className="uppercase tracking-wider">Nuevo chat</span>
                        </button>
                        <div className="space-y-2 overflow-auto pr-1 flex-1 min-h-0">
                        {(chatSessions[selectedSubjectId] || []).map((session) => {
                          const isActiveChat = session.id === selectedChatId
                          return (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => setSelectedChatId(session.id)}
                              className={`w-full text-left px-4 py-3 rounded-2xl border text-xs transition-all ${
                                isActiveChat
                                  ? 'bg-white text-mentis-navy border-mentis-yellow shadow-sm'
                                  : 'bg-[#FFF7E6] text-mentis-navy/80 border-transparent hover:border-mentis-yellow/60'
                              }`}
                            >
                              <div className="font-semibold truncate">{session.title}</div>
                              <div className="text-[10px] text-mentis-navy/60 mt-1">
                                {session.updatedAt}
                              </div>
                            </button>
                          )
                        })}
                        </div>
                      </div>
                    ) : (
                      /* Panel Herramientas: nivel, descripción, puntos, pedir ayuda */
                      <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-4 flex flex-col">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-mentis-navy/50 px-0.5 shrink-0">
                          Nivel de tutoría (manual)
                        </p>
                        <div className="flex rounded-2xl bg-white/90 border border-mentis-yellow/50 p-1 shadow-sm shrink-0">
                          {(['N1', 'N2', 'N3'] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setTutorLevel(level)}
                              className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                                tutorLevel === level
                                  ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                                  : 'text-mentis-navy/60 hover:bg-mentis-yellow/20 hover:text-mentis-navy'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2 shrink-0">
                          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 border border-mentis-navy/30 rounded-lg px-2 py-1">
                            {tutorLevelContent[tutorLevel].tag}
                          </span>
                          <h4 className="text-sm font-bold text-mentis-navy leading-tight">
                            {tutorLevelContent[tutorLevel].title}
                          </h4>
                          <div className="rounded-xl bg-mentis-navy/5 border border-mentis-yellow/40 p-3 text-left relative">
                            <span className="absolute top-1.5 left-2 text-mentis-navy/30 text-lg font-serif">&ldquo;</span>
                            <p className="text-xs text-mentis-navy/90 leading-relaxed pl-4">
                              {tutorLevelContent[tutorLevel].description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase tracking-wider text-mentis-navy/60">
                              Rastro de pensamiento
                            </span>
                            <span className="text-[10px] font-bold text-mentis-navy">{thoughtTracePercent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-mentis-navy/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-mentis-yellow transition-all duration-300"
                              style={{ width: `${thoughtTracePercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 shrink-0">
                          <div className="rounded-xl bg-mentis-yellow/25 border border-mentis-yellow/50 p-3 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/90">
                              Racha
                            </p>
                            <p className="text-xl font-bold text-mentis-navy mt-0.5">{streak}</p>
                          </div>
                          <div className="rounded-xl bg-purple-100 border border-purple-200/80 p-3 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-700/90">
                              Puntos PR
                            </p>
                            <p className="text-xl font-bold text-mentis-navy mt-0.5">{prPoints}</p>
                          </div>
                        </div>
                        <div className="rounded-xl bg-mentis-navy/5 border border-mentis-navy/20 p-3 text-center shrink-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">
                            Pistas usadas
                          </p>
                          <p className="text-lg font-bold text-mentis-navy mt-0.5">{hintsUsed}</p>
                        </div>

                        <div className="mt-auto pt-2 shrink-0 space-y-1">
                          <button
                            type="button"
                            onClick={handleRequestHint}
                            disabled={!canRequestHint || isSending}
                            className="w-full py-3.5 px-4 rounded-2xl bg-mentis-yellow border-2 border-mentis-navy/20 text-mentis-navy font-bold text-sm uppercase tracking-wider shadow-lg hover:bg-mentis-yellow/90 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="text-lg" aria-hidden>⚡</span>
                            Pedir ayuda
                          </button>
                          <p className="text-[10px] text-mentis-navy/60 text-center leading-snug">
                            Mentis te dará una pista conceptual para desbloquearte.
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedChatId || summaryLoading) return
                              const messages = chatMessages[selectedChatId] ?? []
                              if (messages.length === 0) return
                              setSummaryLoading(true)
                              setSummaryOpen(true)
                              setSummaryText(null)
                              try {
                                const res = await fetch('/api/learning-summary', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    messages: messages.map((m) => ({ role: m.role, content: m.content })),
                                    sourceId: selectedChatId,
                                  }),
                                })
                                const data = await res.json()
                                setSummaryText(data?.summary ?? 'No se pudo generar el resumen.')
                              } catch {
                                setSummaryText('Error al generar el resumen.')
                              } finally {
                                setSummaryLoading(false)
                              }
                            }}
                            disabled={summaryLoading || !selectedChatId || (chatMessages[selectedChatId]?.length ?? 0) === 0}
                            className="w-full py-2.5 px-4 rounded-xl bg-white border-2 border-mentis-navy/20 text-mentis-navy font-semibold text-xs uppercase tracking-wider hover:bg-mentis-yellow/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                          >
                            {summaryLoading ? 'Generando…' : '📋 Mini resumen'}
                          </button>
                          <p className="text-[10px] text-mentis-navy/50 text-center leading-snug">
                            Resumen y tips de lo aprendido en el chat.
                          </p>
                        </div>
                      </div>
                    )}
                  </aside>
                </div>
                )}

                {/* Modal Mini resumen */}
                {summaryOpen && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                    onClick={() => setSummaryOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Mini resumen"
                  >
                    <div
                      className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col border-2 border-mentis-yellow/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-6 py-4 border-b border-mentis-yellow/40 flex items-center justify-between">
                        <h3 className="font-bold text-mentis-navy uppercase tracking-wider text-sm">
                          Mini resumen
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSummaryOpen(false)}
                          className="text-mentis-navy/70 hover:text-mentis-navy text-xl leading-none"
                          aria-label="Cerrar"
                        >
                          ×
                        </button>
                      </div>
                      <div className="p-6 overflow-y-auto flex-1 scrollbar-mentis">
                        {summaryLoading ? (
                          <p className="text-mentis-navy/70">Generando resumen…</p>
                        ) : summaryText ? (
                          <div className="text-mentis-navy whitespace-pre-wrap text-sm leading-relaxed">
                            {summaryText}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel de chat (panel 2) */}
                <section className="flex-1 flex flex-col relative">
                  <div className="px-8 py-5 border-b border-mentis-yellow/40 flex items-center justify-center">
                    <h3 className="text-sm md:text-base font-semibold text-mentis-navy tracking-[0.25em] uppercase">
                      {subjects.find((s) => s.id === selectedSubjectId)?.name}
                    </h3>
                  </div>

                  <div className="flex-1 flex flex-col py-4 gap-4 pr-0">
                    <div
                      ref={messagesContainerRef}
                      className={`flex-1 max-h-[calc(100vh-260px)] overflow-y-auto pl-4 md:pl-8 pr-4 pb-4 scrollbar-mentis ${
                        currentMessages.length === 0 ? 'flex items-center justify-center' : ''
                      }`}
                    >
                      <div className={`w-full max-w-3xl ${currentMessages.length === 0 ? 'mx-auto' : 'mx-auto'}`}>
                        {currentMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center w-full">
                            <p className="text-xl md:text-2xl font-semibold text-mentis-navy mb-6 text-center max-w-lg">
                              {getInitialGreeting(selectedSubjectName)}
                            </p>
                            <p className="text-sm text-mentis-navy/60 mb-4 text-center">
                              Indica el tema concreto (ej: áreas, integrales, funciones) para empezar.
                            </p>
                            <form
                              className="w-full max-w-xl"
                              onSubmit={async (e) => {
                                e.preventDefault()
                                if (!chatPrompt.trim() || isSending) return
                                let chatId = selectedChatId
                                if (!chatId) {
                                  const subjectId = selectedSubjectId || 'language'
                                  chatId = `${subjectId}-${Date.now()}`
                                  const subjectName = subjects.find((s) => s.id === subjectId)?.name || 'Chat'
                                  const newSession: ChatSession = {
                                    id: chatId,
                                    title: `Nuevo chat · ${subjectName}`,
                                    updatedAt: 'Ahora mismo',
                                  }
                                  setChatSessions((prev) => ({
                                    ...prev,
                                    [subjectId]: [newSession, ...(prev[subjectId] || [])],
                                  }))
                                  setSelectedChatId(chatId)
                                  setSidebarMode('chats')
                                  setGuidedStateByChatId((prev) => ({
                                    ...prev,
                                    [chatId!]: { phase: 'idle', context: { subject: selectedSubjectName } },
                                  }))
                                }
                                const userMessage = chatPrompt.trim()
                                setChatPrompt('')
                                setChatMessages((prev) => ({
                                  ...prev,
                                  [chatId]: [
                                    ...(prev[chatId] || []),
                                    { role: 'user', content: userMessage },
                                  ],
                                }))
                                syncProgressToApi({ lastChatAt: new Date().toISOString() })
                                try {
                                  setIsSending(true)
                                  const state = guidedStateByChatId[chatId] ?? { phase: 'idle', context: {} }
                                  const nextMessages = [...(chatMessages[chatId] || []), { role: 'user' as const, content: userMessage }]
                                  const res = await fetch('/api/mentor-chat', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      phase: state.phase,
                                      context: apiContext,
                                      messages: nextMessages,
                                      requestingHint: false,
                                    }),
                                  })
                                  if (!res.ok) throw new Error('Chat request failed')
                                  const data = await res.json()
                                  const reply = data?.reply ?? 'No he podido responder. Inténtalo de nuevo.'
                                  setChatMessages((prev) => ({
                                    ...prev,
                                    [chatId]: [
                                      ...(prev[chatId] || []),
                                      { role: 'assistant', content: reply },
                                    ],
                                  }))
                                  const nextPhase = data?.nextPhase ?? (state.phase === 'idle' ? 'defining_context' : state.phase)
                                  const contextUpdate = data?.contextUpdate ?? {}
                                  setGuidedStateByChatId((prev) => ({
                                    ...prev,
                                    [chatId]: {
                                      phase: nextPhase,
                                      context: { ...state.context, ...contextUpdate },
                                    },
                                  }))
                                  const points = data?.addPoints ?? 0
                                  if (points > 0) setPrPoints((p) => p + points)
                                } catch (err) {
                                  console.error(err)
                                  setChatMessages((prev) => ({
                                    ...prev,
                                    [chatId]: [
                                      ...(prev[chatId] || []),
                                      { role: 'assistant', content: 'Error al contactar con Mentis. Inténtalo de nuevo.' },
                                    ],
                                  }))
                                } finally {
                                  setIsSending(false)
                                }
                              }}
                            >
                              <div className="relative rounded-full bg-white border border-mentis-yellow/60 text-mentis-navy flex items-center px-4 py-3 shadow-sm gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSymbolPickerOpen((o) => !o)}
                                  className="shrink-0 w-9 h-9 rounded-full bg-mentis-yellow/30 hover:bg-mentis-yellow/50 text-mentis-navy font-bold text-lg flex items-center justify-center transition-colors"
                                  aria-label="Insertar símbolo"
                                >
                                  +
                                </button>
                                {symbolPickerOpen && (
                                  <div className="absolute bottom-full left-0 mb-2 p-3 rounded-xl bg-white border border-mentis-yellow/50 shadow-lg z-10 grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto">
                                    {SPECIAL_SYMBOLS.map((sym) => (
                                      <button
                                        key={sym}
                                        type="button"
                                        onClick={() => {
                                          setChatPrompt((p) => p + sym)
                                          setSymbolPickerOpen(false)
                                        }}
                                        className="w-8 h-8 rounded-lg bg-mentis-navy/5 hover:bg-mentis-yellow/40 text-mentis-navy text-sm font-medium"
                                      >
                                        {sym}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <input
                                  type="text"
                                  value={chatPrompt}
                                  onChange={(e) => setChatPrompt(e.target.value)}
                                  placeholder="Ej: Geometría, Integrales…"
                                  className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder:text-mentis-navy/40"
                                />
                                <button
                                  type="submit"
                                  disabled={isSending}
                                  className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-mentis-navy/70 hover:text-mentis-navy disabled:opacity-40"
                                >
                                  {isSending ? 'Enviando…' : 'Enviar'}
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <>
                            {currentMessages.map((m, idx) => (
                              <div
                                key={idx}
                                ref={idx === currentMessages.length - 1 ? lastMessageRef : null}
                                className={`flex w-full max-w-3xl mb-7 last:mb-2 ${
                                  m.role === 'user'
                                    ? 'justify-end'
                                    : 'justify-start'
                                }`}
                              >
                                {m.role === 'user' ? (
                                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 shadow-md bg-mentis-navy text-white text-sm md:text-base leading-relaxed">
                                    {m.content}
                                  </div>
                                ) : (
                                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[#FFF7E6] border border-mentis-yellow/40 text-mentis-navy text-sm md:text-base leading-relaxed whitespace-pre-wrap shadow-sm">
                                    {m.content}
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    {currentMessages.length > 0 && selectedChatId && (
                      <div className="w-full max-w-3xl mx-auto pl-4 md:pl-8 space-y-3">
                        <form
                          className="w-full"
                          onSubmit={async (e) => {
                            e.preventDefault()
                            if (!chatPrompt.trim() || isSending || !selectedChatId) return
                            const chatId = selectedChatId
                            const userMessage = chatPrompt.trim()
                            setChatPrompt('')
                            setChatMessages((prev) => ({
                              ...prev,
                              [chatId]: [
                                ...(prev[chatId] || []),
                                { role: 'user', content: userMessage },
                              ],
                            }))
                            try {
                              setIsSending(true)
                              const state = guidedStateByChatId[chatId] ?? { phase: 'idle', context: {} }
                              const nextMessages = [...(chatMessages[chatId] || []), { role: 'user' as const, content: userMessage }]
                              const res = await fetch('/api/mentor-chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  phase: state.phase,
                                  context: apiContext,
                                  messages: nextMessages,
                                  requestingHint: false,
                                }),
                              })
                              if (!res.ok) throw new Error('Chat request failed')
                              const data = await res.json()
                              const reply = data?.reply ?? 'No he podido responder. Inténtalo de nuevo.'
                              setChatMessages((prev) => ({
                                ...prev,
                                [chatId]: [
                                  ...(prev[chatId] || []),
                                  { role: 'assistant', content: reply },
                                ],
                              }))
                              const nextPhase = data?.nextPhase ?? state.phase
                              const contextUpdate = data?.contextUpdate ?? {}
                              setGuidedStateByChatId((prev) => ({
                                ...prev,
                                [chatId]: {
                                  phase: nextPhase,
                                  context: { ...state.context, ...contextUpdate },
                                },
                              }))
                              const points = data?.addPoints ?? 0
                              if (points > 0) setPrPoints((p) => p + points)
                            } catch (err) {
                              console.error(err)
                              setChatMessages((prev) => ({
                                ...prev,
                                [chatId]: [
                                  ...(prev[chatId] || []),
                                  { role: 'assistant', content: 'Error al contactar con Mentis. Inténtalo de nuevo.' },
                                ],
                              }))
                            } finally {
                              setIsSending(false)
                            }
                          }}
                        >
                          <div className="relative rounded-full bg-white border border-mentis-yellow/60 text-mentis-navy flex items-center px-4 py-3 shadow-sm gap-2">
                            <button
                              type="button"
                              onClick={() => setSymbolPickerOpen((o) => !o)}
                              className="shrink-0 w-9 h-9 rounded-full bg-mentis-yellow/30 hover:bg-mentis-yellow/50 text-mentis-navy font-bold text-lg flex items-center justify-center transition-colors"
                              aria-label="Insertar símbolo"
                            >
                              +
                            </button>
                            {symbolPickerOpen && (
                              <div className="absolute bottom-full left-0 mb-2 p-3 rounded-xl bg-white border border-mentis-yellow/50 shadow-lg z-10 grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto">
                                {SPECIAL_SYMBOLS.map((sym) => (
                                  <button
                                    key={sym}
                                    type="button"
                                    onClick={() => {
                                      setChatPrompt((p) => p + sym)
                                      setSymbolPickerOpen(false)
                                    }}
                                    className="w-8 h-8 rounded-lg bg-mentis-navy/5 hover:bg-mentis-yellow/40 text-mentis-navy text-sm font-medium"
                                  >
                                    {sym}
                                  </button>
                                ))}
                              </div>
                            )}
                            <input
                              type="text"
                              value={chatPrompt}
                              onChange={(e) => setChatPrompt(e.target.value)}
                              placeholder="Escribe tu razonamiento o respuesta…"
                              className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder:text-mentis-navy/40"
                            />
                            <button
                              type="submit"
                              disabled={isSending}
                              className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-mentis-navy/70 hover:text-mentis-navy disabled:opacity-40"
                            >
                              {isSending ? 'Enviando…' : 'Enviar'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </section>
              </section>
            )}
          </>
        ) : (
          // Assignments: KPIs de progreso para el alumno (mismo estilo que Missions)
          <section className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-mentis-navy/60 mb-2">
                Bienvenue, {studentName}
              </p>
              <h1 className="text-4xl md:text-5xl font-extrabold text-mentis-navy tracking-wide mb-4">
                ASSIGNMENTS
              </h1>
              <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-mentis-navy/55">
                Tu progreso y métricas con Mentis
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-[32px] bg-white shadow-md border border-mentis-yellow/40 px-6 py-6 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/60 mb-1">
                  Puntos PR
                </p>
                <p className="text-3xl font-extrabold text-mentis-navy mt-1">{prPoints}</p>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Puntos por respuestas y progreso con Mentis
                </p>
              </div>
              <div className="rounded-[32px] bg-mentis-yellow/20 border-2 border-mentis-yellow/50 shadow-md px-6 py-6 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/90 mb-1">
                  Racha
                </p>
                <p className="text-3xl font-extrabold text-mentis-navy mt-1">{streak}</p>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Mantén la racha para sumar más
                </p>
              </div>
              <div className="rounded-[32px] bg-white shadow-md border border-mentis-yellow/40 px-6 py-6 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 mb-1">
                  Pistas usadas
                </p>
                <p className="text-3xl font-extrabold text-mentis-navy mt-1">{hintsUsed}</p>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Pedir ayuda está bien; úsalas cuando las necesites
                </p>
              </div>
              <div className="rounded-[32px] bg-mentis-navy/5 border border-mentis-yellow/40 shadow-md px-6 py-6 flex flex-col sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 mb-1">
                  Rastro de pensamiento
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-3 rounded-full bg-mentis-navy/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-mentis-yellow transition-all duration-300"
                      style={{ width: `${thoughtTracePercent}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-mentis-navy w-10">{thoughtTracePercent}%</span>
                </div>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Cuánto has trabajado el razonamiento
                </p>
              </div>
              <div className="rounded-[32px] bg-white shadow-md border border-mentis-yellow/40 px-6 py-6 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 mb-1">
                  Chats realizados
                </p>
                <p className="text-3xl font-extrabold text-mentis-navy mt-1">
                  {Object.values(chatSessions).reduce((acc, list) => acc + list.length, 0)}
                </p>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Sesiones de práctica con Mentis
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[32px] bg-white shadow-md border border-mentis-yellow/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/60">
                  Por asignatura
                </p>
              </div>
              <ul className="divide-y divide-mentis-yellow/20">
                {subjects.map((s) => {
                  const count = (chatSessions[s.id] || []).length
                  return (
                    <li key={s.id} className="px-6 py-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-mentis-navy uppercase tracking-wide">
                        {s.name}
                      </span>
                      <span className="text-xl font-bold text-mentis-navy">{count}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        )}

        {/* Simple inline modal for creating a theme */}
        {showNewTheme && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-mentis-navy">
                  Crear nuevo target
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewTheme(false)}
                  className="text-sm text-mentis-navy/60 hover:text-mentis-navy"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={handleCreateTheme} className="space-y-4">
                <div>
                  <label
                    htmlFor="themeNameTarget"
                    className="block text-xs font-medium text-mentis-navy mb-1 uppercase tracking-wide"
                  >
                    Nombre del target
                  </label>
                  <input
                    id="themeNameTarget"
                    type="text"
                    required
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none text-sm"
                    placeholder="Pokémon, Lego, Animales..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTheme(false)}
                    className="px-4 py-2 text-sm rounded-full border border-gray-300 text-mentis-navy/70 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm rounded-full bg-mentis-navy text-white font-semibold hover:bg-mentis-navy/90"
                  >
                    Crear universo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
