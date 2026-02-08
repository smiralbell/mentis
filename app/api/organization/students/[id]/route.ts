import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

/**
 * GET: Detalle de un estudiante de la organización (solo ORGANIZATION_ADMIN / TEACHER).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = session.user.role
    if (role !== 'ORGANIZATION_ADMIN' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: studentId } = await params

    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        organizationId: session.user.organizationId,
        role: 'STUDENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    let progress = { prPoints: 0, lastChatAt: null as Date | null, streak: 0, hintsUsed: 0 }
    try {
      const sp = await prisma.studentProgress.findUnique({
        where: { userId: studentId },
      })
      if (sp) {
        progress = {
          prPoints: sp.prPoints,
          lastChatAt: sp.lastChatAt,
          streak: sp.streak,
          hintsUsed: sp.hintsUsed,
        }
      }
    } catch (_) {}

    let summaries: { id: string; content: string; createdAt: Date }[] = []
    try {
      const list = await prisma.learningSummary.findMany({
        where: { userId: studentId },
        select: { id: true, content: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      })
      summaries = list
    } catch (_) {}

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        createdAt: student.createdAt,
      },
      progress,
      summaries,
    })
  } catch (e) {
    console.error('Organization student detail API error:', e)
    return NextResponse.json(
      { error: 'Error loading student' },
      { status: 500 }
    )
  }
}
