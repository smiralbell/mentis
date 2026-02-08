import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateJoinCode } from '@/lib/auth'
import { registerSchoolSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

/**
 * Register School API
 * 
 * Creates a new organization and an ORGANIZATION_ADMIN user.
 * This is the entry point for schools to join MENTIS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchoolSchema.parse({
      ...body,
      // Ensure approxStudents is a number (it comes as string from the form)
      approxStudents:
        typeof body.approxStudents === 'string'
          ? Number(body.approxStudents)
          : body.approxStudents,
    })

    const normalizedAdminCode =
      validatedData.adminCode && validatedData.adminCode.trim().length > 0
        ? validatedData.adminCode.trim().toUpperCase()
        : null

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password)

    // Create organization, default class, and admin user in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Create organization
      const organization = await tx.organization.create({
        data: {
          name: validatedData.schoolName,
          approxStudentCount: validatedData.approxStudents,
          adminCode: normalizedAdminCode,
        },
      })

      // 2) Create admin user
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          passwordHash,
          name: validatedData.email.split('@')[0], // Default name from email
          role: 'ORGANIZATION_ADMIN',
          organizationId: organization.id,
        },
      })

      // 3) Create a default class for this organization
      const defaultClass = await tx.class.create({
        data: {
          name: 'Default Class',
          organizationId: organization.id,
          createdById: user.id,
        },
      })

      // 4) Create an initial join code for that class
      // If the admin provided a custom code, reuse it as the join code.
      // Otherwise, generate a random secure code.
      const code = normalizedAdminCode ?? generateJoinCode()
      const joinCode = await tx.joinCode.create({
        data: {
          code,
          classId: defaultClass.id,
          organizationId: organization.id,
          createdById: user.id,
        },
      })

      return { organization, user, defaultClass, joinCode }
    })

    return NextResponse.json(
      {
        message: 'School registered successfully',
        userId: result.user.id,
        organizationId: result.organization.id,
        // Initial join code for testing the student flow
        initialJoinCode: result.joinCode.code,
        defaultClassId: result.defaultClass.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    // Database unreachable (server down, firewall, wrong host/port)
    const isConnectionError =
      error.name === 'PrismaClientInitializationError' ||
      error.code === 'P1001' ||
      (error.message && typeof error.message === 'string' && error.message.includes("Can't reach database server"))

    if (isConnectionError) {
      console.error('Database connection error:', error.message)
      return NextResponse.json(
        {
          error: 'No se puede conectar a la base de datos.',
          details: 'Comprueba que el servidor en panel.agenciabuffalo.es:5434 esté en ejecución y accesible (firewall, VPN).',
        },
        { status: 503 }
      )
    }

    // Check if it's a database schema error (missing columns)
    if (error.code === 'P2001' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.error('Database schema error:', error)
      return NextResponse.json(
        {
          error: 'Database schema mismatch. Please add the new columns to the organizations table.',
          details: 'Run: ALTER TABLE organizations ADD COLUMN approx_student_count INTEGER; ALTER TABLE organizations ADD COLUMN admin_code VARCHAR(100);'
        },
        { status: 500 }
      )
    }

    console.error('Register school error:', error)
    return NextResponse.json(
      {
        error: 'Failed to register school. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}


