-- =============================================================================
-- MENTIS - Datos sintéticos para rellenar tablas y ver el panel del organizador
-- Ejecutar a mano en PostgreSQL (en este orden).
-- Requisito: tablas base ya creadas (create_tables.sql).
-- Este script crea también student_progress y learning_summaries si no existen.
--
-- Login panel organizador:
--   Email:    organizador@mentis.demo
--   Password: demo1234
-- (También: profesor@mentis.demo / demo1234)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tablas student_progress y learning_summaries si no existen
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    pr_points INT NOT NULL DEFAULT 0,
    last_chat_at TIMESTAMP,
    streak INT NOT NULL DEFAULT 0,
    hints_used INT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_student_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_student_progress_user_id ON student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_pr_points ON student_progress(pr_points DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_last_chat_at ON student_progress(last_chat_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS learning_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    source_type VARCHAR(50) DEFAULT 'chat',
    source_id VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_learning_summaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_summaries_user_id ON learning_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_summaries_created_at ON learning_summaries("createdAt");

-- ========== Datos sintéticos ==========

INSERT INTO organizations (id, name, approx_student_count, admin_code, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-a000-000000000001',
  'Colegio Demo MENTIS',
  12,
  'DEMO2024',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  approx_student_count = EXCLUDED.approx_student_count,
  admin_code = EXCLUDED.admin_code,
  "updatedAt" = NOW();

-- Organizador y profesor (contraseña: demo1234, hash bcrypt 12 rounds)
INSERT INTO users (id, email, "passwordHash", name, role, "organizationId", "createdAt", "updatedAt")
VALUES
  (
    '00000000-0000-4000-a000-000000000002',
    'organizador@mentis.demo',
    '$2a$12$e2AH9eHeXPotUrY4Y.m8f.bdhs2wNSnmHnAKfU9yuMN4cox/YOA8.',
    'Ana Organizadora',
    'ORGANIZATION_ADMIN',
    '00000000-0000-4000-a000-000000000001',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-a000-000000000003',
    'profesor@mentis.demo',
    '$2a$12$e2AH9eHeXPotUrY4Y.m8f.bdhs2wNSnmHnAKfU9yuMN4cox/YOA8.',
    'Carlos Profesor',
    'TEACHER',
    '00000000-0000-4000-a000-000000000001',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  "passwordHash" = EXCLUDED."passwordHash",
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  "updatedAt" = NOW();

-- Clases
INSERT INTO classes (id, name, "organizationId", "createdById", "createdAt", "updatedAt")
VALUES
  ('00000000-0000-4000-a000-000000000010', 'Primero A', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', NOW(), NOW()),
  ('00000000-0000-4000-a000-000000000011', 'Primero B', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "updatedAt" = NOW();

-- Estudiantes (misma organización)
INSERT INTO users (id, email, "passwordHash", name, role, "organizationId", "createdAt", "updatedAt")
VALUES
  ('00000000-0000-4000-b000-000000000001', NULL, NULL, 'Lucas Martín',     'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000002', NULL, NULL, 'Sofía García',    'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000003', NULL, NULL, 'Mateo López',     'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000004', NULL, NULL, 'Valentina Rodríguez', 'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000005', NULL, NULL, 'Leo Fernández',   'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000006', NULL, NULL, 'Emma Martínez',   'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000007', NULL, NULL, 'Hugo Sánchez',    'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000008', NULL, NULL, 'Mía Pérez',       'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000009', NULL, NULL, 'Daniel González', 'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-00000000000a', NULL, NULL, 'Lucía Torres',    'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-00000000000b', NULL, NULL, 'Pablo Díaz',      'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW()),
  ('00000000-0000-4000-b000-00000000000c', NULL, NULL, 'Julia Ruiz',       'STUDENT', '00000000-0000-4000-a000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "updatedAt" = NOW();

-- Enrollments (estudiantes pares -> Primero A, impares -> Primero B)
INSERT INTO enrollments ("userId", "classId", "createdAt")
VALUES
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000010', NOW()),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000011', NOW()),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000010', NOW()),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000011', NOW()),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000010', NOW()),
  ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000011', NOW()),
  ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000010', NOW()),
  ('00000000-0000-4000-b000-000000000008', '00000000-0000-4000-a000-000000000011', NOW()),
  ('00000000-0000-4000-b000-000000000009', '00000000-0000-4000-a000-000000000010', NOW()),
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000011', NOW()),
  ('00000000-0000-4000-b000-00000000000b', '00000000-0000-4000-a000-000000000010', NOW()),
  ('00000000-0000-4000-b000-00000000000c', '00000000-0000-4000-a000-000000000011', NOW())
ON CONFLICT ("userId", "classId") DO NOTHING;

-- Join code de ejemplo
INSERT INTO join_codes (id, code, "classId", "organizationId", "createdById", "maxUses", "currentUses", "isActive", "createdAt", "updatedAt")
VALUES (
  uuid_generate_v4(),
  'DEMOJOIN',
  '00000000-0000-4000-a000-000000000010',
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  50,
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET "isActive" = true, "updatedAt" = NOW();

-- Student progress (puntos PR, racha, último chat, pistas)
INSERT INTO student_progress (user_id, pr_points, last_chat_at, streak, hints_used, "createdAt", "updatedAt")
VALUES
  ('00000000-0000-4000-b000-000000000001', 120, NOW() - INTERVAL '2 days', 3, 2, NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000002',  85, NOW() - INTERVAL '2 days', 1, 5, NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000003', 200, NOW(), 7, 0, NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000004',  45, NULL, 0, 8, NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000005', 310, NOW(), 5, 1, NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000006',  90, NOW() - INTERVAL '2 days', 2, 3, NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000007',   0, NULL, 0, 0, NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000008', 156, NOW(), 4, 4, NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000009',  78, NOW() - INTERVAL '2 days', 1, 6, NOW(), NOW()),
  ('00000000-0000-4000-b000-00000000000a', 234, NOW(), 6, 2, NOW(), NOW()),
  ('00000000-0000-4000-b000-00000000000b',  12, NULL, 0, 10, NOW(), NOW()),
  ('00000000-0000-4000-b000-00000000000c', 189, NOW(), 3, 1, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  pr_points = EXCLUDED.pr_points,
  last_chat_at = EXCLUDED.last_chat_at,
  streak = EXCLUDED.streak,
  hints_used = EXCLUDED.hints_used,
  "updatedAt" = NOW();

-- Learning summaries (varios por estudiante)
INSERT INTO learning_summaries (user_id, content, source_type, source_id, "createdAt")
VALUES
  ('00000000-0000-4000-b000-000000000002', 'Hemos repasado el área del rectángulo: A = b × h. Hicimos varios ejemplos con base 5 y altura 3. Tip: siempre comprobar las unidades (cm², m²).', 'chat', 'chat-1-0', NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-000000000003', 'Resumen de la sesión de hoy: introducción a las fracciones equivalentes. Si multiplicas numerador y denominador por el mismo número, la fracción es equivalente.', 'chat', 'chat-2-0', NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-000000000003', 'Geometría: perímetro del cuadrado P = 4 × lado. Practicamos con lado 6 cm → P = 24 cm. Relación con el área A = lado².', 'chat', 'chat-2-1', NOW() - INTERVAL '2 days'),
  ('00000000-0000-4000-b000-000000000005', 'Inglés: vocabulario de la familia (father, mother, sister, brother). Frases: "This is my..." y "I have got...".', 'chat', 'chat-4-0', NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-000000000006', 'Resumen MATHS: tabla del 7 y problemas de reparto. Dividir en partes iguales y comprobar con la multiplicación.', 'chat', 'chat-5-0', NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-000000000006', 'Lengua: lectura comprensiva del texto "El árbol generoso". Idea principal y personajes. Tips: subrayar y resumir en una frase.', 'chat', 'chat-5-1', NOW() - INTERVAL '3 days'),
  ('00000000-0000-4000-b000-000000000008', 'Repasamos los sinónimos y antónimos. Lista de palabras trabajadas: alegre/contento, rápido/lento. Próximo: prefijos y sufijos.', 'chat', 'chat-7-0', NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-000000000008', 'Ciencias: los seres vivos (nutrición, relación, reproducción). Diferencias entre animales y plantas. Resumen en esquema.', 'chat', 'chat-7-1', NOW() - INTERVAL '2 days'),
  ('00000000-0000-4000-b000-000000000008', 'Geometría: perímetro del cuadrado P = 4 × lado. Practicamos con lado 6 cm → P = 24 cm.', 'chat', 'chat-7-2', NOW() - INTERVAL '4 days'),
  ('00000000-0000-4000-b000-00000000000a', 'Resumen de la sesión: fracciones equivalentes y perímetro. Muy buen avance hoy.', 'chat', 'chat-9-0', NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-00000000000a', 'Lengua: idea principal y personajes. Tips: subrayar y resumir en una frase.', 'chat', 'chat-9-1', NOW() - INTERVAL '2 days'),
  ('00000000-0000-4000-b000-00000000000c', 'Hemos repasado el área del rectángulo: A = b × h. Tip: comprobar las unidades (cm², m²).', 'chat', 'chat-11-0', NOW() - INTERVAL '1 day');

-- Tabla learning_events (si no existe)
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    meta JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_learning_events_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_events_student_created ON learning_events(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_type_created ON learning_events(type, created_at DESC);

-- Eventos summary_created (uno por resumen existente, fechas similares)
INSERT INTO learning_events (student_id, type, meta, created_at)
SELECT user_id, 'summary_created', jsonb_build_object('source_id', "source_id"), "createdAt"
FROM learning_summaries
WHERE "createdAt" >= NOW() - INTERVAL '30 days';

-- Eventos hint_used repartidos día a día (últimos 7 días) para que el gráfico dependencia tenga datos
INSERT INTO learning_events (student_id, type, created_at)
VALUES
  ('00000000-0000-4000-b000-000000000002', 'hint_used', (CURRENT_DATE - INTERVAL '1 day') + TIME '10:00'),
  ('00000000-0000-4000-b000-000000000002', 'hint_used', (CURRENT_DATE - INTERVAL '1 day') + TIME '14:00'),
  ('00000000-0000-4000-b000-000000000004', 'hint_used', (CURRENT_DATE - INTERVAL '2 days') + TIME '09:00'),
  ('00000000-0000-4000-b000-000000000004', 'hint_used', (CURRENT_DATE - INTERVAL '2 days') + TIME '11:00'),
  ('00000000-0000-4000-b000-000000000004', 'hint_used', (CURRENT_DATE - INTERVAL '2 days') + TIME '16:00'),
  ('00000000-0000-4000-b000-000000000006', 'hint_used', (CURRENT_DATE - INTERVAL '2 days') + TIME '12:00'),
  ('00000000-0000-4000-b000-000000000008', 'hint_used', (CURRENT_DATE - INTERVAL '1 day') + TIME '15:00'),
  ('00000000-0000-4000-b000-00000000000b', 'hint_used', (CURRENT_DATE - INTERVAL '3 days') + TIME '10:00'),
  ('00000000-0000-4000-b000-00000000000b', 'hint_used', (CURRENT_DATE - INTERVAL '3 days') + TIME '13:00'),
  ('00000000-0000-4000-b000-000000000009', 'hint_used', (CURRENT_DATE - INTERVAL '4 days') + TIME '11:00'),
  ('00000000-0000-4000-b000-000000000009', 'hint_used', (CURRENT_DATE - INTERVAL '4 days') + TIME '14:00'),
  ('00000000-0000-4000-b000-000000000003', 'hint_used', (CURRENT_DATE - INTERVAL '5 days') + TIME '10:00'),
  ('00000000-0000-4000-b000-000000000005', 'hint_used', (CURRENT_DATE - INTERVAL '5 days') + TIME '12:00'),
  ('00000000-0000-4000-b000-00000000000a', 'hint_used', (CURRENT_DATE - INTERVAL '6 days') + TIME '09:00'),
  ('00000000-0000-4000-b000-00000000000a', 'hint_used', (CURRENT_DATE - INTERVAL '6 days') + TIME '15:00'),
  ('00000000-0000-4000-b000-000000000001', 'hint_used', (CURRENT_DATE - INTERVAL '0 days') + TIME '08:00'),
  ('00000000-0000-4000-b000-000000000008', 'hint_used', (CURRENT_DATE - INTERVAL '0 days') + TIME '11:00');

-- Eventos error_tag para "Errores frecuentes" (gráfico de conceptos a reforzar)
INSERT INTO learning_events (student_id, type, meta, created_at)
VALUES
  ('00000000-0000-4000-b000-000000000002', 'error_tag', '{"tag": "Cálculo mental"}'::jsonb, NOW() - INTERVAL '2 days'),
  ('00000000-0000-4000-b000-000000000002', 'error_tag', '{"tag": "Cálculo mental"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-000000000004', 'error_tag', '{"tag": "Cálculo mental"}'::jsonb, NOW() - INTERVAL '3 days'),
  ('00000000-0000-4000-b000-000000000006', 'error_tag', '{"tag": "Fracciones equivalentes"}'::jsonb, NOW() - INTERVAL '2 days'),
  ('00000000-0000-4000-b000-000000000008', 'error_tag', '{"tag": "Fracciones equivalentes"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-000000000003', 'error_tag', '{"tag": "Área y perímetro"}'::jsonb, NOW() - INTERVAL '4 days'),
  ('00000000-0000-4000-b000-000000000005', 'error_tag', '{"tag": "Área y perímetro"}'::jsonb, NOW() - INTERVAL '2 days'),
  ('00000000-0000-4000-b000-00000000000a', 'error_tag', '{"tag": "Comprensión lectora"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('00000000-0000-4000-b000-000000000009', 'error_tag', '{"tag": "Comprensión lectora"}'::jsonb, NOW() - INTERVAL '3 days'),
  ('00000000-0000-4000-b000-00000000000b', 'error_tag', '{"tag": "Orden de operaciones"}'::jsonb, NOW() - INTERVAL '2 days');

-- Tabla student_teacher_guidelines (si no existe)
CREATE TABLE IF NOT EXISTS student_teacher_guidelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL UNIQUE,
    teacher_prompt TEXT,
    private_notes TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_guidelines_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_teacher_guidelines_student_id ON student_teacher_guidelines(student_id);

-- Mini-prompts y notas para 3 estudiantes (datos de valor en detalle)
INSERT INTO student_teacher_guidelines (student_id, teacher_prompt, private_notes, "createdAt", "updatedAt")
VALUES
  ('00000000-0000-4000-b000-000000000002', 'Con Sofía usar más analogías y ejemplos visuales. Evitar saltos en la dificultad; prefiere paso a paso.', 'Muy participativa en clase.', NOW(), NOW()),
  ('00000000-0000-4000-b000-000000000005', 'Leo responde bien a retos cortos. Reforzar vocabulario en inglés con repetición espaciada.', NULL, NOW(), NOW()),
  ('00000000-0000-4000-b000-00000000000a', 'Lucía va muy bien en mates. Darle problemas de una etapa más cuando termine el bloque.', 'Objetivo: ampliación.', NOW(), NOW())
ON CONFLICT (student_id) DO UPDATE SET
  teacher_prompt = EXCLUDED.teacher_prompt,
  private_notes = EXCLUDED.private_notes,
  "updatedAt" = NOW();

-- Listo. Login: organizador@mentis.demo / demo1234  →  /dashboard
