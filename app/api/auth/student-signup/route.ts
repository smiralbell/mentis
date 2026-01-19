import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { studentSignupSchema } from '@/lib/validations'
import { UserRole } from '@prisma/client'

/**
 * Student Signup API
 *
 * Students sign up with:
 * - name
 * - email
 * - password
 * - organization code (provided by the school)
 *
 * This creates a STUDENT user linked to the organization.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = studentSignupSchema.parse(body)

    const normalizedOrgCode = validatedData.orgCode.trim().toUpperCase()

    // 1) Find organization by admin code
    const organization = await prisma.organization.findFirst({
      where: { adminCode: normalizedOrgCode },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Invalid organization code' },
        { status: 400 }
      )
    }

    // 2) Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // 3) Hash password and create student
    const passwordHash = await hashPassword(validatedData.password)

    const student = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        name: validatedData.name,
        role: UserRole.STUDENT,
        organizationId: organization.id,
      },
    })

    return NextResponse.json(
      {
        message: 'Student account created successfully',
        userId: student.id,
        organizationId: organization.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const first = error.errors?.[0]
      return NextResponse.json(
        {
          error: first?.message || 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    console.error('Student signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create student account. Please try again.' },
      { status: 500 }
    )
  }
}

