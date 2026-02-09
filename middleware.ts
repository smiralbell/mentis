import { withAuth } from 'next-auth/middleware'

/**
 * Middleware for protecting routes
 * 
 * Protects the /dashboard route - users must be authenticated.
 * Other routes (/, /login, /register-school, /student-access) are public.
 */
export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/dashboard/:path*', '/organizer/:path*'],
}





