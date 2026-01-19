'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type ThemeCard = {
  id: string
  name: string
  icon: string
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
    return null
  }

  if (session.user.role === 'STUDENT') {
    return <StudentDashboard studentName={session.user.name} />
  }

  const roleDisplayName = {
    ORGANIZATION_ADMIN: 'Organization Admin',
    TEACHER: 'Teacher',
    STUDENT: 'Student',
  }[session.user.role] || session.user.role

  return (
    <div className="min-h-screen bg-gradient-to-br from-mentis-white via-mentis-yellow-light to-mentis-yellow">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-mentis-navy mb-4">
              Welcome to MENTIS
            </h1>
            <p className="text-lg text-mentis-navy/70 mb-2">
              Logged in as <span className="font-semibold">{session.user.name}</span>
            </p>
            <p className="text-sm text-mentis-navy/60">
              Role: {roleDisplayName}
            </p>
          </div>

          <div className="bg-mentis-yellow/20 border-2 border-mentis-yellow rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-mentis-navy mb-4">
              🚧 Under Construction
            </h2>
            <p className="text-mentis-navy/80 text-lg leading-relaxed">
              We are building this section. Core features coming soon.
            </p>
          </div>

          <div className="space-y-2 text-sm text-mentis-navy/60">
            <p>MENTIS is under construction. Core cognitive features are coming soon.</p>
            <p className="pt-4">
              <Link
                href="/api/auth/signout"
                className="text-mentis-navy hover:underline font-medium"
              >
                Sign out
              </Link>
            </p>
          </div>
        </div>
      </div>
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
  const [newThemeIcon, setNewThemeIcon] = useState('UV')
  const [view, setView] = useState<'missions' | 'teachers'>('missions')

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThemeName.trim()) return

    setThemes((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: newThemeName.trim(),
        icon: (newThemeIcon || 'UV').toUpperCase(),
      },
    ])

    setNewThemeName('')
    setNewThemeIcon('UV')
    setShowNewTheme(false)
  }

  return (
    <div className="min-h-screen bg-[#FFFBEA]">
      {/* Top navigation bar */}
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
              Enseignants
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

      {/* Main content */}
      <main className="px-6 py-10 md:px-16 md:py-12">
        {view === 'missions' ? (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className="group rounded-[32px] bg-white shadow-md px-6 py-7 flex flex-col items-center gap-4 hover:-translate-y-1 hover:shadow-lg transition-all"
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
                  className="rounded-[32px] border-2 border-dashed border-mentis-yellow/70 bg-white/60 px-6 py-7 flex flex-col items-center justify-center gap-3 hover:bg-white hover:-translate-y-1 hover:shadow-md transition-all"
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
          // Teacher-style summary panel (read-only, placeholder)
          <section className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold text-mentis-navy tracking-wide mb-3">
                CENTRE DE PILOTAGE
              </h1>
              <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-mentis-navy/55">
                SURVEILLANCE DE L&apos;ÉVOLUTION COGNITIVE CE1
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left: list */}
              <div className="flex-1 bg-white rounded-[40px] shadow-xl overflow-hidden">
                <div className="px-10 py-6 border-b border-gray-100 flex text-xs font-semibold text-mentis-navy/50 tracking-wide uppercase">
                  <div className="w-2/5">Sujet d&apos;analyse</div>
                  <div className="w-1/5">Phase / Stade</div>
                  <div className="w-1/5">Autonomie tactique</div>
                  <div className="w-1/5 text-right">Points logiques</div>
                </div>

                <div className="divide-y divide-gray-100 text-sm">
                  {[
                    { name: 'Luk', stage: 'Stade 1.1', tag: 'Moyenne', tagColor: 'bg-mentis-yellow/60', points: 1250 },
                    { name: 'Koa', stage: 'Stade 1.3', tag: 'Faible', tagColor: 'bg-red-100 text-red-600', points: 980 },
                    { name: 'Marc Planas', stage: 'Stade 2.2', tag: 'Super', tagColor: 'bg-green-100 text-emerald-600', points: 3400 },
                  ].map((row) => (
                    <div key={row.name} className="px-10 py-6 flex items-center">
                      <div className="w-2/5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-[#F1F5F9] flex items-center justify-center shadow">
                          <span className="text-xs font-bold text-mentis-navy tracking-wide uppercase">
                            {row.name
                              .split(' ')
                              .map((p) => p[0])
                              .join('')
                              .slice(0, 3)}
                          </span>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-mentis-navy uppercase tracking-wide">
                            {row.name}
                          </p>
                          <p className="text-[11px] text-mentis-navy/60 uppercase tracking-[0.2em]">
                            CE1 • Escouade Delta
                          </p>
                        </div>
                      </div>

                      <div className="w-1/5">
                        <span className="inline-flex rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-mentis-navy">
                          {row.stage}
                        </span>
                      </div>

                      <div className="w-1/5">
                        <span className={`inline-flex rounded-full px-4 py-1 text-xs font-semibold ${row.tagColor}`}>
                          {row.tag}
                        </span>
                      </div>

                      <div className="w-1/5 text-right text-2xl font-extrabold text-mentis-navy">
                        {row.points}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-10 py-4 text-[11px] text-mentis-navy/50 border-t border-gray-100 flex justify-between">
                  <span>© 2025 MENTIS • INFRASTRUCTURE D&apos;APPRENTISSAGE ADAPTATIF</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-mentis-yellow" />
                    MOTEUR DE PERSONNALISATION ACTIF
                  </span>
                </div>
              </div>

              {/* Right: placeholder panel */}
              <div className="hidden lg:flex lg:w-[32%] items-center justify-center text-center text-xs tracking-[0.35em] text-slate-300 uppercase">
                <div>
                  <div className="mb-6">
                    <div className="mx-auto h-20 w-20 rounded-3xl border border-slate-200 flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <p>Sélectionnez un sujet</p>
                  <p>pour l&apos;audit</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Simple inline modal for creating a theme */}
        {showNewTheme && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-mentis-navy">
                  Crear nueva temática
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
                    htmlFor="themeName"
                    className="block text-xs font-medium text-mentis-navy mb-1 uppercase tracking-wide"
                  >
                    Nombre de la temática
                  </label>
                  <input
                    id="themeName"
                    type="text"
                    required
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none text-sm"
                    placeholder="Pokémon, Lego, Animales..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="themeIcon"
                    className="block text-xs font-medium text-mentis-navy mb-1 uppercase tracking-wide"
                  >
                    Icon badge (2 letters)
                  </label>
                  <input
                    id="themeIcon"
                    type="text"
                    maxLength={3}
                    value={newThemeIcon}
                    onChange={(e) => setNewThemeIcon(e.target.value.toUpperCase())}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none text-sm text-center uppercase tracking-wide"
                    placeholder="UV"
                  />
                  <p className="mt-1 text-[11px] text-mentis-navy/60">
                    Usa 1–2 letras para identificar tu mundo (p. ej. PK, FB, AN).
                  </p>
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
