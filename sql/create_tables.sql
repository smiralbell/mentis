-- MENTIS Database Schema
-- Execute these SQL statements manually in your PostgreSQL database
-- DO NOT use Prisma migrations for this MVP

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum type for user roles
CREATE TYPE "UserRole" AS ENUM ('ORGANIZATION_ADMIN', 'TEACHER', 'STUDENT');

-- SQL: organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    approx_student_count INTEGER,
    admin_code VARCHAR(100),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- If you already created the organizations table before adding these fields,
-- run the following ALTER TABLE statements manually:
-- ALTER TABLE organizations ADD COLUMN approx_student_count INTEGER;
-- ALTER TABLE organizations ADD COLUMN admin_code VARCHAR(100);

-- SQL: users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    "passwordHash" VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role "UserRole" NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_users_organization FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create indexes on users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users("organizationId");

-- SQL: classes table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_classes_organization FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_classes_creator FOREIGN KEY ("createdById") REFERENCES users(id)
);

-- Create indexes on classes table
CREATE INDEX idx_classes_organization_id ON classes("organizationId");

-- SQL: enrollments table
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_enrollments_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_class FOREIGN KEY ("classId") REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_class UNIQUE ("userId", "classId")
);

-- Create indexes on enrollments table
CREATE INDEX idx_enrollments_user_id ON enrollments("userId");
CREATE INDEX idx_enrollments_class_id ON enrollments("classId");

-- SQL: join_codes table
CREATE TABLE join_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    "classId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_join_codes_organization FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_join_codes_class FOREIGN KEY ("classId") REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_join_codes_creator FOREIGN KEY ("createdById") REFERENCES users(id)
);

-- Create indexes on join_codes table
CREATE INDEX idx_join_codes_code ON join_codes(code);
CREATE INDEX idx_join_codes_organization_id ON join_codes("organizationId");
CREATE INDEX idx_join_codes_class_id ON join_codes("classId");


