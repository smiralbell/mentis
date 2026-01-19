'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/**
 * Register School Page
 * 
 * Allows schools to create an account.
 * Creates an organization and an ORGANIZATION_ADMIN user.
 */
export default function RegisterSchoolPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    schoolName: '',
    email: '',
    password: '',
    approxStudents: '',
    adminCode: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to register school')
        setLoading(false)
        return
      }

      // Redirect to login page with success message
      router.push('/login?registered=true')
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
              Register Your School
            </h1>
            <p className="text-mentis-navy/70">
              Create your organization account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-mentis-navy mb-1">
                School Name
              </label>
              <input
                id="schoolName"
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none"
                placeholder="Acme High School"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-mentis-navy mb-1">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none"
                placeholder="admin@school.com"
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
              <label htmlFor="approxStudents" className="block text-sm font-medium text-mentis-navy mb-1">
                Approximate number of students
              </label>
              <input
                id="approxStudents"
                type="number"
                min={1}
                max={100000}
                required
                value={formData.approxStudents}
                onChange={(e) =>
                  setFormData({ ...formData, approxStudents: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none"
                placeholder="e.g. 450"
              />
              <p className="mt-1 text-xs text-mentis-navy/60">
                We use this only for capacity planning. You can approximate.
              </p>
            </div>

            <div>
              <label htmlFor="adminCode" className="block text-sm font-medium text-mentis-navy mb-1">
                Optional admin code (student join code)
              </label>
              <input
                id="adminCode"
                type="text"
                value={formData.adminCode}
                onChange={(e) =>
                  setFormData({ ...formData, adminCode: e.target.value.toUpperCase() })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-mentis-yellow focus:border-transparent outline-none uppercase"
                placeholder="e.g. WEFH, MENTIS01 (students will use this to join)"
              />
              <p className="mt-1 text-xs text-mentis-navy/60">
                If you set a code here, it will be used as the first join code for your school.
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
              className="w-full bg-mentis-navy text-white py-3 px-6 rounded-xl font-medium hover:bg-mentis-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Register School'}
            </button>
          </form>

          <div className="mt-6 text-center">
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


