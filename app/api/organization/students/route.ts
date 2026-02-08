import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

/**
 * GET: List students and recent learning summaries for the current org.
 * Only ORGANIZATION_ADMIN and TEACHER can access.
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

    const students = studentsRaw.map((s) => ({
      ...s,
      prPoints: progressMap[s.id]?.prPoints ?? 0,
      lastChatAt: progressMap[s.id]?.lastChatAt ?? null,
      streak: progressMap[s.id]?.streak ?? 0,
      hintsUsed: progressMap[s.id]?.hintsUsed ?? 0,
    }))

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
