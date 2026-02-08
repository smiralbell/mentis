import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { subjectId, prompt, history } = body as {
      subjectId?: string
      prompt?: string
      history?: { role: 'user' | 'assistant'; content: string }[]
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    const openrouterBaseUrl =
      process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    const model =
      process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'

    if (!openrouterApiKey) {
      console.error('OPENROUTER_API_KEY is not configured')
      return NextResponse.json(
        { error: 'AI backend not configured' },
        { status: 500 }
      )
    }

    const subjectLabel = subjectId ?? 'language'

    const messages = [
      {
        role: 'system',
        content:
          'Eres Mentis Tutor, una IA pedagógica para estudiantes de primaria. ' +
          'Responde de forma clara, breve y con ejemplos sencillos. Mantén un tono amable y motivador.',
      },
      ...(history ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: 'user',
        content: `Asignatura: ${subjectLabel}. Pregunta del estudiante: ${prompt}`,
      },
    ]

    const response = await fetch(`${openrouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter error', errorText)
      return NextResponse.json(
        { error: 'AI request failed' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const reply =
      data?.choices?.[0]?.message?.content ??
      'Lo siento, ahora mismo no puedo responder. Inténtalo de nuevo en unos segundos.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Student chat API error', error)
    return NextResponse.json(
      { error: 'Unexpected error in chat endpoint' },
      { status: 500 }
    )
  }
}


