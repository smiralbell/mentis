import 'next-auth'

type UserRole = 'ORGANIZATION_ADMIN' | 'TEACHER' | 'STUDENT'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      organizationId: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    organizationId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    organizationId: string
  }
}



