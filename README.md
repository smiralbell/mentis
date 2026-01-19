# MENTIS - Edtech SaaS MVP

MENTIS is a B2B edtech platform for schools. This MVP focuses on authentication, signup flows, and role separation.

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (external, hosted by user)
- **ORM**: Prisma (schema only, no migrations)
- **Auth**: NextAuth.js (for email/password) + custom student flow
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (external, hosted by user)
- Environment variables configured

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run db:generate
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in `DATABASE_URL` (PostgreSQL connection string)
   - Generate `AUTH_SECRET` (run: `openssl rand -base64 32`)
   - Set `NEXTAUTH_URL` (for development: `http://localhost:3000`)

4. Create database tables:
   - Connect to your PostgreSQL database
   - Execute the SQL scripts in `sql/create_tables.sql`
   - **DO NOT** run Prisma migrations - tables must be created manually

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

All sensitive configuration comes from `.env`:

- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Secret for NextAuth.js (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Base URL for the application (e.g., `http://localhost:3000`)

## Database Setup

**IMPORTANT**: Do NOT run Prisma migrations. Tables must be created manually.

1. Connect to your PostgreSQL database
2. Execute all SQL statements in `sql/create_tables.sql`
3. Verify tables were created correctly

The Prisma schema (`prisma/schema.prisma`) is for reference only and is used to generate the Prisma client.

## User Roles

- **ORGANIZATION_ADMIN**: Can create organizations, invite teachers, create classes, generate join codes
- **TEACHER**: Belongs to an organization, can be invited by admins
- **STUDENT**: Joins via invitation code, no email/password required

## Signup Flows

### 1. Register School
- Path: `/register-school`
- Creates an organization and an ORGANIZATION_ADMIN user
- Requires: School name, admin email, password

### 2. Student Access
- Path: `/student-access`
- Creates a STUDENT user linked to organization and class via join code
- Requires: Name (or alias), join code
- No email or password required

### 3. Login
- Path: `/login`
- Email/password authentication for Organization Admins and Teachers
- Redirects to `/dashboard` after successful login

## Project Structure

```
mentis/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/route.ts    # NextAuth configuration
│   │       ├── register-school/route.ts  # School registration API
│   │       └── student-signup/route.ts   # Student signup API
│   ├── dashboard/
│   │   └── page.tsx                       # Placeholder page after login
│   ├── login/
│   │   └── page.tsx                       # Login page
│   ├── register-school/
│   │   └── page.tsx                       # School registration page
│   ├── student-access/
│   │   └── page.tsx                       # Student access page
│   ├── layout.tsx                         # Root layout
│   ├── page.tsx                           # Landing page
│   └── providers.tsx                     # Auth provider wrapper
├── lib/
│   ├── auth.ts                            # Auth utilities (hashing, join codes)
│   ├── prisma.ts                          # Prisma client singleton
│   └── validations.ts                     # Zod validation schemas
├── prisma/
│   └── schema.prisma                      # Prisma schema (reference only)
├── sql/
│   └── create_tables.sql                  # SQL scripts for manual table creation
├── types/
│   └── next-auth.d.ts                     # NextAuth type definitions
└── middleware.ts                          # Route protection middleware
```

## Deployment on EasyPanel

1. Ensure all environment variables are set in EasyPanel
2. Build the application: `npm run build`
3. Start the application: `npm start`
4. Ensure PostgreSQL database is accessible from your deployment environment

## Security Notes

- Passwords are hashed using bcrypt (12 rounds)
- Join codes are randomly generated and can be expirable
- Session management via NextAuth.js with JWT strategy
- SQL injection protection via Prisma ORM

## Future Features

This MVP is a foundation. Future features will include:
- Teacher invitation system
- Class management
- Join code generation UI
- Student dashboards
- Mission/cognitive features
- Analytics

## License

Private - MENTIS



