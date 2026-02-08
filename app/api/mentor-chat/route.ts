/**
 * Chat pedagógico guiado: Profesor Mentis.
 * No es un chat libre. Obliga a definir contexto, actúa como profesor que guía,
 * nunca da la respuesta final. Las pistas solo cuando el alumno pulsa "Pedir ayuda".
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { buildMentorSystemPrompt } from '@/lib/mentor-chat/prompt'
import type { MentorChatPhase, MentorChatContext, MentorChatMessage } from '@/lib/mentor-chat/types'

const MENTIS_PHASE_REGEX = /<!--\s*MENTIS_PHASE=(\w+)\s*-->\s*$/
const MENTIS_CONTEXT_REGEX = /<!--\s*MENTIS_CONTEXT=([\s\S]+?)\s*-->\s*$/
const MENTIS_ADD_POINTS_REGEX = /<!--\s*MENTIS_ADD_POINTS=(\d+)\s*-->\s*$/

function stripMetadata(reply: string): {
  reply: string
  nextPhase?: MentorChatPhase
  contextUpdate?: Partial<MentorChatContext>
  addPoints?: number
} {
  let cleaned = reply.trim()
  let nextPhase: MentorChatPhase | undefined
  let contextUpdate: Partial<MentorChatContext> | undefined
  let addPoints: number | undefined

  const pointsMatch = cleaned.match(MENTIS_ADD_POINTS_REGEX)
  if (pointsMatch) {
    addPoints = Math.min(10, Math.max(0, parseInt(pointsMatch[1], 10)))
    cleaned = cleaned.replace(MENTIS_ADD_POINTS_REGEX, '').trim()
  }

  const phaseMatch = cleaned.match(MENTIS_PHASE_REGEX)
  if (phaseMatch) {
    nextPhase = phaseMatch[1] as MentorChatPhase
    cleaned = cleaned.replace(MENTIS_PHASE_REGEX, '').trim()
  }

  const contextMatch = cleaned.match(MENTIS_CONTEXT_REGEX)
  if (contextMatch) {
    try {
      contextUpdate = JSON.parse(contextMatch[1].trim()) as Partial<MentorChatContext>
      cleaned = cleaned.replace(MENTIS_CONTEXT_REGEX, '').trim()
    } catch {
      // ignore invalid JSON
    }
  }

  return { reply: cleaned, nextPhase, contextUpdate, addPoints }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      phase,
      context,
      messages,
      requestingHint = false,
    } = body as {
      phase: MentorChatPhase
      context?: MentorChatContext
      messages?: MentorChatMessage[]
      requestingHint?: boolean
    }

    if (!phase || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing phase or messages' },
        { status: 400 }
      )
    }

    const ctx: MentorChatContext = context ?? {}
    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    const openrouterBaseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'
    const model = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash'

    if (!openrouterApiKey) {
      return NextResponse.json(
        { error: 'AI backend not configured' },
        { status: 500 }
      )
    }

    const systemPrompt = buildMentorSystemPrompt(phase, ctx, requestingHint)

    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const response = await fetch(`${openrouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages: openRouterMessages }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter mentor-chat error', errText)
      return NextResponse.json(
        { error: 'AI request failed' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const rawReply =
      data?.choices?.[0]?.message?.content ??
      'No he podido generar una respuesta. Inténtalo de nuevo.'

    const { reply, nextPhase, contextUpdate, addPoints } = stripMetadata(rawReply)

    return NextResponse.json({
      reply,
      ...(nextPhase && { nextPhase }),
      ...(contextUpdate && Object.keys(contextUpdate).length > 0 && { contextUpdate }),
      ...(addPoints !== undefined && addPoints > 0 && { addPoints }),
    })
  } catch (error) {
    console.error('Mentor chat API error', error)
    return NextResponse.json(
      { error: 'Unexpected error in mentor chat' },
      { status: 500 }
    )
  }
}
