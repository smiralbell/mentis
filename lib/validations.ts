import { z } from 'zod'

// Register school form validation
export const registerSchoolSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  approxStudents: z
    .number({
      required_error: 'Number of students is required',
      invalid_type_error: 'Number of students must be a number',
    })
    .int('Number of students must be an integer')
    .min(1, 'Number of students must be at least 1')
    .max(100000, 'Number of students seems too large'),
  adminCode: z
    .string()
    .min(4, 'Admin code must be at least 4 characters')
    .max(50, 'Admin code must be at most 50 characters')
    .optional()
    .or(z.literal('')),
})

// Login form validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Student signup form validation
export const studentSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  orgCode: z
    .string()
    .trim()
    .min(4, 'Organization code must be at least 4 characters')
    .max(50, 'Organization code must be at most 50 characters'),
})

// Teacher signup form validation (for future use)
export const teacherSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organizationId: z.string().uuid('Invalid organization ID'),
})

export type RegisterSchoolInput = z.infer<typeof registerSchoolSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type StudentSignupInput = z.infer<typeof studentSignupSchema>
export type TeacherSignupInput = z.infer<typeof teacherSignupSchema>


