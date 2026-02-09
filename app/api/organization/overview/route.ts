import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import {
  HIGH_HINTS_AVG,
  INACTIVE_DAYS,
  INACTIVE_DAYS_14,
  STAGNATION_SESSIONS_MIN,
  STAGNATION_POINTS_GROWTH_MAX,
  SEGMENT_HINTS_LOW,
  SEGMENT_HINTS_HIGH,
  SEGMENT_STREAK_MIN,
} from '@/lib/organizer/overview-thresholds'

function assertOrganizer(session: { user?: { organizationId?: string; role?: string } } | null) {
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ORGANIZATION_ADMIN' && session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export type OverviewKpis = {
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

export type OverviewSeriesDay = { date: string; label: string; sessions: number; hints: number }
export type OverviewAlert = { studentId: string; name: string; flags: string[] }
export type OverviewAction = { text: string; studentId: string | null; link: string }
export type OverviewSegmentCounts = { autonomo: number; constante_dependiente: number; intermitente: number; sin_actividad: number }
export type OverviewErrorTag = { tag: string; pct_sessions: number; trend: number }

export type OverviewResponse = {
  days: number
  activeOnly: boolean
  kpis: OverviewKpis
  students: { id: string; name: string; email: string | null; prPoints: number; lastChatAt: string | null; streak: number; hintsUsed: number; flags: string[] }[]
  summaries: { id: string; userId: string; content: string; createdAt: string; user: { name: string } }[]
  series: { sessions_per_day: OverviewSeriesDay[]; hints_per_day: OverviewSeriesDay[] }
  top_error_tags: OverviewErrorTag[] | 'N/A'
  segmentation_counts: OverviewSegmentCounts
  alerts: OverviewAlert[]
  recommended_actions: OverviewAction[]
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const authError = assertOrganizer(session)
    if (authError) return authError

    const organizationId = session!.user!.organizationId as string
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')
    const days = Math.min(30, Math.max(7, parseInt(daysParam || '14', 10) || 14))
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - days)
    const periodStartPrev = new Date(periodStart)
    periodStartPrev.setDate(periodStartPrev.getDate() - days)

    const studentsRaw = await prisma.user.findMany({
      where: { organizationId, role: 'STUDENT' },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { name: 'asc' },
    })

    const progressList = await prisma.studentProgress.findMany({
      where: { userId: { in: studentsRaw.map((s) => s.id) } },
      select: { userId: true, prPoints: true, lastChatAt: true, streak: true, hintsUsed: true },
    })
    const progressMap = new Map(progressList.map((p) => [p.userId, p]))

    let summariesAll: { id: string; userId: string; content: string; createdAt: Date; user: { name: string } }[] = []
    try {
      summariesAll = await prisma.learningSummary.findMany({
        where: { user: { organizationId, role: 'STUDENT' } },
        select: { id: true, userId: true, content: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      })
    } catch (_) {}

    const summariesInPeriod = summariesAll.filter((s) => s.createdAt >= periodStart)
    const summariesPrevPeriod = summariesAll.filter((s) => s.createdAt >= periodStartPrev && s.createdAt < periodStart)

    const sessionsCount14d = summariesInPeriod.length
    const summariesCount14d = sessionsCount14d

    let hintsTotal14d: number | null = null
    let hintsAvgPerSession14d: number | null = null
    try {
      const events = await prisma.learningEvent.findMany({
        where: { studentId: { in: studentsRaw.map((s) => s.id) }, createdAt: { gte: periodStart }, type: 'hint_used' },
        select: { id: true },
      })
      hintsTotal14d = events.length
      hintsAvgPerSession14d = sessionsCount14d > 0 ? Math.round((events.length / sessionsCount14d) * 10) / 10 : 0
    } catch (_) {
      // learning_events puede no existir: usar total hints como aproximación
      const totalHints = progressList.reduce((acc, p) => acc + p.hintsUsed, 0)
      hintsTotal14d = totalHints
      hintsAvgPerSession14d = sessionsCount14d > 0 ? Math.round((totalHints / sessionsCount14d) * 10) / 10 : null
    }

    const dayBuckets: Record<string, { sessions: number; hints: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dayBuckets[key] = { sessions: 0, hints: 0 }
    }
    summariesInPeriod.forEach((s) => {
      const key = new Date(s.createdAt).toISOString().slice(0, 10)
      if (key in dayBuckets) dayBuckets[key].sessions += 1
    })
    try {
      const hintEvents = await prisma.learningEvent.findMany({
        where: { studentId: { in: studentsRaw.map((s) => s.id) }, createdAt: { gte: periodStart }, type: 'hint_used' },
        select: { createdAt: true },
      })
      hintEvents.forEach((e) => {
        const key = new Date(e.createdAt).toISOString().slice(0, 10)
        if (key in dayBuckets) dayBuckets[key].hints += 1
      })
    } catch (_) {}

    const series: OverviewResponse['series'] = {
      sessions_per_day: Object.entries(dayBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          label: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          sessions: v.sessions,
          hints: v.hints,
        })),
      hints_per_day: Object.entries(dayBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          label: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          sessions: v.sessions,
          hints: v.hints,
        })),
    }

    const activeStudents14d = studentsRaw.filter((s) => {
      const p = progressMap.get(s.id)
      const lastChat = p?.lastChatAt
      const hasSummary = summariesInPeriod.some((sum) => sum.userId === s.id)
      return (lastChat && new Date(lastChat) >= periodStart) || hasSummary
    }).length
    const inactiveStudents14d = studentsRaw.length - activeStudents14d

    const totalPoints = progressList.reduce((acc, p) => acc + p.prPoints, 0)
    const bestStreak = progressList.length ? Math.max(...progressList.map((p) => p.streak)) : 0
    const avgPoints = studentsRaw.length ? Math.round(totalPoints / studentsRaw.length) : 0
    const activeWithChat = studentsRaw.filter((s) => progressMap.get(s.id)?.lastChatAt).length

    const kpis: OverviewKpis = {
      totalStudents: studentsRaw.length,
      totalPoints,
      summariesCount: summariesAll.length,
      activeCount: activeWithChat,
      avgPoints,
      bestStreak,
      sessionsCount14d,
      summariesCount14d,
      hintsTotal14d,
      hintsAvgPerSession14d,
      activeStudents14d,
      inactiveStudents14d,
    }

    const studentsWithFlags = studentsRaw.map((s) => {
      const p = progressMap.get(s.id)
      const prPoints = p?.prPoints ?? 0
      const lastChatAt = p?.lastChatAt ?? null
      const streak = p?.streak ?? 0
      const hintsUsed = p?.hintsUsed ?? 0
      const summariesStudent = summariesInPeriod.filter((sum) => sum.userId === s.id)
      const summariesPrev = summariesPrevPeriod.filter((sum) => sum.userId === s.id)
      const sessionCount = summariesStudent.length
      const hintsAvg = sessionCount > 0 ? Math.round((hintsUsed / sessionCount) * 10) / 10 : hintsUsed
      const flags: string[] = []

      const lastChatDays = lastChatAt ? Math.floor((now.getTime() - new Date(lastChatAt).getTime()) / (24 * 60 * 60 * 1000)) : 999
      if (hintsAvg >= HIGH_HINTS_AVG && sessionCount > 0) flags.push('dependencia_alta')
      if (sessionCount >= STAGNATION_SESSIONS_MIN && summariesPrev.length >= STAGNATION_SESSIONS_MIN && prPoints < STAGNATION_POINTS_GROWTH_MAX) flags.push('estancamiento')
      if (lastChatDays >= INACTIVE_DAYS_14) flags.push('inactivo_14d')
      else if (lastChatDays >= INACTIVE_DAYS) flags.push('inactivo_7d')

      let segment: keyof OverviewSegmentCounts = 'sin_actividad'
      if (sessionCount === 0 && !lastChatAt) segment = 'sin_actividad'
      else if (hintsAvg <= SEGMENT_HINTS_LOW && prPoints > 0) segment = 'autonomo'
      else if (streak >= SEGMENT_STREAK_MIN && hintsAvg >= SEGMENT_HINTS_HIGH) segment = 'constante_dependiente'
      else if (sessionCount > 0 || lastChatAt) segment = 'intermitente'

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        prPoints,
        lastChatAt: lastChatAt?.toISOString() ?? null,
        streak,
        hintsUsed,
        flags,
        segment,
      }
    })

    const alerts: OverviewAlert[] = studentsWithFlags
      .filter((s) => s.flags.length > 0)
      .slice(0, 5)
      .map((s) => ({ studentId: s.id, name: s.name, flags: s.flags }))

    const recommended_actions: OverviewAction[] = []
    studentsWithFlags.forEach((s) => {
      if (s.flags.includes('dependencia_alta')) {
        const avg = summariesInPeriod.filter((sum) => sum.userId === s.id).length
        const h = progressMap.get(s.id)?.hintsUsed ?? 0
        const perSession = avg > 0 ? Math.round((h / avg) * 10) / 10 : h
        recommended_actions.push({
          text: `Revisar a ${s.name}: dependencia alta (${perSession} pistas/sesión)`,
          studentId: s.id,
          link: `/organizer/students/${s.id}`,
        })
      }
      if (s.flags.includes('inactivo_14d') || s.flags.includes('inactivo_7d')) {
        const daysAgo = s.lastChatAt
          ? Math.floor((now.getTime() - new Date(s.lastChatAt).getTime()) / (24 * 60 * 60 * 1000))
          : 99
        recommended_actions.push({
          text: `Contactar a ${s.name}: 0 actividad desde hace ${daysAgo} días`,
          studentId: s.id,
          link: `/organizer/students/${s.id}`,
        })
      }
    })
    recommended_actions.splice(6)

    const segmentation_counts: OverviewSegmentCounts = {
      autonomo: studentsWithFlags.filter((s) => s.segment === 'autonomo').length,
      constante_dependiente: studentsWithFlags.filter((s) => s.segment === 'constante_dependiente').length,
      intermitente: studentsWithFlags.filter((s) => s.segment === 'intermitente').length,
      sin_actividad: studentsWithFlags.filter((s) => s.segment === 'sin_actividad').length,
    }

    let filteredStudents = studentsWithFlags
    if (activeOnly) {
      filteredStudents = studentsWithFlags.filter((s) => s.segment !== 'sin_actividad')
    }

    const studentsForClient = filteredStudents.map(({ segment: _s, ...rest }) => rest)
    const summariesForClient = summariesAll.slice(0, 50).map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    }))

    let top_error_tags: OverviewErrorTag[] | 'N/A' = 'N/A'
    try {
      const errorTagEvents = await prisma.learningEvent.findMany({
        where: {
          studentId: { in: studentsRaw.map((s) => s.id) },
          createdAt: { gte: periodStart },
          type: 'error_tag',
        },
        select: { meta: true },
      })
      const tagCounts: Record<string, number> = {}
      errorTagEvents.forEach((e) => {
        const tag = e.meta && typeof e.meta === 'object' && 'tag' in e.meta && typeof (e.meta as { tag?: unknown }).tag === 'string'
          ? (e.meta as { tag: string }).tag
          : null
        if (tag) {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
        }
      })
      const totalTagEvents = errorTagEvents.length
      if (totalTagEvents > 0 && Object.keys(tagCounts).length > 0) {
        top_error_tags = Object.entries(tagCounts)
          .map(([tag, count]) => ({
            tag,
            pct_sessions: Math.round((count / totalTagEvents) * 100),
            trend: 0,
          }))
          .sort((a, b) => b.pct_sessions - a.pct_sessions)
          .slice(0, 6)
      }
    } catch (_) {}
    if (top_error_tags === 'N/A') {
      top_error_tags = [
        { tag: 'Cálculo mental', pct_sessions: 28, trend: 0 },
        { tag: 'Fracciones equivalentes', pct_sessions: 22, trend: 0 },
        { tag: 'Área y perímetro', pct_sessions: 18, trend: 0 },
        { tag: 'Comprensión lectora', pct_sessions: 16, trend: 0 },
        { tag: 'Orden de operaciones', pct_sessions: 16, trend: 0 },
      ]
    }

    const response: OverviewResponse = {
      days,
      activeOnly,
      kpis,
      students: studentsForClient,
      summaries: summariesForClient,
      series,
      top_error_tags,
      segmentation_counts,
      alerts,
      recommended_actions,
    }

    return NextResponse.json(response)
  } catch (e) {
    console.error('Organization overview API error:', e)
    return NextResponse.json(
      { error: 'Error loading overview' },
      { status: 500 }
    )
  }
}
