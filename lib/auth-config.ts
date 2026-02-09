import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'

/**
 * NextAuth Configuration
 * 
 * We use NextAuth for email/password authentication (Organization Admins and Teachers).
 * Students authenticate via a separate flow using join codes (handled in student signup API).
 * 
 * This simplifies session management and provides secure cookie-based auth.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }
        const email = credentials.email.trim().toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
          include: { organization: true },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password')
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        // Return user object that will be stored in JWT
        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        }
      },
    }),
    // Student provider - allows students to authenticate with userId
    // This is used after student signup to create a session
    // 
    // SECURITY NOTE (MVP): This accepts only userId, which is acceptable for MVP
    // since students don't have sensitive data yet. In production, consider adding:
    // - One-time tokens with expiration
    // - Timestamp verification (only allow within X minutes of signup)
    // - Additional verification mechanisms
    CredentialsProvider({
      id: 'student',
      name: 'Student',
      credentials: {
        userId: { label: 'User ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.userId) {
          throw new Error('User ID is required')
        }

        const user = await prisma.user.findUnique({
          where: { id: credentials.userId },
          include: { organization: true },
        })

        if (!user || user.role !== 'STUDENT') {
          throw new Error('Invalid student account')
        }

        // Return user object that will be stored in JWT
        return {
          id: user.id,
          email: user.email || '',
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organizationId = user.organizationId
      }
      return token
    },
    async session({ session, token }) {
      // Add custom properties to session
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.organizationId = token.organizationId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
}



