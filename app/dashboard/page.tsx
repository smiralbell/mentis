'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getInitialGreeting } from '@/lib/mentor-chat/prompt'
import type { MentorChatPhase, MentorChatContext } from '@/lib/mentor-chat/types'

type ThemeCard = {
  id: string
  name: string
  icon: string
}

type Subject = {
  id: string
  name: string
  subtitle: string
  icon?: string
}

type ChatSession = {
  id: string
  title: string
  updatedAt: string
}

/**
 * Dashboard
 *
 * - For students: themed world selection panel (TARGET ANALYSIS style).
 * - For admins/teachers: simple placeholder (under construction).
 */
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mentis-navy">Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7E6]">
        <p className="text-mentis-navy">Sin sesión. Redirigiendo...</p>
      </div>
    )
  }

  const userRole = session.user?.role
  if (userRole === 'STUDENT') {
    return <StudentDashboard studentName={session.user?.name ?? 'Estudiante'} />
  }

  return (
    <OrganizerDashboard
      userName={session.user?.name ?? 'Usuario'}
      userRole={session.user?.role ?? 'TEACHER'}
    />
  )
}

type OrgStudent = {
  id: string
  name: string
  email: string | null
  createdAt: string
  prPoints: number
  lastChatAt: string | null
  streak: number
  hintsUsed: number
}
type OrgSummary = {
  id: string
  userId: string
  content: string
  sourceType: string | null
  sourceId: string | null
  createdAt: string
  user: { name: string }
}
type StudentDetail = {
  student: { id: string; name: string; email: string | null; createdAt: string }
  progress: { prPoints: number; lastChatAt: string | null; streak: number; hintsUsed: number }
  summaries: { id: string; content: string; createdAt: string }[]
}

function OrganizerDashboard({
  userName,
  userRole,
}: {
  userName: string
  userRole: string
}) {
  const [data, setData] = useState<{
    students: OrgStudent[]
    summaries: OrgSummary[]
    totalStudents: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'students' | 'summaries'>('overview')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<StudentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/organization/students')
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar datos')
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selectedStudentId) {
      setDetailData(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    fetch(`/api/organization/students/${selectedStudentId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar detalle')
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setDetailData(json)
      })
      .catch(() => {
        if (!cancelled) setDetailData(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedStudentId])

  const roleLabel = userRole === 'ORGANIZATION_ADMIN' ? 'Organizador' : 'Profesor'

  return (
    <div className="min-h-screen bg-[#FFF7E6]">
      <header className="sticky top-0 z-20 border-b border-mentis-yellow/40 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-mentis-navy tracking-tight">
              Centre de pilotage
            </h1>
            <p className="text-xs md:text-sm text-mentis-navy/60 mt-0.5">
              {userName} · {roleLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="rounded-full border border-mentis-navy/20 px-4 py-2 text-sm font-medium text-mentis-navy/80 hover:bg-mentis-navy hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-mentis-navy/60">Cargando datos de la organización…</p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-800">
            {error}
          </div>
        )}
        {!loading && !error && data && (
          <>
            <div className="flex rounded-2xl bg-white/80 border border-mentis-yellow/50 p-1.5 shadow-sm gap-1 mb-6">
              <button
                type="button"
                onClick={() => { setTab('overview'); setSelectedStudentId(null) }}
                className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  tab === 'overview'
                    ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                    : 'text-mentis-navy/70 hover:bg-mentis-yellow/20'
                }`}
              >
                Vista general
              </button>
              <button
                type="button"
                onClick={() => { setTab('students'); setSelectedStudentId(null) }}
                className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  tab === 'students'
                    ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                    : 'text-mentis-navy/70 hover:bg-mentis-yellow/20'
                }`}
              >
                Estudiantes
              </button>
              <button
                type="button"
                onClick={() => setTab('summaries')}
                className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  tab === 'summaries'
                    ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                    : 'text-mentis-navy/70 hover:bg-mentis-yellow/20'
                }`}
              >
                Resúmenes
              </button>
            </div>

            {tab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-sm p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/60">Estudiantes</p>
                    <p className="text-3xl font-bold text-mentis-navy mt-1">{data.totalStudents}</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-sm p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/60">Puntos totales</p>
                    <p className="text-3xl font-bold text-mentis-navy mt-1">
                      {data.students.reduce((acc, s) => acc + (s.prPoints ?? 0), 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-sm p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/60">Resúmenes</p>
                    <p className="text-3xl font-bold text-mentis-navy mt-1">{data.summaries.length}</p>
                  </div>
                  <div className="rounded-2xl bg-mentis-yellow/20 border border-mentis-yellow/50 shadow-sm p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/90">Media puntos</p>
                    <p className="text-3xl font-bold text-mentis-navy mt-1">
                      {data.totalStudents === 0 ? 0 : Math.round(data.students.reduce((a, s) => a + (s.prPoints ?? 0), 0) / data.totalStudents)}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-md overflow-hidden">
                  <div className="px-4 md:px-6 py-3 border-b border-mentis-yellow/40">
                    <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Ranking por puntos PR</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-mentis-yellow/30 bg-mentis-navy/5">
                          <th className="px-4 md:px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">#</th>
                          <th className="px-4 md:px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">Estudiante</th>
                          <th className="px-4 md:px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">Puntos</th>
                          <th className="px-4 md:px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">Racha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mentis-yellow/20">
                        {[...data.students]
                          .sort((a, b) => (b.prPoints ?? 0) - (a.prPoints ?? 0))
                          .slice(0, 10)
                          .map((s, i) => (
                            <tr key={s.id} className="hover:bg-mentis-yellow/5">
                              <td className="px-4 md:px-6 py-3 text-mentis-navy/60 font-medium">{i + 1}</td>
                              <td className="px-4 md:px-6 py-3 font-medium text-mentis-navy">{s.name}</td>
                              <td className="px-4 md:px-6 py-3 text-right font-bold text-mentis-navy">{s.prPoints ?? 0}</td>
                              <td className="px-4 md:px-6 py-3 text-right text-mentis-navy/80">{s.streak ?? 0}</td>
                            </tr>
                          ))}
                        {data.students.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 md:px-6 py-8 text-center text-mentis-navy/50 text-sm">Sin datos aún</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-md overflow-hidden">
                  <div className="px-4 md:px-6 py-3 border-b border-mentis-yellow/40">
                    <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Última actividad en chat</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-mentis-yellow/30 bg-mentis-navy/5">
                          <th className="px-4 md:px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">Estudiante</th>
                          <th className="px-4 md:px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">Último chat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mentis-yellow/20">
                        {[...data.students]
                          .filter((s) => s.lastChatAt)
                          .sort((a, b) => new Date(b.lastChatAt!).getTime() - new Date(a.lastChatAt!).getTime())
                          .slice(0, 10)
                          .map((s) => (
                            <tr key={s.id} className="hover:bg-mentis-yellow/5">
                              <td className="px-4 md:px-6 py-3 font-medium text-mentis-navy">{s.name}</td>
                              <td className="px-4 md:px-6 py-3 text-right text-sm text-mentis-navy/80">
                                {new Date(s.lastChatAt!).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        {data.students.filter((s) => s.lastChatAt).length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-4 md:px-6 py-8 text-center text-mentis-navy/50 text-sm">Ninguna actividad aún</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'students' && (
              <div className="flex gap-6 flex-col lg:flex-row">
                <div className="flex-1 min-w-0 rounded-2xl bg-white border border-mentis-yellow/50 shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-mentis-yellow/40 bg-mentis-navy/5">
                          <th className="px-4 md:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">Estudiante</th>
                          <th className="px-4 md:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">Email</th>
                          <th className="px-4 md:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">Puntos PR</th>
                          <th className="px-4 md:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 text-right">Último chat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mentis-yellow/20">
                        {data.students.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 md:px-6 py-8 text-center text-mentis-navy/60 text-sm">
                              Aún no hay estudiantes. Los alumnos se unen con el código de la organización.
                            </td>
                          </tr>
                        ) : (
                          data.students.map((s) => (
                            <tr
                              key={s.id}
                              onClick={() => setSelectedStudentId(s.id)}
                              className="hover:bg-mentis-yellow/10 cursor-pointer transition-colors"
                            >
                              <td className="px-4 md:px-6 py-4 font-medium text-mentis-navy">{s.name}</td>
                              <td className="px-4 md:px-6 py-4 text-sm text-mentis-navy/80">{s.email ?? '—'}</td>
                              <td className="px-4 md:px-6 py-4 text-right font-bold text-mentis-navy">{s.prPoints ?? 0}</td>
                              <td className="px-4 md:px-6 py-4 text-right text-xs text-mentis-navy/70">
                                {s.lastChatAt
                                  ? new Date(s.lastChatAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                  : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {selectedStudentId && (
                  <div className="lg:w-[420px] shrink-0 rounded-2xl bg-white border-2 border-mentis-yellow/60 shadow-lg overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="px-4 md:px-6 py-3 border-b border-mentis-yellow/40 flex items-center justify-between bg-mentis-navy/5">
                      <h3 className="text-sm font-bold text-mentis-navy uppercase tracking-wider">Detalle del estudiante</h3>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(null)}
                        className="text-mentis-navy/60 hover:text-mentis-navy text-xl leading-none"
                        aria-label="Cerrar"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-mentis">
                      {detailLoading ? (
                        <p className="text-mentis-navy/60 text-sm">Cargando…</p>
                      ) : detailData ? (
                        <>
                          <div>
                            <p className="text-lg font-bold text-mentis-navy">{detailData.student.name}</p>
                            <p className="text-xs text-mentis-navy/60">{detailData.student.email ?? '—'}</p>
                            <p className="text-[10px] text-mentis-navy/50 mt-1">
                              Alta: {new Date(detailData.student.createdAt).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-mentis-yellow/20 border border-mentis-yellow/50 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">Puntos PR</p>
                              <p className="text-xl font-bold text-mentis-navy">{detailData.progress.prPoints}</p>
                            </div>
                            <div className="rounded-xl bg-mentis-navy/5 border border-mentis-yellow/40 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">Racha</p>
                              <p className="text-xl font-bold text-mentis-navy">{detailData.progress.streak}</p>
                            </div>
                            <div className="rounded-xl bg-mentis-navy/5 border border-mentis-yellow/40 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">Pistas usadas</p>
                              <p className="text-xl font-bold text-mentis-navy">{detailData.progress.hintsUsed}</p>
                            </div>
                            <div className="rounded-xl bg-mentis-navy/5 border border-mentis-yellow/40 p-3 col-span-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">Último chat</p>
                              <p className="text-sm font-medium text-mentis-navy">
                                {detailData.progress.lastChatAt
                                  ? new Date(detailData.progress.lastChatAt).toLocaleString('es-ES')
                                  : '—'}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 mb-2">Resúmenes de aprendizaje ({detailData.summaries.length})</p>
                            {detailData.summaries.length === 0 ? (
                              <p className="text-xs text-mentis-navy/50">Aún no ha generado resúmenes.</p>
                            ) : (
                              <div className="space-y-3">
                                {detailData.summaries.map((sum) => (
                                  <div key={sum.id} className="rounded-xl bg-mentis-navy/5 border border-mentis-yellow/30 p-3">
                                    <p className="text-[10px] text-mentis-navy/50 mb-1">
                                      {new Date(sum.createdAt).toLocaleString('es-ES')}
                                    </p>
                                    <p className="text-xs text-mentis-navy/90 whitespace-pre-wrap line-clamp-4">{sum.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-mentis-navy/60 text-sm">No se pudo cargar el detalle.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'summaries' && (
              <div className="space-y-4">
                {data.summaries.length === 0 ? (
                  <div className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-md p-12 text-center text-mentis-navy/60 text-sm">
                    Aún no hay resúmenes de aprendizaje. Los estudiantes pueden generar &quot;Mini resumen&quot; desde el chat con Mentis.
                  </div>
                ) : (
                  data.summaries.map((sum) => (
                    <div
                      key={sum.id}
                      className="rounded-2xl bg-white border border-mentis-yellow/50 shadow-md overflow-hidden"
                    >
                      <div className="px-4 md:px-6 py-3 border-b border-mentis-yellow/30 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-mentis-navy text-sm">
                          {sum.user.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-mentis-navy/50">
                          {new Date(sum.createdAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="px-4 md:px-6 py-4 text-sm text-mentis-navy/90 whitespace-pre-wrap leading-relaxed">
                        {sum.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function StudentDashboard({ studentName }: { studentName: string }) {
  const [themes, setThemes] = useState<ThemeCard[]>([
    { id: 'pokemon', name: 'Pokémon', icon: 'PK' },
    { id: 'football', name: 'Football', icon: 'FB' },
    { id: 'lego', name: 'Lego', icon: 'LG' },
    { id: 'animals', name: 'Animales', icon: 'AN' },
    { id: 'space', name: 'Espacio', icon: 'SP' },
    { id: 'videogames', name: 'Videojuegos', icon: 'VG' },
  ])

  const [showNewTheme, setShowNewTheme] = useState(false)
  const [newThemeName, setNewThemeName] = useState('')
  const [view, setView] = useState<'missions' | 'teachers'>('missions')
  const [selectedTheme, setSelectedTheme] = useState<ThemeCard | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('language')
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [sidebarMode, setSidebarMode] = useState<'subjects' | 'chats' | 'tools'>('subjects')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatPrompt, setChatPrompt] = useState<string>('')
  const [chatMessages, setChatMessages] = useState<
    Record<string, { role: 'user' | 'assistant'; content: string }[]>
  >({})
  const [isSending, setIsSending] = useState(false)

  const [chatSessions, setChatSessions] = useState<Record<string, ChatSession[]>>({
    language: [],
    maths: [],
    world: [],
    english: [],
    arts: [],
  })

  /** Estado del chat pedagógico guiado por conversación (phase + context). */
  const [guidedStateByChatId, setGuidedStateByChatId] = useState<
    Record<string, { phase: MentorChatPhase; context: MentorChatContext }>
  >({})

  // Herramientas: nivel de tutoría, puntos y botón de ayuda
  const [tutorLevel, setTutorLevel] = useState<'N1' | 'N2' | 'N3'>('N2')
  const [thoughtTracePercent, setThoughtTracePercent] = useState(0)
  const [streak, setStreak] = useState(0)
  const [prPoints, setPrPoints] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false)

  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const lastMessageRef = useRef<HTMLDivElement | null>(null)

  const syncProgressToApi = useCallback((updates: { prPoints?: number; streak?: number; hintsUsed?: number; lastChatAt?: string }) => {
    fetch('/api/student-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      syncProgressToApi({ prPoints, streak, hintsUsed })
    }, 1500)
    return () => clearTimeout(t)
  }, [prPoints, streak, hintsUsed, syncProgressToApi])

  const SPECIAL_SYMBOLS = ['±', '∞', '√', '∫', 'π', '×', '÷', '²', '³', '°', '≤', '≥', '≠', '≈', '∑', '∏', 'α', 'β', 'θ', 'Δ', '→', '←', '·', '½', '¼', '€', '°']

  const tutorLevelContent: Record<string, { tag: string; title: string; description: string }> = {
    N1: {
      tag: 'CONCEPTOS BÁSICOS',
      title: 'Nivel 1: Introducción',
      description: 'Mentis te guía paso a paso con preguntas muy sencillas para afianzar lo esencial.',
    },
    N2: {
      tag: 'PRACTICA GUIADA',
      title: 'Nivel 2: Práctica',
      description: 'Resuelve ejercicios con pistas cuando lo necesites. Ideal para consolidar.',
    },
    N3: {
      tag: 'MODELADO Y FUNCIONES',
      title: 'Nivel 3: Modelado',
      description: 'Analiza la relación entre el área de un cuadrado y su lado. Si el lado (L) se duplica, ¿qué ocurre con el área (A)?',
    },
  }

  const subjects: Subject[] = [
    { id: 'language', name: 'LANGUAGE', subtitle: 'READING' },
    { id: 'maths', name: 'MATHS', subtitle: 'NUMBERS' },
    { id: 'world', name: 'WORLD', subtitle: 'SCIENCE' },
    { id: 'english', name: 'ENGLISH', subtitle: 'COMMUNICATION & VOCAB' },
    { id: 'arts', name: 'ARTS', subtitle: 'CREATIVITY & OBSERVATION' },
  ]

  const currentMessages = useMemo(
    () => (selectedChatId && chatMessages[selectedChatId] ? chatMessages[selectedChatId] : []),
    [selectedChatId, chatMessages]
  )

  /** Nombre de la asignatura elegida en el lateral (el sistema ya lo conoce). */
  const selectedSubjectName = subjects.find((s) => s.id === selectedSubjectId)?.name ?? ''

  /** Estado guiado del chat actual. Siempre inyectamos la asignatura del UI en el contexto. */
  const currentGuidedState = selectedChatId
    ? guidedStateByChatId[selectedChatId] ?? { phase: 'idle' as MentorChatPhase, context: { subject: selectedSubjectName } as MentorChatContext }
    : { phase: 'idle' as MentorChatPhase, context: { subject: selectedSubjectName } as MentorChatContext }
  /** Contexto que se envía a la API: estado del chat + asignatura actual del lateral. */
  const apiContext: MentorChatContext = { ...currentGuidedState.context, subject: selectedSubjectName }
  const canRequestHint =
    currentGuidedState.phase === 'solving' ||
    currentGuidedState.phase === 'evaluating' ||
    currentGuidedState.phase === 'waiting_for_correction'

  /** Pide una pista conceptual al Profesor Mentis (solo activo en fase solving/evaluating/waiting_for_correction). */
  const handleRequestHint = async () => {
    const chatId = selectedChatId
    if (!chatId || isSending || !canRequestHint) return
    try {
      setIsSending(true)
      const state = guidedStateByChatId[chatId] ?? { phase: 'solving', context: {} }
      const messages = chatMessages[chatId] || []
      const res = await fetch('/api/mentor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: state.phase,
          context: apiContext,
          messages,
          requestingHint: true,
        }),
      })
      if (!res.ok) throw new Error('Hint request failed')
      const data = await res.json()
      const hint = data?.reply ?? 'Mentis te dará una pista. Inténtalo de nuevo.'
      setChatMessages((prev) => ({
        ...prev,
        [chatId]: [
          ...(prev[chatId] || []),
          { role: 'assistant', content: `💡 Pista: ${hint}` },
        ],
      }))
      setHintsUsed((prev) => prev + 1)
      syncProgressToApi({ hintsUsed: hintsUsed + 1 })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  // Auto-scroll al último mensaje cuando cambian los mensajes (hacia arriba = mostrar lo nuevo abajo)
  useEffect(() => {
    if (currentMessages.length === 0) return
    const t = setTimeout(() => {
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 100)
    return () => clearTimeout(t)
  }, [currentMessages.length, currentMessages])

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThemeName.trim()) return

    // Derivar unas buenas iniciales automáticamente a partir del nombre
    const words = newThemeName
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    let initials = ''

    if (words.length === 1) {
      // Un solo término: tomar las 2–3 primeras letras
      initials = words[0].slice(0, 3)
    } else {
      // Varios términos: tomar la primera letra de cada palabra hasta 3
      initials = words
        .map((w) => w[0])
        .join('')
        .slice(0, 3)
    }

    if (!initials) {
      initials = 'UV'
    }

    setThemes((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: newThemeName.trim(),
        icon: initials.toUpperCase(),
      },
    ])

    setNewThemeName('')
    setShowNewTheme(false)
  }

  const isChatView = Boolean(selectedTheme)

  return (
    <div
      className="min-h-screen bg-[#FFF7E6]"
    >
      {/* Top navigation bar */}
      {!selectedTheme && (
        <header className="flex items-center justify-between px-8 py-5 border-b border-yellow-200 bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-mentis-yellow flex items-center justify-center shadow-md">
              <span className="font-bold text-mentis-navy text-lg">M</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-mentis-navy tracking-wide">
                MENTIS
              </p>
              <p className="text-[11px] uppercase tracking-[0.25em] text-mentis-navy/60">
                LAB COGNITIF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex rounded-full bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setView('missions')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-colors ${
                  view === 'missions'
                    ? 'bg-mentis-yellow text-mentis-navy shadow-sm'
                    : 'text-mentis-navy/60'
                }`}
              >
                Missions
              </button>
              <button
                type="button"
                onClick={() => setView('teachers')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-colors ${
                  view === 'teachers'
                    ? 'bg-mentis-yellow text-mentis-navy shadow-sm'
                    : 'text-mentis-navy/60'
                }`}
              >
                Assignments
              </button>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-full bg-transparent border border-mentis-navy/20 px-4 py-2 font-medium text-mentis-navy/80 hover:bg-mentis-navy hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={isChatView ? 'h-screen w-full flex' : 'px-6 py-10 md:px-16 md:py-12'}>
        {view === 'missions' ? (
          <>
            {!selectedTheme ? (
              <>
                <div className="text-center mb-10">
                  <p className="text-xs uppercase tracking-[0.3em] text-mentis-navy/60 mb-2">
                    Bienvenue, {studentName}
                  </p>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-mentis-navy tracking-wide mb-4">
                    TARGET ANALYSIS
                  </h1>
                  <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-mentis-navy/55">
                    Inicializa tu universo de misión eligiendo una temática
                  </p>
                </div>

                <section className="max-w-5xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setSelectedTheme(theme)
                          setSelectedSubjectId('language')
                          setSidebarMode('subjects')
                        }}
                        className="group h-full rounded-[32px] bg-white shadow-md px-6 py-7 flex flex-col items-center justify-center gap-4 hover:-translate-y-1 hover:shadow-lg transition-all text-center"
                      >
                        <div className="h-20 w-20 rounded-3xl bg-mentis-yellow flex items-center justify-center shadow-md text-xl font-extrabold text-mentis-navy tracking-wide uppercase">
                          <span>{theme.icon}</span>
                        </div>
                        <p className="text-sm font-semibold tracking-wide text-mentis-navy uppercase">
                          {theme.name}
                        </p>
                      </button>
                    ))}

                    {/* New theme card */}
                    <button
                      type="button"
                      onClick={() => setShowNewTheme(true)}
                      className="h-full rounded-[32px] border-2 border-dashed border-mentis-yellow/70 bg-white/60 px-6 py-7 flex flex-col items-center justify-center gap-3 hover:bg-white hover:-translate-y-1 hover:shadow-md transition-all text-center"
                    >
                      <div className="h-20 w-20 rounded-3xl bg-mentis-yellow/40 flex items-center justify-center text-3xl text-mentis-navy">
                        <span className="font-bold">+</span>
                      </div>
                      <p className="text-sm font-semibold tracking-wide text-mentis-navy uppercase">
                        Nuevo universo
                      </p>
                      <p className="text-[11px] text-mentis-navy/60 text-center max-w-[10rem]">
                        Crea tu propia temática para aprender a tu manera.
                      </p>
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <section className="flex-1 flex">
                {/* Lateral: colapsado (solo botón mostrar) o completo */}
                {sidebarCollapsed ? (
                  <div className="w-12 bg-[#FFEEC2] border-r border-mentis-yellow/40 shrink-0 flex flex-col items-center py-4">
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(false)}
                      className="h-10 w-10 rounded-full bg-mentis-yellow flex items-center justify-center text-mentis-navy shadow-md hover:bg-mentis-yellow/90 transition-colors"
                      title="Mostrar menú lateral"
                      aria-label="Mostrar menú lateral"
                    >
                      <span className="text-base font-bold leading-none" aria-hidden>»</span>
                    </button>
                  </div>
                ) : (
                <div className="w-80 md:w-[26rem] bg-[#FFEEC2] text-mentis-navy flex flex-col gap-4 px-5 py-5 border-r border-mentis-yellow/40 shrink-0">
                  <aside className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTheme(null)
                          setSelectedChatId(null)
                          setSidebarMode('subjects')
                          setChatMessages({})
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/70 border border-mentis-yellow/60 hover:bg-white transition-all text-xs font-semibold"
                      >
                        <span className="h-7 w-7 rounded-full bg-mentis-yellow flex items-center justify-center text-mentis-navy text-sm">
                          ⌂
                        </span>
                        <span className="tracking-[0.16em] uppercase">
                          Home
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarCollapsed(true)}
                        className="h-9 w-9 rounded-full bg-white/80 border border-mentis-yellow/60 flex items-center justify-center text-mentis-navy shadow-sm hover:bg-white transition-colors"
                        title="Ocultar menú lateral"
                        aria-label="Ocultar menú lateral"
                      >
                        <span className="text-base font-bold leading-none" aria-hidden>«</span>
                      </button>
                    </div>

                    {/* Menú horizontal: texto completo solo en la pestaña activa; el resto abreviado */}
                    <div className="flex rounded-2xl bg-white/80 border border-mentis-yellow/50 p-1.5 shadow-sm gap-1">
                      <button
                        type="button"
                        onClick={() => setSidebarMode('subjects')}
                        title="Asignaturas"
                        className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-[0.12em] transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
                          sidebarMode === 'subjects'
                            ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                            : 'text-mentis-navy/70 hover:text-mentis-navy hover:bg-mentis-yellow/20'
                        }`}
                      >
                        {sidebarMode === 'subjects' ? 'Asignaturas' : 'Asig.'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarMode('chats')}
                        title="Historial"
                        className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-[0.12em] transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
                          sidebarMode === 'chats'
                            ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                            : 'text-mentis-navy/70 hover:text-mentis-navy hover:bg-mentis-yellow/20'
                        }`}
                      >
                        {sidebarMode === 'chats' ? 'Historial' : 'Hist.'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarMode('tools')}
                        title="Herramientas"
                        className={`flex-1 min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-[0.12em] transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
                          sidebarMode === 'tools'
                            ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                            : 'text-mentis-navy/70 hover:text-mentis-navy hover:bg-mentis-yellow/20'
                        }`}
                      >
                        {sidebarMode === 'tools' ? 'Herramientas' : 'Herr.'}
                      </button>
                    </div>

                    {sidebarMode === 'subjects' ? (
                      <>
                        {subjects.map((subject) => {
                          const isActive = subject.id === selectedSubjectId
                          const hasChats = (chatSessions[subject.id] || []).length > 0
                          return (
                            <button
                              key={subject.id}
                              type="button"
                              onClick={() => {
                                setSelectedSubjectId(subject.id)
                                setSidebarMode(hasChats ? 'chats' : 'subjects')
                              }}
                              className={`w-full flex items-center gap-4 px-4 py-4 rounded-[999px] transition-all ${
                                isActive
                                  ? 'bg-white text-mentis-navy shadow-md border border-mentis-yellow/60'
                                  : 'bg-[#FFF7E6] text-mentis-navy border border-transparent hover:border-mentis-yellow/60'
                              }`}
                            >
                              <div
                                className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold ${
                                  isActive
                                    ? 'bg-mentis-yellow text-mentis-navy'
                                    : 'bg-mentis-yellow/30 text-mentis-navy'
                                }`}
                              >
                                <span>
                                  {subject.name
                                    .split(' ')
                                    .map((w) => w[0])
                                    .join('')
                                    .slice(0, 2)}
                                </span>
                              </div>
                              <div className="flex flex-col items-start">
                                <span
                                  className={`text-xs font-semibold tracking-[0.18em] uppercase ${
                                    isActive ? 'text-mentis-navy' : 'text-mentis-navy/80'
                                  }`}
                                >
                                  {subject.name}
                                </span>
                                <span
                                  className={`text-[10px] font-medium tracking-[0.2em] uppercase ${
                                    isActive ? 'text-mentis-yellow/80' : 'text-white/50'
                                  }`}
                                >
                                  {subject.subtitle}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </>
                    ) : sidebarMode === 'chats' ? (
                      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const subjectId = selectedSubjectId || 'language'
                            const newId = `${subjectId}-${Date.now()}`
                            const subjectName =
                              subjects.find((s) => s.id === subjectId)?.name || 'Chat'
                            const newSession: ChatSession = {
                              id: newId,
                              title: `Nuevo chat · ${subjectName}`,
                              updatedAt: 'Ahora mismo',
                            }
                            setChatSessions((prev) => ({
                              ...prev,
                              [subjectId]: [newSession, ...(prev[subjectId] || [])],
                            }))
                            setSelectedChatId(newId)
                            setChatMessages((prev) => ({ ...prev, [newId]: [] }))
                            setGuidedStateByChatId((prev) => ({
                              ...prev,
                              [newId]: { phase: 'idle', context: { subject: selectedSubjectName } },
                            }))
                          }}
                          className="shrink-0 h-10 w-full rounded-2xl border-2 border-dashed border-mentis-yellow/70 bg-white/70 flex items-center justify-center gap-2 text-mentis-navy font-semibold text-sm hover:bg-mentis-yellow/20 hover:border-mentis-yellow transition-colors"
                          aria-label="Nuevo chat"
                        >
                          <span className="text-xl leading-none">+</span>
                          <span className="uppercase tracking-wider">Nuevo chat</span>
                        </button>
                        <div className="space-y-2 overflow-auto pr-1 flex-1 min-h-0">
                        {(chatSessions[selectedSubjectId] || []).map((session) => {
                          const isActiveChat = session.id === selectedChatId
                          return (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => setSelectedChatId(session.id)}
                              className={`w-full text-left px-4 py-3 rounded-2xl border text-xs transition-all ${
                                isActiveChat
                                  ? 'bg-white text-mentis-navy border-mentis-yellow shadow-sm'
                                  : 'bg-[#FFF7E6] text-mentis-navy/80 border-transparent hover:border-mentis-yellow/60'
                              }`}
                            >
                              <div className="font-semibold truncate">{session.title}</div>
                              <div className="text-[10px] text-mentis-navy/60 mt-1">
                                {session.updatedAt}
                              </div>
                            </button>
                          )
                        })}
                        </div>
                      </div>
                    ) : (
                      /* Panel Herramientas: nivel, descripción, puntos, pedir ayuda */
                      <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-4 flex flex-col">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-mentis-navy/50 px-0.5 shrink-0">
                          Nivel de tutoría (manual)
                        </p>
                        <div className="flex rounded-2xl bg-white/90 border border-mentis-yellow/50 p-1 shadow-sm shrink-0">
                          {(['N1', 'N2', 'N3'] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setTutorLevel(level)}
                              className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                                tutorLevel === level
                                  ? 'bg-mentis-yellow text-mentis-navy shadow-md'
                                  : 'text-mentis-navy/60 hover:bg-mentis-yellow/20 hover:text-mentis-navy'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2 shrink-0">
                          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 border border-mentis-navy/30 rounded-lg px-2 py-1">
                            {tutorLevelContent[tutorLevel].tag}
                          </span>
                          <h4 className="text-sm font-bold text-mentis-navy leading-tight">
                            {tutorLevelContent[tutorLevel].title}
                          </h4>
                          <div className="rounded-xl bg-mentis-navy/5 border border-mentis-yellow/40 p-3 text-left relative">
                            <span className="absolute top-1.5 left-2 text-mentis-navy/30 text-lg font-serif">&ldquo;</span>
                            <p className="text-xs text-mentis-navy/90 leading-relaxed pl-4">
                              {tutorLevelContent[tutorLevel].description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase tracking-wider text-mentis-navy/60">
                              Rastro de pensamiento
                            </span>
                            <span className="text-[10px] font-bold text-mentis-navy">{thoughtTracePercent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-mentis-navy/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-mentis-yellow transition-all duration-300"
                              style={{ width: `${thoughtTracePercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 shrink-0">
                          <div className="rounded-xl bg-mentis-yellow/25 border border-mentis-yellow/50 p-3 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/90">
                              Racha
                            </p>
                            <p className="text-xl font-bold text-mentis-navy mt-0.5">{streak}</p>
                          </div>
                          <div className="rounded-xl bg-purple-100 border border-purple-200/80 p-3 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-700/90">
                              Puntos PR
                            </p>
                            <p className="text-xl font-bold text-mentis-navy mt-0.5">{prPoints}</p>
                          </div>
                        </div>
                        <div className="rounded-xl bg-mentis-navy/5 border border-mentis-navy/20 p-3 text-center shrink-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70">
                            Pistas usadas
                          </p>
                          <p className="text-lg font-bold text-mentis-navy mt-0.5">{hintsUsed}</p>
                        </div>

                        <div className="mt-auto pt-2 shrink-0 space-y-1">
                          <button
                            type="button"
                            onClick={handleRequestHint}
                            disabled={!canRequestHint || isSending}
                            className="w-full py-3.5 px-4 rounded-2xl bg-mentis-yellow border-2 border-mentis-navy/20 text-mentis-navy font-bold text-sm uppercase tracking-wider shadow-lg hover:bg-mentis-yellow/90 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="text-lg" aria-hidden>⚡</span>
                            Pedir ayuda
                          </button>
                          <p className="text-[10px] text-mentis-navy/60 text-center leading-snug">
                            Mentis te dará una pista conceptual para desbloquearte.
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedChatId || summaryLoading) return
                              const messages = chatMessages[selectedChatId] ?? []
                              if (messages.length === 0) return
                              setSummaryLoading(true)
                              setSummaryOpen(true)
                              setSummaryText(null)
                              try {
                                const res = await fetch('/api/learning-summary', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    messages: messages.map((m) => ({ role: m.role, content: m.content })),
                                    sourceId: selectedChatId,
                                  }),
                                })
                                const data = await res.json()
                                setSummaryText(data?.summary ?? 'No se pudo generar el resumen.')
                              } catch {
                                setSummaryText('Error al generar el resumen.')
                              } finally {
                                setSummaryLoading(false)
                              }
                            }}
                            disabled={summaryLoading || !selectedChatId || (chatMessages[selectedChatId]?.length ?? 0) === 0}
                            className="w-full py-2.5 px-4 rounded-xl bg-white border-2 border-mentis-navy/20 text-mentis-navy font-semibold text-xs uppercase tracking-wider hover:bg-mentis-yellow/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                          >
                            {summaryLoading ? 'Generando…' : '📋 Mini resumen'}
                          </button>
                          <p className="text-[10px] text-mentis-navy/50 text-center leading-snug">
                            Resumen y tips de lo aprendido en el chat.
                          </p>
                        </div>
                      </div>
                    )}
                  </aside>
                </div>
                )}

                {/* Modal Mini resumen */}
                {summaryOpen && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                    onClick={() => setSummaryOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Mini resumen"
                  >
                    <div
                      className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col border-2 border-mentis-yellow/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-6 py-4 border-b border-mentis-yellow/40 flex items-center justify-between">
                        <h3 className="font-bold text-mentis-navy uppercase tracking-wider text-sm">
                          Mini resumen
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSummaryOpen(false)}
                          className="text-mentis-navy/70 hover:text-mentis-navy text-xl leading-none"
                          aria-label="Cerrar"
                        >
                          ×
                        </button>
                      </div>
                      <div className="p-6 overflow-y-auto flex-1 scrollbar-mentis">
                        {summaryLoading ? (
                          <p className="text-mentis-navy/70">Generando resumen…</p>
                        ) : summaryText ? (
                          <div className="text-mentis-navy whitespace-pre-wrap text-sm leading-relaxed">
                            {summaryText}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel de chat (panel 2) */}
                <section className="flex-1 flex flex-col relative">
                  <div className="px-8 py-5 border-b border-mentis-yellow/40 flex items-center justify-center">
                    <h3 className="text-sm md:text-base font-semibold text-mentis-navy tracking-[0.25em] uppercase">
                      {subjects.find((s) => s.id === selectedSubjectId)?.name}
                    </h3>
                  </div>

                  <div className="flex-1 flex flex-col py-4 gap-4 pr-0">
                    <div
                      ref={messagesContainerRef}
                      className={`flex-1 max-h-[calc(100vh-260px)] overflow-y-auto pl-4 md:pl-8 pr-4 pb-4 scrollbar-mentis ${
                        currentMessages.length === 0 ? 'flex items-center justify-center' : ''
                      }`}
                    >
                      <div className={`w-full max-w-3xl ${currentMessages.length === 0 ? 'mx-auto' : 'mx-auto'}`}>
                        {currentMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center w-full">
                            <p className="text-xl md:text-2xl font-semibold text-mentis-navy mb-6 text-center max-w-lg">
                              {getInitialGreeting(selectedSubjectName)}
                            </p>
                            <p className="text-sm text-mentis-navy/60 mb-4 text-center">
                              Indica el tema concreto (ej: áreas, integrales, funciones) para empezar.
                            </p>
                            <form
                              className="w-full max-w-xl"
                              onSubmit={async (e) => {
                                e.preventDefault()
                                if (!chatPrompt.trim() || isSending) return
                                let chatId = selectedChatId
                                if (!chatId) {
                                  const subjectId = selectedSubjectId || 'language'
                                  chatId = `${subjectId}-${Date.now()}`
                                  const subjectName = subjects.find((s) => s.id === subjectId)?.name || 'Chat'
                                  const newSession: ChatSession = {
                                    id: chatId,
                                    title: `Nuevo chat · ${subjectName}`,
                                    updatedAt: 'Ahora mismo',
                                  }
                                  setChatSessions((prev) => ({
                                    ...prev,
                                    [subjectId]: [newSession, ...(prev[subjectId] || [])],
                                  }))
                                  setSelectedChatId(chatId)
                                  setSidebarMode('chats')
                                  setGuidedStateByChatId((prev) => ({
                                    ...prev,
                                    [chatId!]: { phase: 'idle', context: { subject: selectedSubjectName } },
                                  }))
                                }
                                const userMessage = chatPrompt.trim()
                                setChatPrompt('')
                                setChatMessages((prev) => ({
                                  ...prev,
                                  [chatId]: [
                                    ...(prev[chatId] || []),
                                    { role: 'user', content: userMessage },
                                  ],
                                }))
                                syncProgressToApi({ lastChatAt: new Date().toISOString() })
                                try {
                                  setIsSending(true)
                                  const state = guidedStateByChatId[chatId] ?? { phase: 'idle', context: {} }
                                  const nextMessages = [...(chatMessages[chatId] || []), { role: 'user' as const, content: userMessage }]
                                  const res = await fetch('/api/mentor-chat', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      phase: state.phase,
                                      context: apiContext,
                                      messages: nextMessages,
                                      requestingHint: false,
                                    }),
                                  })
                                  if (!res.ok) throw new Error('Chat request failed')
                                  const data = await res.json()
                                  const reply = data?.reply ?? 'No he podido responder. Inténtalo de nuevo.'
                                  setChatMessages((prev) => ({
                                    ...prev,
                                    [chatId]: [
                                      ...(prev[chatId] || []),
                                      { role: 'assistant', content: reply },
                                    ],
                                  }))
                                  const nextPhase = data?.nextPhase ?? (state.phase === 'idle' ? 'defining_context' : state.phase)
                                  const contextUpdate = data?.contextUpdate ?? {}
                                  setGuidedStateByChatId((prev) => ({
                                    ...prev,
                                    [chatId]: {
                                      phase: nextPhase,
                                      context: { ...state.context, ...contextUpdate },
                                    },
                                  }))
                                  const points = data?.addPoints ?? 0
                                  if (points > 0) setPrPoints((p) => p + points)
                                } catch (err) {
                                  console.error(err)
                                  setChatMessages((prev) => ({
                                    ...prev,
                                    [chatId]: [
                                      ...(prev[chatId] || []),
                                      { role: 'assistant', content: 'Error al contactar con Mentis. Inténtalo de nuevo.' },
                                    ],
                                  }))
                                } finally {
                                  setIsSending(false)
                                }
                              }}
                            >
                              <div className="relative rounded-full bg-white border border-mentis-yellow/60 text-mentis-navy flex items-center px-4 py-3 shadow-sm gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSymbolPickerOpen((o) => !o)}
                                  className="shrink-0 w-9 h-9 rounded-full bg-mentis-yellow/30 hover:bg-mentis-yellow/50 text-mentis-navy font-bold text-lg flex items-center justify-center transition-colors"
                                  aria-label="Insertar símbolo"
                                >
                                  +
                                </button>
                                {symbolPickerOpen && (
                                  <div className="absolute bottom-full left-0 mb-2 p-3 rounded-xl bg-white border border-mentis-yellow/50 shadow-lg z-10 grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto">
                                    {SPECIAL_SYMBOLS.map((sym) => (
                                      <button
                                        key={sym}
                                        type="button"
                                        onClick={() => {
                                          setChatPrompt((p) => p + sym)
                                          setSymbolPickerOpen(false)
                                        }}
                                        className="w-8 h-8 rounded-lg bg-mentis-navy/5 hover:bg-mentis-yellow/40 text-mentis-navy text-sm font-medium"
                                      >
                                        {sym}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <input
                                  type="text"
                                  value={chatPrompt}
                                  onChange={(e) => setChatPrompt(e.target.value)}
                                  placeholder="Ej: Geometría, Integrales…"
                                  className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder:text-mentis-navy/40"
                                />
                                <button
                                  type="submit"
                                  disabled={isSending}
                                  className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-mentis-navy/70 hover:text-mentis-navy disabled:opacity-40"
                                >
                                  {isSending ? 'Enviando…' : 'Enviar'}
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <>
                            {currentMessages.map((m, idx) => (
                              <div
                                key={idx}
                                ref={idx === currentMessages.length - 1 ? lastMessageRef : null}
                                className={`flex w-full max-w-3xl mb-7 last:mb-2 ${
                                  m.role === 'user'
                                    ? 'justify-end'
                                    : 'justify-start'
                                }`}
                              >
                                {m.role === 'user' ? (
                                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 shadow-md bg-mentis-navy text-white text-sm md:text-base leading-relaxed">
                                    {m.content}
                                  </div>
                                ) : (
                                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[#FFF7E6] border border-mentis-yellow/40 text-mentis-navy text-sm md:text-base leading-relaxed whitespace-pre-wrap shadow-sm">
                                    {m.content}
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    {currentMessages.length > 0 && selectedChatId && (
                      <div className="w-full max-w-3xl mx-auto pl-4 md:pl-8 space-y-3">
                        <form
                          className="w-full"
                          onSubmit={async (e) => {
                            e.preventDefault()
                            if (!chatPrompt.trim() || isSending || !selectedChatId) return
                            const chatId = selectedChatId
                            const userMessage = chatPrompt.trim()
                            setChatPrompt('')
                            setChatMessages((prev) => ({
                              ...prev,
                              [chatId]: [
                                ...(prev[chatId] || []),
                                { role: 'user', content: userMessage },
                              ],
                            }))
                            try {
                              setIsSending(true)
                              const state = guidedStateByChatId[chatId] ?? { phase: 'idle', context: {} }
                              const nextMessages = [...(chatMessages[chatId] || []), { role: 'user' as const, content: userMessage }]
                              const res = await fetch('/api/mentor-chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  phase: state.phase,
                                  context: apiContext,
                                  messages: nextMessages,
                                  requestingHint: false,
                                }),
                              })
                              if (!res.ok) throw new Error('Chat request failed')
                              const data = await res.json()
                              const reply = data?.reply ?? 'No he podido responder. Inténtalo de nuevo.'
                              setChatMessages((prev) => ({
                                ...prev,
                                [chatId]: [
                                  ...(prev[chatId] || []),
                                  { role: 'assistant', content: reply },
                                ],
                              }))
                              const nextPhase = data?.nextPhase ?? state.phase
                              const contextUpdate = data?.contextUpdate ?? {}
                              setGuidedStateByChatId((prev) => ({
                                ...prev,
                                [chatId]: {
                                  phase: nextPhase,
                                  context: { ...state.context, ...contextUpdate },
                                },
                              }))
                              const points = data?.addPoints ?? 0
                              if (points > 0) setPrPoints((p) => p + points)
                            } catch (err) {
                              console.error(err)
                              setChatMessages((prev) => ({
                                ...prev,
                                [chatId]: [
                                  ...(prev[chatId] || []),
                                  { role: 'assistant', content: 'Error al contactar con Mentis. Inténtalo de nuevo.' },
                                ],
                              }))
                            } finally {
                              setIsSending(false)
                            }
                          }}
                        >
                          <div className="relative rounded-full bg-white border border-mentis-yellow/60 text-mentis-navy flex items-center px-4 py-3 shadow-sm gap-2">
                            <button
                              type="button"
                              onClick={() => setSymbolPickerOpen((o) => !o)}
                              className="shrink-0 w-9 h-9 rounded-full bg-mentis-yellow/30 hover:bg-mentis-yellow/50 text-mentis-navy font-bold text-lg flex items-center justify-center transition-colors"
                              aria-label="Insertar símbolo"
                            >
                              +
                            </button>
                            {symbolPickerOpen && (
                              <div className="absolute bottom-full left-0 mb-2 p-3 rounded-xl bg-white border border-mentis-yellow/50 shadow-lg z-10 grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto">
                                {SPECIAL_SYMBOLS.map((sym) => (
                                  <button
                                    key={sym}
                                    type="button"
                                    onClick={() => {
                                      setChatPrompt((p) => p + sym)
                                      setSymbolPickerOpen(false)
                                    }}
                                    className="w-8 h-8 rounded-lg bg-mentis-navy/5 hover:bg-mentis-yellow/40 text-mentis-navy text-sm font-medium"
                                  >
                                    {sym}
                                  </button>
                                ))}
                              </div>
                            )}
                            <input
                              type="text"
                              value={chatPrompt}
                              onChange={(e) => setChatPrompt(e.target.value)}
                              placeholder="Escribe tu razonamiento o respuesta…"
                              className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder:text-mentis-navy/40"
                            />
                            <button
                              type="submit"
                              disabled={isSending}
                              className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-mentis-navy/70 hover:text-mentis-navy disabled:opacity-40"
                            >
                              {isSending ? 'Enviando…' : 'Enviar'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </section>
              </section>
            )}
          </>
        ) : (
          // Assignments: KPIs de progreso para el alumno (mismo estilo que Missions)
          <section className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-mentis-navy/60 mb-2">
                Bienvenue, {studentName}
              </p>
              <h1 className="text-4xl md:text-5xl font-extrabold text-mentis-navy tracking-wide mb-4">
                ASSIGNMENTS
              </h1>
              <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-mentis-navy/55">
                Tu progreso y métricas con Mentis
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-[32px] bg-white shadow-md border border-mentis-yellow/40 px-6 py-6 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/60 mb-1">
                  Puntos PR
                </p>
                <p className="text-3xl font-extrabold text-mentis-navy mt-1">{prPoints}</p>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Puntos por respuestas y progreso con Mentis
                </p>
              </div>
              <div className="rounded-[32px] bg-mentis-yellow/20 border-2 border-mentis-yellow/50 shadow-md px-6 py-6 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/90 mb-1">
                  Racha
                </p>
                <p className="text-3xl font-extrabold text-mentis-navy mt-1">{streak}</p>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Mantén la racha para sumar más
                </p>
              </div>
              <div className="rounded-[32px] bg-white shadow-md border border-mentis-yellow/40 px-6 py-6 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 mb-1">
                  Pistas usadas
                </p>
                <p className="text-3xl font-extrabold text-mentis-navy mt-1">{hintsUsed}</p>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Pedir ayuda está bien; úsalas cuando las necesites
                </p>
              </div>
              <div className="rounded-[32px] bg-mentis-navy/5 border border-mentis-yellow/40 shadow-md px-6 py-6 flex flex-col sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 mb-1">
                  Rastro de pensamiento
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-3 rounded-full bg-mentis-navy/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-mentis-yellow transition-all duration-300"
                      style={{ width: `${thoughtTracePercent}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-mentis-navy w-10">{thoughtTracePercent}%</span>
                </div>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Cuánto has trabajado el razonamiento
                </p>
              </div>
              <div className="rounded-[32px] bg-white shadow-md border border-mentis-yellow/40 px-6 py-6 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/70 mb-1">
                  Chats realizados
                </p>
                <p className="text-3xl font-extrabold text-mentis-navy mt-1">
                  {Object.values(chatSessions).reduce((acc, list) => acc + list.length, 0)}
                </p>
                <p className="text-[11px] text-mentis-navy/50 mt-2 leading-snug">
                  Sesiones de práctica con Mentis
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[32px] bg-white shadow-md border border-mentis-yellow/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-mentis-yellow/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mentis-navy/60">
                  Por asignatura
                </p>
              </div>
              <ul className="divide-y divide-mentis-yellow/20">
                {subjects.map((s) => {
                  const count = (chatSessions[s.id] || []).length
                  return (
                    <li key={s.id} className="px-6 py-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-mentis-navy uppercase tracking-wide">
                        {s.name}
                      </span>
                      <span className="text-xl font-bold text-mentis-navy">{count}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        )}

        {/* Simple inline modal for creating a theme */}
        {showNewTheme && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-mentis-navy">
                  Crear nuevo target
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewTheme(false)}
                  className="text-sm text-mentis-navy/60 hover:text-mentis-navy"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={handleCreateTheme} className="space-y-4">
                <div>
                  <label
                    htmlFor="themeNameTarget"
                    className="block text-xs font-medium text-mentis-navy mb-1 uppercase tracking-wide"
                  >
                    Nombre del target
                  </label>
                  <input
                    id="themeNameTarget"
                    type="text"
                    required
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none text-sm"
                    placeholder="Pokémon, Lego, Animales..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTheme(false)}
                    className="px-4 py-2 text-sm rounded-full border border-gray-300 text-mentis-navy/70 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm rounded-full bg-mentis-navy text-white font-semibold hover:bg-mentis-navy/90"
                  >
                    Crear universo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
