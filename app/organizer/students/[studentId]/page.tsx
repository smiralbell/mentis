'use client'

import { useParams, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const TEACHER_PROMPT_MAX = 1000
const HINTS_PER_SESSION_THRESHOLD = 4
const STAGNATION_SUMMARY_THRESHOLD = 3
const STAGNATION_POINTS_THRESHOLD = 10

type Detail = {
  student: { id: string; name: string; email: string | null; createdAt: string }
  progress: { prPoints: number; lastChatAt: string | null; streak: number; hintsUsed: number }
  guidelines: { teacherPrompt: string | null; privateNotes: string | null }
  summaries: { id: string; content: string; createdAt: string }[]
}

type Metrics = {
  sesiones_14d: number
  hints_total: number
  hints_por_sesion: number
  last_chat_at: string | null
  streak: number
  pr_points: number
  errores_frecuentes: string
  tendencia_actividad: number
  resumenes_ultimos_7d: number
  resumenes_7d_previos: number
}

export default function OrganizerStudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const studentId = params.studentId as string

  const [detail, setDetail] = useState<Detail | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherPrompt, setTeacherPrompt] = useState('')
  const [privateNotes, setPrivateNotes] = useState('')
  const [savingGuidelines, setSavingGuidelines] = useState(false)
  const [guidelinesSaved, setGuidelinesSaved] = useState(false)

  const loadDetail = useCallback(() => {
    if (!studentId) return
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`/api/organization/students/${studentId}`),
      fetch(`/api/organization/students/${studentId}/metrics`),
    ])
      .then(async ([resDetail, resMetrics]) => {
        if (!resDetail.ok) throw new Error('Error al cargar estudiante')
        if (!resMetrics.ok) return [await resDetail.json(), null] as [Detail, Metrics | null]
        const [d, m] = await Promise.all([resDetail.json(), resMetrics.json()])
        return [d, m] as [Detail, Metrics | null]
      })
      .then(([d, m]) => {
        setDetail(d)
        setMetrics(m ?? null)
        setTeacherPrompt(d.guidelines?.teacherPrompt ?? '')
        setPrivateNotes(d.guidelines?.privateNotes ?? '')
      })
      .catch((err) => setError(err.message ?? 'Error'))
      .finally(() => setLoading(false))
  }, [studentId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (session?.user?.role !== 'ORGANIZATION_ADMIN' && session?.user?.role !== 'TEACHER') {
      router.push('/dashboard')
      return
    }
    loadDetail()
  }, [status, session, studentId, loadDetail, router])

  const handleSaveGuidelines = async () => {
    if (!studentId) return
    setSavingGuidelines(true)
    setGuidelinesSaved(false)
    try {
      const res = await fetch(`/api/organization/students/${studentId}/guidelines`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherPrompt: teacherPrompt.slice(0, TEACHER_PROMPT_MAX),
          privateNotes: privateNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setGuidelinesSaved(true)
      setTimeout(() => setGuidelinesSaved(false), 2000)
    } catch {
      setError('Error al guardar las directrices')
    } finally {
      setSavingGuidelines(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#FFF7E6] flex items-center justify-center">
        <p className="text-mentis-navy/60">Cargando…</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-[#FFF7E6] flex items-center justify-center p-4">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-800 text-center max-w-md">
          <p className="font-medium">{error ?? 'Estudiante no encontrado'}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-mentis-navy underline">
            Volver al panel
          </Link>
        </div>
      </div>
    )
  }

  const isActive = !!detail.progress.lastChatAt
  const hintsPerSession = metrics?.hints_por_sesion ?? 0
  const highDependency = hintsPerSession >= HINTS_PER_SESSION_THRESHOLD
  const summariesLast7 = metrics?.resumenes_ultimos_7d ?? 0
  const summariesPrev7 = metrics?.resumenes_7d_previos ?? 0
  const points = detail.progress.prPoints
  const possibleStagnation =
    summariesLast7 >= STAGNATION_SUMMARY_THRESHOLD &&
    summariesPrev7 >= STAGNATION_SUMMARY_THRESHOLD &&
    points < STAGNATION_POINTS_THRESHOLD

  return (
    <div className="min-h-screen bg-[#FFF7E6]">
      <header className="sticky top-0 z-20 border-b border-mentis-yellow/40 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="w-full max-w-[140rem] mx-auto px-4 md:px-6 lg:px-10 xl:px-12 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-mentis-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-mentis-navy/80 hover:bg-mentis-navy/5 hover:border-mentis-navy/30 hover:text-mentis-navy transition-colors"
            >
              <span aria-hidden>←</span>
              <span>Volver al panel</span>
            </Link>
            <div className="min-w-0 border-l border-mentis-yellow/40 pl-4">
              <h1 className="text-xl md:text-2xl font-bold text-mentis-navy tracking-tight truncate">
                {detail.student.name}
              </h1>
              <p className="text-xs text-mentis-navy/60 mt-0.5 truncate">
                {detail.student.email ?? '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="shrink-0 rounded-xl border border-mentis-navy/20 px-4 py-2.5 text-sm font-medium text-mentis-navy/80 hover:bg-mentis-navy hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="w-full max-w-[140rem] mx-auto px-4 md:px-6 lg:px-10 xl:px-12 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Columna izquierda */}
          <div className="xl:col-span-4 space-y-6">
            {/* Perfil y estado */}
            <div className="rounded-3xl bg-white shadow-lg border border-mentis-yellow/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/50">Perfil</p>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-xs text-mentis-navy/60">
                    Puntos PR: <strong className="text-mentis-navy">{detail.progress.prPoints}</strong> · Racha: <strong>{detail.progress.streak} d</strong>
                  </span>
                </div>
                <p className="text-xs text-mentis-navy/60">
                  Último chat: {detail.progress.lastChatAt
                    ? new Date(detail.progress.lastChatAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
                <p className="text-[10px] text-mentis-navy/50 mt-2">
                  Alta en la organización: {new Date(detail.student.createdAt).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>

            {/* Alertas pedagógicas */}
            <div className="rounded-3xl bg-white shadow-lg border border-mentis-yellow/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
                <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Alertas pedagógicas</h3>
                <p className="text-[10px] text-mentis-navy/50 mt-0.5">Atención recomendada</p>
              </div>
              <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {highDependency && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200/60">
                    Dependencia alta (pistas/sesión)
                  </span>
                )}
                {possibleStagnation && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200/60">
                    Posible estancamiento
                  </span>
                )}
                {metrics?.errores_frecuentes && metrics.errores_frecuentes !== 'N/A' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-800 border border-red-200/60">
                    Errores recurrentes
                  </span>
                )}
                {!highDependency && !possibleStagnation && (!metrics?.errores_frecuentes || metrics.errores_frecuentes === 'N/A') && (
                  <span className="text-sm text-mentis-navy/50">Ninguna alerta en este momento.</span>
                )}
              </div>
              </div>
            </div>

            {/* Mini-prompt del profesor */}
            <div className="rounded-3xl bg-white shadow-lg border border-mentis-yellow/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
                <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Mini-prompt del profesor</h3>
                <p className="text-[10px] text-mentis-navy/50 mt-0.5">Adapta la IA a este alumno</p>
              </div>
              <div className="p-6">
                <textarea
                  value={teacherPrompt}
                  onChange={(e) => setTeacherPrompt(e.target.value)}
                  maxLength={TEACHER_PROMPT_MAX}
                  rows={4}
                  className="w-full rounded-2xl border border-mentis-yellow/30 bg-[#FFF7E6]/40 p-4 text-sm text-mentis-navy placeholder:text-mentis-navy/40 focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none resize-y"
                  placeholder="Ej: explícale con analogías, evita saltos, usa ejemplos visuales…"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-mentis-navy/50">
                    {teacherPrompt.length} / {TEACHER_PROMPT_MAX}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveGuidelines}
                    disabled={savingGuidelines}
                    className="rounded-xl bg-mentis-navy text-white px-5 py-2.5 text-xs font-semibold hover:bg-mentis-navy/90 disabled:opacity-50 transition-colors"
                  >
                    {savingGuidelines ? 'Guardando…' : guidelinesSaved ? 'Guardado' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Notas privadas */}
            <div className="rounded-3xl bg-white shadow-lg border border-mentis-yellow/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
                <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Notas privadas</h3>
                <p className="text-[10px] text-mentis-navy/50 mt-0.5">Solo visibles para organizadores</p>
              </div>
              <div className="p-6">
                <textarea
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-mentis-yellow/30 bg-[#FFF7E6]/40 p-4 text-sm text-mentis-navy placeholder:text-mentis-navy/40 focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none resize-y"
                  placeholder="Anotaciones sobre este alumno…"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveGuidelines}
                    disabled={savingGuidelines}
                    className="text-xs font-semibold text-mentis-navy/70 hover:text-mentis-navy"
                  >
                    {savingGuidelines ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="xl:col-span-8 space-y-6">
            {/* Progreso y métricas */}
            <div className="rounded-3xl bg-white shadow-lg border border-mentis-yellow/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
                <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Progreso y métricas</h3>
                <p className="text-[10px] text-mentis-navy/50 mt-0.5">Últimos 14 días</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl bg-mentis-navy/5 border border-mentis-yellow/20 p-5 hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/50">Sesiones</p>
                    <p className="text-2xl md:text-3xl font-bold text-mentis-navy mt-1 tabular-nums">{metrics?.sesiones_14d ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-mentis-navy/5 border border-mentis-yellow/20 p-5 hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/50">Pistas total</p>
                    <p className="text-2xl md:text-3xl font-bold text-mentis-navy mt-1 tabular-nums">{metrics?.hints_total ?? detail.progress.hintsUsed}</p>
                  </div>
                  <div className="rounded-2xl bg-mentis-yellow/25 border border-mentis-yellow/40 p-5 hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80">Pistas/sesión</p>
                    <p className="text-2xl md:text-3xl font-bold text-mentis-navy mt-1 tabular-nums">{metrics?.hints_por_sesion ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-mentis-navy/5 border border-mentis-yellow/20 p-5 hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/50">Tendencia</p>
                    <p className="text-xl font-bold text-mentis-navy mt-1">
                      {metrics ? (metrics.tendencia_actividad > 0 ? '↑ antes' : metrics.tendencia_actividad < 0 ? '↑ reciente' : '≈ estable') : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Errores frecuentes */}
            <div className="rounded-3xl bg-white shadow-lg border border-mentis-yellow/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
                <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Errores frecuentes</h3>
                <p className="text-[10px] text-mentis-navy/50 mt-0.5">Conceptos a reforzar</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-mentis-navy/80">
                  {metrics?.errores_frecuentes ?? 'N/A'}
                </p>
                <p className="text-[10px] text-mentis-navy/50 mt-2">
                  Se mostrarán cuando el sistema registre tags de error por sesión.
                </p>
              </div>
            </div>

            {/* Últimos resúmenes */}
            <div className="rounded-3xl bg-white shadow-lg border border-mentis-yellow/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/20 bg-mentis-navy/5">
                <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Últimos resúmenes</h3>
                <p className="text-[10px] text-mentis-navy/50 mt-0.5">Sesiones de aprendizaje con Mentis</p>
              </div>
              <div className="divide-y divide-mentis-yellow/20 max-h-[420px] overflow-y-auto">
                {detail.summaries.length === 0 ? (
                  <div className="px-6 py-12 text-center text-mentis-navy/50 text-sm">
                    Aún no hay resúmenes.
                  </div>
                ) : (
                  detail.summaries.slice(0, 15).map((sum) => (
                    <div key={sum.id} className="px-6 py-4 hover:bg-mentis-navy/[0.02] transition-colors">
                      <p className="text-[10px] text-mentis-navy/50 mb-1.5">
                        {new Date(sum.createdAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm text-mentis-navy/90 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                        {sum.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Botón abrir chat (el alumno usa /dashboard como estudiante; no hay ruta “como este alumno”) */}
            <div className="rounded-2xl bg-mentis-yellow/15 border border-mentis-yellow/30 p-5">
              <p className="text-sm text-mentis-navy/80">
                Las directrices que guardes aquí se aplican cuando este alumno use Mentis desde su <strong>Dashboard</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
