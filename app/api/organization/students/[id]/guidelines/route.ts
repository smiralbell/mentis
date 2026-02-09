import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

const TEACHER_PROMPT_MAX_LENGTH = 1000

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
 * PATCH: Actualizar mini-prompt del profesor y/o notas privadas (solo organizador).
 */
export async function PATCH(
  request: NextRequest,
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

    const body = await request.json()
    let teacherPrompt: string | null | undefined = body.teacherPrompt
    const privateNotes: string | null | undefined = body.privateNotes

    if (teacherPrompt !== undefined) {
      if (typeof teacherPrompt !== 'string') teacherPrompt = null
      else {
        teacherPrompt = teacherPrompt.trim()
        if (teacherPrompt.length > TEACHER_PROMPT_MAX_LENGTH) {
          teacherPrompt = teacherPrompt.slice(0, TEACHER_PROMPT_MAX_LENGTH)
        }
        if (teacherPrompt === '') teacherPrompt = null
      }
    }

    let privateNotesVal: string | null = null
    if (privateNotes !== undefined) {
      if (typeof privateNotes !== 'string') privateNotesVal = null
      else privateNotesVal = privateNotes.trim() || null
    }

    const data: { teacherPrompt?: string | null; privateNotes?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (teacherPrompt !== undefined) data.teacherPrompt = teacherPrompt
    if (privateNotes !== undefined) data.privateNotes = privateNotesVal

    const updated = await prisma.studentTeacherGuidelines.upsert({
      where: { studentId },
      create: {
        studentId,
        teacherPrompt: data.teacherPrompt ?? null,
        privateNotes: data.privateNotes ?? null,
      },
      update: data,
    })

    return NextResponse.json({
      teacherPrompt: updated.teacherPrompt,
      privateNotes: updated.privateNotes,
      updatedAt: updated.updatedAt,
    })
  } catch (e) {
    console.error('Organization student guidelines PATCH error:', e)
    return NextResponse.json(
      { error: 'Error updating guidelines' },
      { status: 500 }
    )
  }
}
