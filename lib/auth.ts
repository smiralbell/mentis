import { compare, hash } from 'bcryptjs'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash)
}

/**
 * Generate a random join code
 */
export function generateJoinCode(): string {
  // Generate a 8-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluding confusing characters
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Verify if a join code is valid and can be used
 */
export async function verifyJoinCode(code: string): Promise<{
  valid: boolean
  joinCode?: {
    id: string
    classId: string
    organizationId: string
    maxUses: number | null
    currentUses: number
    expiresAt: Date | null
    isActive: boolean
  }
  error?: string
}> {
  // Normalize code to avoid issues with lowercase / extra spaces
  const normalizedCode = code.trim().toUpperCase()

  const joinCode = await prisma.joinCode.findFirst({
    where: { code: normalizedCode },
    include: {
      class: true,
      organization: true,
    },
  })

  if (!joinCode) {
    return { valid: false, error: 'Invalid join code' }
  }

  if (!joinCode.isActive) {
    return { valid: false, error: 'This join code is no longer active' }
  }

  if (joinCode.expiresAt && joinCode.expiresAt < new Date()) {
    return { valid: false, error: 'This join code has expired' }
  }

  if (joinCode.maxUses !== null && joinCode.currentUses >= joinCode.maxUses) {
    return { valid: false, error: 'This join code has reached its maximum uses' }
  }

  return {
    valid: true,
    joinCode: {
      id: joinCode.id,
      classId: joinCode.classId,
      organizationId: joinCode.organizationId,
      maxUses: joinCode.maxUses,
      currentUses: joinCode.currentUses,
      expiresAt: joinCode.expiresAt,
      isActive: joinCode.isActive,
    },
  }
}

/**
 * Increment the usage count of a join code
 */
export async function incrementJoinCodeUsage(codeId: string): Promise<void> {
  await prisma.joinCode.update({
    where: { id: codeId },
    data: {
      currentUses: {
        increment: 1,
      },
    },
  })
}


