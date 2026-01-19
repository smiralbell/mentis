'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * Landing Page
 *
 * Full-screen yellow background with soft bubbles.
 * Centered card with two segmented controls:
 * 1) Login / Sign up
 * 2) Organization / Student
 */
export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [persona, setPersona] = useState<'organization' | 'student'>(
    'organization'
  )

  const handleContinue = () => {
    if (mode === 'signup') {
      if (persona === 'organization') {
        router.push('/register-school')
      } else {
        // student signup
        router.push('/student-access')
      }
      return
    }

    // Login flow (same login page for all roles)
    router.push('/login')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFCF00]">
      {/* Bubbles / circles background */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full bg-[#FFE27A]" />
      <div className="pointer-events-none absolute right-[-220px] top-10 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-[#D8DEE9] to-[#9FA6B2]" />
      <div className="pointer-events-none absolute bottom-[-260px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#FFEFAF]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-mentis-navy/60">
                MENTIS
              </p>
              <p className="mt-1 text-sm text-mentis-navy/70">
                Cognitive Learning Platform for Schools
              </p>
            </div>

            {/* Toggle: Login / Sign up */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mentis-navy/60">
                Acción
              </p>
              <div className="flex rounded-full bg-mentis-yellow/40 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                  }}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                    mode === 'login'
                      ? 'bg-mentis-navy text-white shadow-sm'
                      : 'text-mentis-navy/70'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                  }}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                    mode === 'signup'
                      ? 'bg-mentis-navy text-white shadow-sm'
                      : 'text-mentis-navy/70'
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>

            {/* Toggle: Organization / Student */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mentis-navy/60">
                Soy
              </p>
              <div className="flex rounded-full bg-mentis-yellow/40 p-1">
                <button
                  type="button"
                  onClick={() => setPersona('organization')}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                    persona === 'organization'
                      ? 'bg-[#F8FAFC] text-mentis-navy shadow-sm'
                      : 'text-mentis-navy/70'
                  }`}
                >
                  Organización
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPersona('student')
                  }}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                    persona === 'student'
                      ? 'bg-[#F8FAFC] text-mentis-navy shadow-sm'
                      : 'text-mentis-navy/70'
                  }`}
                >
                  Estudiante
                </button>
              </div>
            </div>

            {/* Continue button */}
            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-full bg-mentis-navy py-3 text-sm font-semibold text-white shadow-md hover:bg-mentis-navy/90 transition-colors"
            >
              Continuar
            </button>

            {/* Secondary links */}
            <div className="pt-2 border-t border-mentis-yellow/40 text-center space-y-1">
              <p className="text-xs text-mentis-navy/60">
                ¿Prefieres ir directo?
              </p>
              <div className="flex justify-center gap-4 text-xs">
                <Link
                  href="/register-school"
                  className="text-mentis-navy/70 hover:text-mentis-navy font-medium"
                >
                  Registrar escuela
                </Link>
                <Link
                  href="/student-access"
                  className="text-mentis-navy/70 hover:text-mentis-navy font-medium"
                >
                  Acceso estudiante
                </Link>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}

