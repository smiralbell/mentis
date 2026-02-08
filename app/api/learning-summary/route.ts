/**
 * Genera un mini resumen de lo aprendido y tips a partir del historial del chat.
 * Opcionalmente guarda el resumen en learning_summaries.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

const OPENROUTER_URL = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'
const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { messages } = body as {
      messages?: { role: string; content: string }[]
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Se necesitan mensajes del chat para generar el resumen' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter no configurado' },
        { status: 500 }
      )
    }

    const conversation = messages
      .map((m) => `${m.role === 'user' ? 'Estudiante' : 'Mentis'}: ${m.content}`)
      .join('\n\n')

    const systemPrompt = `Eres un asistente que resume sesiones de estudio. A partir de la conversación entre el estudiante y el tutor Mentis, escribe un MINI RESUMEN en español con:
1. En 2-3 frases: qué se ha trabajado y qué ha aprendido o practicado el estudiante.
2. Una lista corta de 3-5 tips o ideas clave que queden como recordatorio (bullets).
Sé conciso y claro. No inventes contenido que no esté en la conversación.`

    const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Conversación:\n\n${conversation}\n\n---\nGenera el mini resumen y los tips.`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenRouter learning-summary error', err)
      return NextResponse.json(
        { error: 'No se pudo generar el resumen' },
        { status: 500 }
      )
    }

    const data = await res.json()
    const content =
      data?.choices?.[0]?.message?.content?.trim() ??
      'No se pudo generar el resumen.'

    try {
      await prisma.learningSummary.create({
        data: {
          userId: session.user.id,
          content,
          sourceType: 'chat',
          sourceId: body.sourceId ?? null,
        },
      })
    } catch (dbErr) {
      console.error('Learning summary save error (table may not exist yet)', dbErr)
      // No fallar la petición si la tabla no existe aún
    }

    return NextResponse.json({ summary: content })
  } catch (error) {
    console.error('Learning summary API error', error)
    return NextResponse.json(
      { error: 'Error al generar el resumen' },
      { status: 500 }
    )
  }
}
