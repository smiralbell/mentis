import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

/**
 * POST: El estudiante actualiza su propio progreso (puntos, última actividad, racha, pistas).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const prPoints = typeof body.prPoints === 'number' ? body.prPoints : undefined
    const lastChatAt = body.lastChatAt != null ? new Date(body.lastChatAt) : undefined
    const streak = typeof body.streak === 'number' ? body.streak : undefined
    const hintsUsed = typeof body.hintsUsed === 'number' ? body.hintsUsed : undefined

    const userId = session.user.id

    const data: { prPoints?: number; lastChatAt?: Date | null; streak?: number; hintsUsed?: number; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (prPoints !== undefined) data.prPoints = prPoints
    if (lastChatAt !== undefined) data.lastChatAt = lastChatAt
    if (streak !== undefined) data.streak = streak
    if (hintsUsed !== undefined) data.hintsUsed = hintsUsed

    await prisma.studentProgress.upsert({
      where: { userId },
      create: {
        userId,
        prPoints: data.prPoints ?? 0,
        lastChatAt: data.lastChatAt ?? null,
        streak: data.streak ?? 0,
        hintsUsed: data.hintsUsed ?? 0,
      },
      update: data,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Student progress API error:', e)
    return NextResponse.json(
      { error: 'Error saving progress' },
      { status: 500 }
    )
  }
}
