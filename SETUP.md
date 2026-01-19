# MENTIS Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory with:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/mentis?schema=public"
   AUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```
   
   To generate `AUTH_SECRET`, run:
   ```bash
   openssl rand -base64 32
   ```

3. **Create database tables:**
   - Connect to your PostgreSQL database
   - Execute all SQL statements from `sql/create_tables.sql`
   - Verify tables were created:
     - `organizations`
     - `users`
     - `classes`
     - `enrollments`
     - `join_codes`

4. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Test the application:**
   - Visit http://localhost:3000
   - Register a school
   - Login with the admin account
   - Test student access (you'll need a join code - see below)

## Creating Test Data

### Create a Join Code (for testing student signup)

After registering a school and logging in as an admin, you can create a join code manually in the database:

```sql
-- First, create a class
INSERT INTO classes (id, name, "organizationId", "createdById")
VALUES (
  gen_random_uuid(),
  'Test Class',
  'YOUR_ORGANIZATION_ID',
  'YOUR_USER_ID'
);

-- Then create a join code
INSERT INTO join_codes (id, code, "classId", "organizationId", "createdById", "isActive")
VALUES (
  gen_random_uuid(),
  'TEST1234',
  'YOUR_CLASS_ID',
  'YOUR_ORGANIZATION_ID',
  'YOUR_USER_ID',
  true
);
```

Replace the IDs with actual values from your database.

## Notes

- **Student Sessions**: Currently, students create accounts but don't get authenticated sessions. For MVP, this is acceptable. In production, you'd want to implement a session system for students (e.g., temporary tokens or a separate auth flow).

- **No Migrations**: Prisma migrations are disabled. All database changes must be done manually via SQL.

- **EasyPanel Deployment**: Ensure all environment variables are set in EasyPanel before deployment.



