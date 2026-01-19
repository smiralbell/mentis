# MENTIS Architecture Decisions

## Authentication Strategy

### Why NextAuth.js?

We chose NextAuth.js for the following reasons:
1. **Simplified session management**: Handles JWT tokens, cookies, and session refresh automatically
2. **Security**: Built-in CSRF protection, secure cookie handling
3. **Extensibility**: Easy to add OAuth providers in the future
4. **Type safety**: Full TypeScript support with custom type definitions

### Authentication Flows

#### 1. Organization Admin / Teacher Flow
- **Method**: Email + Password via NextAuth Credentials Provider
- **Process**: 
  - User enters email/password
  - Credentials are verified against database (bcrypt hash comparison)
  - Session created with JWT containing user role and organization ID
- **Security**: Passwords hashed with bcrypt (12 rounds)

#### 2. Student Flow
- **Method**: Name + Join Code (no email/password)
- **Process**:
  1. Student enters name and join code
  2. Join code is verified (checks expiration, max uses, active status)
  3. Student account created (no email/password)
  4. Student enrolled in class associated with join code
  5. Session created using custom 'student' NextAuth provider
- **Security Note (MVP)**: Student provider accepts userId only. Acceptable for MVP since students don't have sensitive data. In production, consider adding one-time tokens or timestamp verification.

## Database Design

### Tables

1. **organizations**: Schools/organizations
2. **users**: All users (admins, teachers, students)
   - `email` and `passwordHash` are nullable (students don't have them)
   - `role` enum: ORGANIZATION_ADMIN, TEACHER, STUDENT
3. **classes**: Classes within organizations
4. **enrollments**: Many-to-many relationship between students and classes
5. **join_codes**: Invitation codes for students to join classes
   - Supports expiration dates
   - Supports max uses (null = unlimited)
   - Tracks current usage

### Key Design Decisions

- **No Prisma Migrations**: Tables created manually via SQL for EasyPanel deployment compatibility
- **Cascade Deletes**: When organization is deleted, all related data is cleaned up
- **UUID Primary Keys**: Better for distributed systems, avoids ID enumeration
- **Indexes**: Added on foreign keys and frequently queried fields (email, join codes)

## API Routes

### `/api/auth/register-school`
- Creates organization and ORGANIZATION_ADMIN user
- Validates input with Zod
- Returns user and organization IDs

### `/api/auth/student-signup`
- Verifies join code
- Creates student user (no email/password)
- Creates enrollment
- Increments join code usage
- Returns student ID for session creation

### `/api/auth/[...nextauth]`
- NextAuth.js handler
- Two providers:
  - Default: Email/password for admins and teachers
  - Student: UserId-based for students (MVP only)

## Frontend Pages

### Landing Page (`/`)
- Two clear CTAs: "Register School" and "Student Access"
- Clean, minimal design with warm yellow accent

### Register School (`/register-school`)
- Form: School name, admin email, password
- Creates organization and admin account
- Redirects to login on success

### Student Access (`/student-access`)
- Form: Name, join code
- Creates student account and enrollment
- Creates session automatically
- Redirects to dashboard

### Login (`/login`)
- Email/password form
- Uses NextAuth signIn
- Redirects to dashboard on success

### Dashboard (`/dashboard`)
- Protected route (requires authentication)
- Shows placeholder message for all roles
- Displays user name and role

## Security Considerations

### Implemented
- Password hashing (bcrypt, 12 rounds)
- SQL injection protection (Prisma ORM)
- CSRF protection (NextAuth)
- Secure session management (JWT in HTTP-only cookies)
- Route protection (middleware)

### MVP Limitations (To Address in Production)
- Student authentication: Currently accepts userId only. Should add:
  - One-time tokens with expiration
  - Timestamp verification (only allow within X minutes of signup)
  - Additional verification mechanisms
- Join code security: Consider rate limiting, IP-based restrictions
- Email verification: Not implemented in MVP
- Password reset: Not implemented in MVP

## Styling

- **Framework**: Tailwind CSS
- **Design System**: 
  - Warm yellow (`#F5D76E`) for accents
  - Soft whites for backgrounds
  - Dark navy (`#1A1F3A`) for text
  - Rounded components (xl, 2xl border radius)
- **Philosophy**: Clean, minimal, startup-friendly (not corporate)

## Deployment

### EasyPanel Compatibility
- No hardcoded secrets (all via environment variables)
- No automatic migrations (tables created manually)
- Standard Next.js build process
- Environment variables required:
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `NEXTAUTH_URL`

## Future Enhancements

This MVP provides a solid foundation for:
- Teacher invitation system
- Class management UI
- Join code generation UI
- Student dashboards
- Mission/cognitive features
- Analytics
- Email verification
- Password reset
- Multi-factor authentication



