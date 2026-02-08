'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

/**
 * Student Access Page
 *
 * Students sign up to MENTIS as students.
 * They need:
 * - name
 * - email
 * - password
 * - organization code (provided by the school)
 */
export default function StudentAccessPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    orgCode: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/student-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create student account')
        setLoading(false)
        return
      }

      // Log in with the student provider so the session has role STUDENT (not credentials/admin)
      const signInResponse = await signIn('student', {
        userId: data.userId,
        redirect: false,
      })

      if (signInResponse?.error) {
        setError('Failed to create session. Please try logging in again.')
        setLoading(false)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFCF00]">
      {/* Bubbles / circles background */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full bg-[#FFE27A]" />
      <div className="pointer-events-none absolute right-[-220px] top-10 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-[#D8DEE9] to-[#9FA6B2]" />
      <div className="pointer-events-none absolute bottom-[-260px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#FFEFAF]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-mentis-navy mb-2">
              Student Sign Up
            </h1>
            <p className="text-mentis-navy/70">
              Create your student account with your school code
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-mentis-navy mb-1">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                required
                minLength={2}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none"
                placeholder="Enter your name or alias"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-mentis-navy mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none"
                placeholder="you@student.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-mentis-navy mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="orgCode" className="block text-sm font-medium text-mentis-navy mb-1">
                Organization Code
              </label>
              <input
                id="orgCode"
                type="text"
                required
                value={formData.orgCode}
                onChange={(e) =>
                  setFormData({ ...formData, orgCode: e.target.value.toUpperCase() })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none font-mono uppercase"
                placeholder="School code (e.g. MENTIS01)"
                maxLength={50}
              />
              <p className="mt-1 text-xs text-mentis-navy/60">
                Ask your teacher or school admin for this code.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mentis-yellow text-mentis-navy py-3 px-6 rounded-xl font-medium hover:bg-mentis-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Class'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-mentis-navy/60 mb-2">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-mentis-navy hover:underline">
                Sign in
              </Link>
            </p>
            <Link
              href="/"
              className="text-sm text-mentis-navy/70 hover:text-mentis-navy transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

