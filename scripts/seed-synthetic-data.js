/**
 * Seed script: datos sintéticos para MENTIS (organización, organizador, estudiantes, progreso, resúmenes).
 * Ejecutar desde la raíz del proyecto: node scripts/seed-synthetic-data.js
 *
 * Credenciales para ver el panel del organizador:
 *   Email:    organizador@mentis.demo
 *   Password: demo1234
 */

const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')
const path = require('path')
const fs = require('fs')

// Cargar .env si existe (sin dependencia dotenv)
const envPath = path.resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match) {
      const value = match[2].replace(/^["']|["']$/g, '').trim()
      process.env[match[1]] = value
    }
  })
}

const prisma = new PrismaClient()

const STUDENT_NAMES = [
  'Lucas Martín',
  'Sofía García',
  'Mateo López',
  'Valentina Rodríguez',
  'Leo Fernández',
  'Emma Martínez',
  'Hugo Sánchez',
  'Mía Pérez',
  'Daniel González',
  'Lucía Torres',
  'Pablo Díaz',
  'Julia Ruiz',
]

const SUMMARY_TEXTS = [
  'Hemos repasado el área del rectángulo: A = b × h. Hicimos varios ejemplos con base 5 y altura 3. Tip: siempre comprobar las unidades (cm², m²).',
  'Resumen de la sesión de hoy: introducción a las fracciones equivalentes. Si multiplicas numerador y denominador por el mismo número, la fracción es equivalente.',
  'Repasamos los sinónimos y antónimos. Lista de palabras trabajadas: alegre/contento, rápido/lento. Próximo: prefijos y sufijos.',
  'Geometría: perímetro del cuadrado P = 4 × lado. Practicamos con lado 6 cm → P = 24 cm. Relación con el área A = lado².',
  'Inglés: vocabulario de la familia (father, mother, sister, brother). Frases: "This is my..." y "I have got...".',
  'Resumen MATHS: tabla del 7 y problemas de reparto. Dividir en partes iguales y comprobar con la multiplicación.',
  'Lengua: lectura comprensiva del texto "El árbol generoso". Idea principal y personajes. Tips: subrayar y resumir en una frase.',
  'Ciencias: los seres vivos (nutrición, relación, reproducción). Diferencias entre animales y plantas. Resumen en esquema.',
]

async function main() {
  console.log('🌱 Iniciando seed de datos sintéticos...')

  const passwordHash = await hash('demo1234', 12)

  // 1. Organización
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-4000-a000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-a000-000000000001',
      name: 'Colegio Demo MENTIS',
      approxStudentCount: 12,
      adminCode: 'DEMO2024',
    },
  })
  console.log('  ✓ Organización:', org.name)

  // 2. Organizador (admin) y profesor
  const admin = await prisma.user.upsert({
    where: { email: 'organizador@mentis.demo' },
    update: { passwordHash },
    create: {
      id: '00000000-0000-4000-a000-000000000002',
      email: 'organizador@mentis.demo',
      passwordHash,
      name: 'Ana Organizadora',
      role: 'ORGANIZATION_ADMIN',
      organizationId: org.id,
    },
  })
  console.log('  ✓ Organizador:', admin.email)

  const teacher = await prisma.user.upsert({
    where: { email: 'profesor@mentis.demo' },
    update: { passwordHash },
    create: {
      id: '00000000-0000-4000-a000-000000000003',
      email: 'profesor@mentis.demo',
      passwordHash,
      name: 'Carlos Profesor',
      role: 'TEACHER',
      organizationId: org.id,
    },
  })
  console.log('  ✓ Profesor:', teacher.email)

  // 3. Clases
  const classA = await prisma.class.upsert({
    where: { id: '00000000-0000-4000-a000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-4000-a000-000000000010',
      name: 'Primero A',
      organizationId: org.id,
      createdById: admin.id,
    },
  })
  const classB = await prisma.class.upsert({
    where: { id: '00000000-0000-4000-a000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-4000-a000-000000000011',
      name: 'Primero B',
      organizationId: org.id,
      createdById: teacher.id,
    },
  })
  console.log('  ✓ Clases: Primero A, Primero B')

  // 4. Estudiantes (todos en la misma organización)
  const studentIds = []
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const id = `00000000-0000-4000-b000-${String(i + 1).padStart(12, '0')}`
    const student = await prisma.user.upsert({
      where: { id },
      update: { name: STUDENT_NAMES[i] },
      create: {
        id,
        email: null,
        passwordHash: null,
        name: STUDENT_NAMES[i],
        role: 'STUDENT',
        organizationId: org.id,
      },
    })
    studentIds.push(student.id)
  }
  console.log('  ✓ Estudiantes:', studentIds.length)

  // 5. Enrollments: repartir entre las dos clases
  for (let i = 0; i < studentIds.length; i++) {
    const classId = i % 2 === 0 ? classA.id : classB.id
    await prisma.enrollment.upsert({
      where: {
        userId_classId: { userId: studentIds[i], classId },
      },
      update: {},
      create: {
        userId: studentIds[i],
        classId,
      },
    })
  }
  console.log('  ✓ Enrollments creados')

  // 6. Join codes (opcional, para que existan)
  await prisma.joinCode.upsert({
    where: { code: 'DEMOJOIN' },
    update: {},
    create: {
      code: 'DEMOJOIN',
      classId: classA.id,
      organizationId: org.id,
      createdById: admin.id,
      maxUses: 50,
      currentUses: 0,
      isActive: true,
    },
  })
  console.log('  ✓ Join code DEMOJOIN')

  // 7. Student progress (puntos, racha, último chat, pistas)
  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < studentIds.length; i++) {
    const prPoints = [120, 85, 200, 45, 310, 90, 0, 156, 78, 234, 12, 189][i]
    const streak = [3, 1, 7, 0, 5, 2, 0, 4, 1, 6, 0, 3][i]
    const hintsUsed = [2, 5, 0, 8, 1, 3, 0, 4, 6, 2, 10, 1][i]
    const lastChatAt = i % 3 === 0 ? null : i % 3 === 1 ? twoDaysAgo : now

    await prisma.studentProgress.upsert({
      where: { userId: studentIds[i] },
      update: { prPoints, streak, hintsUsed, lastChatAt },
      create: {
        userId: studentIds[i],
        prPoints,
        lastChatAt,
        streak,
        hintsUsed,
      },
    })
  }
  console.log('  ✓ Student progress (12 estudiantes)')

  // 8. Learning summaries (varios por estudiante, variados)
  let summaryCount = 0
  for (let i = 0; i < studentIds.length; i++) {
    const numSummaries = i % 4 === 0 ? 0 : i % 4 === 1 ? 1 : i % 4 === 2 ? 2 : 3
    for (let j = 0; j < numSummaries; j++) {
      const createdAt = new Date(now.getTime() - (j + 1) * 24 * 60 * 60 * 1000)
      await prisma.learningSummary.create({
        data: {
          userId: studentIds[i],
          content: SUMMARY_TEXTS[(i + j) % SUMMARY_TEXTS.length],
          sourceType: 'chat',
          sourceId: `chat-${i}-${j}`,
          createdAt,
        },
      })
      summaryCount++
    }
  }
  console.log('  ✓ Learning summaries:', summaryCount)

  console.log('\n✅ Seed completado.')
  console.log('\n  Para ver el panel del organizador:')
  console.log('  1. Inicia la app (npm run dev)')
  console.log('  2. Login: organizador@mentis.demo / demo1234')
  console.log('  3. Ve a /dashboard')
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
