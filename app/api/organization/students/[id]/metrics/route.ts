import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

function assertOrganizer(session: { user?: { organizationId?: string; role?: string } } | null) {
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = session.user.role
  if (role !== 'ORGANIZATION_ADMIN' && role !== 'TEACHER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/**
 * GET: Métricas agregadas del estudiante para el panel detalle.
 * - sesiones_14d (count de resúmenes últimos 14 días como proxy de sesiones)
 * - hints_total, hints_por_sesion (avg)
 * - last_chat_at
 * - tendencia_actividad (últimos 7d vs 7d previos)
 * - errores_frecuentes: placeholder "N/A" (TODO: tags cuando existan)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const authError = assertOrganizer(session)
    if (authError) return authError

    const { id: studentId } = await params

    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        organizationId: session!.user!.organizationId,
        role: 'STUDENT',
      },
    })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const now = new Date()
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

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

    let summariesLast14: { createdAt: Date }[] = []
    try {
      summariesLast14 = await prisma.learningSummary.findMany({
        where: {
          userId: studentId,
          createdAt: { gte: fourteenDaysAgo },
        },
        select: { createdAt: true },
      })
    } catch (_) {}

    const summariesLast7 = summariesLast14.filter((s) => s.createdAt >= sevenDaysAgo)
    const summariesPrev7 = summariesLast14.filter((s) => s.createdAt < sevenDaysAgo)

    const sesiones_14d = summariesLast14.length
    const hints_total = progress.hintsUsed
    const hints_por_sesion = sesiones_14d > 0 ? Math.round((hints_total / sesiones_14d) * 10) / 10 : 0
    const tendencia_actividad = summariesPrev7.length - summariesLast7.length // positivo = más actividad antes
    const errores_frecuentes = 'N/A' // TODO: cuando existan tags/errores por concepto

    return NextResponse.json({
      sesiones_14d,
      hints_total,
      hints_por_sesion,
      last_chat_at: progress.lastChatAt,
      streak: progress.streak,
      pr_points: progress.prPoints,
      errores_frecuentes,
      tendencia_actividad,
      resumenes_ultimos_7d: summariesLast7.length,
      resumenes_7d_previos: summariesPrev7.length,
    })
  } catch (e) {
    console.error('Organization student metrics API error:', e)
    return NextResponse.json(
      { error: 'Error loading metrics' },
      { status: 500 }
    )
  }
}
