import { NextResponse } from 'next/server'
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

const DAYS_FOR_SEGMENT = 14

function learningLevelFromPoints(prPoints: number, hasActivity: boolean): 'sin_actividad' | 'bajo' | 'medio' | 'alto' {
  if (!hasActivity) return 'sin_actividad'
  if (prPoints >= 150) return 'alto'
  if (prPoints >= 50) return 'medio'
  if (prPoints >= 1) return 'bajo'
  return 'sin_actividad'
}

/**
 * GET: List students and recent learning summaries for the current org.
 * Enriches each student with segment, flags, and learningLevel for the table.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = session.user.role
    if (role !== 'ORGANIZATION_ADMIN' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const organizationId = session.user.organizationId

    const studentsRaw = await prisma.user.findMany({
      where: { organizationId, role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })

    let progressMap: Record<string, { prPoints: number; lastChatAt: Date | null; streak: number; hintsUsed: number }> = {}
    try {
      const progressList = await prisma.studentProgress.findMany({
        where: { userId: { in: studentsRaw.map((s) => s.id) } },
        select: {
          userId: true,
          prPoints: true,
          lastChatAt: true,
          streak: true,
          hintsUsed: true,
        },
      })
      progressList.forEach((p) => {
        progressMap[p.userId] = {
          prPoints: p.prPoints,
          lastChatAt: p.lastChatAt,
          streak: p.streak,
          hintsUsed: p.hintsUsed,
        }
      })
    } catch (_) {
      // Tabla student_progress puede no existir aún
    }

    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(periodStart.getDate() - DAYS_FOR_SEGMENT)
    const periodStartPrev = new Date(periodStart)
    periodStartPrev.setDate(periodStartPrev.getDate() - DAYS_FOR_SEGMENT)

    let summariesInPeriod: { userId: string }[] = []
    let summariesPrevPeriod: { userId: string }[] = []
    try {
      const allSummaries = await prisma.learningSummary.findMany({
        where: { user: { organizationId, role: 'STUDENT' } },
        select: { userId: true, createdAt: true },
      })
      summariesInPeriod = allSummaries.filter((s) => s.createdAt >= periodStart).map((s) => ({ userId: s.userId }))
      summariesPrevPeriod = allSummaries
        .filter((s) => s.createdAt >= periodStartPrev && s.createdAt < periodStart)
        .map((s) => ({ userId: s.userId }))
    } catch (_) {}

    const students = studentsRaw.map((s) => {
      const p = progressMap[s.id]
      const prPoints = p?.prPoints ?? 0
      const lastChatAt = p?.lastChatAt ?? null
      const streak = p?.streak ?? 0
      const hintsUsed = p?.hintsUsed ?? 0
      const sessionCount = summariesInPeriod.filter((sum) => sum.userId === s.id).length
      const summariesPrev = summariesPrevPeriod.filter((sum) => sum.userId === s.id).length
      const hintsAvg = sessionCount > 0 ? Math.round((hintsUsed / sessionCount) * 10) / 10 : hintsUsed

      const lastChatDays = lastChatAt
        ? Math.floor((now.getTime() - new Date(lastChatAt).getTime()) / (24 * 60 * 60 * 1000))
        : 999

      const flags: string[] = []
      if (hintsAvg >= HIGH_HINTS_AVG && sessionCount > 0) flags.push('dependencia_alta')
      if (
        sessionCount >= STAGNATION_SESSIONS_MIN &&
        summariesPrev >= STAGNATION_SESSIONS_MIN &&
        prPoints < STAGNATION_POINTS_GROWTH_MAX
      )
        flags.push('estancamiento')
      if (lastChatDays >= INACTIVE_DAYS_14) flags.push('inactivo_14d')
      else if (lastChatDays >= INACTIVE_DAYS) flags.push('inactivo_7d')

      let segment: 'autonomo' | 'constante_dependiente' | 'intermitente' | 'sin_actividad' = 'sin_actividad'
      if (sessionCount === 0 && !lastChatAt) segment = 'sin_actividad'
      else if (hintsAvg <= SEGMENT_HINTS_LOW && prPoints > 0) segment = 'autonomo'
      else if (streak >= SEGMENT_STREAK_MIN && hintsAvg >= SEGMENT_HINTS_HIGH) segment = 'constante_dependiente'
      else if (sessionCount > 0 || lastChatAt) segment = 'intermitente'

      const hasActivity = sessionCount > 0 || !!lastChatAt
      const learningLevel = learningLevelFromPoints(prPoints, hasActivity)

      return {
        ...s,
        prPoints,
        lastChatAt: lastChatAt?.toISOString() ?? null,
        streak,
        hintsUsed,
        segment,
        flags,
        learningLevel,
      }
    })

    let summaries: Awaited<ReturnType<typeof prisma.learningSummary.findMany>> = []
    try {
      summaries = await prisma.learningSummary.findMany({
        where: {
          user: { organizationId, role: 'STUDENT' },
        },
        select: {
          id: true,
          userId: true,
          content: true,
          sourceType: true,
          sourceId: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    } catch (summaryError: unknown) {
      const code = (summaryError as { code?: string })?.code
      if (code !== 'P2021') {
        console.error('Organization summaries query error:', summaryError)
        return NextResponse.json(
          { error: 'Error loading summaries' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      students,
      summaries,
      totalStudents: students.length,
    })
  } catch (e) {
    console.error('Organization students API error:', e)
    return NextResponse.json(
      { error: 'Error loading organization data' },
      { status: 500 }
    )
  }
}
