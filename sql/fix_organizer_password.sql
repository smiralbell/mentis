-- Fija la contraseña del organizador a: demo1234
-- Ejecutar en PostgreSQL si el login falla con organizador@mentis.demo / demo1234
-- (Hash bcrypt 12 rounds generado con bcryptjs)

UPDATE users
SET "passwordHash" = '$2a$12$4U/FQhS1Cv42ADpXcWkM.esD2NWo4ULgKvbzsf.tdMIT3heX4jgN6',
    "updatedAt" = NOW()
WHERE email = 'organizador@mentis.demo';

-- Opcional: mismo para el profesor
UPDATE users
SET "passwordHash" = '$2a$12$4U/FQhS1Cv42ADpXcWkM.esD2NWo4ULgKvbzsf.tdMIT3heX4jgN6',
    "updatedAt" = NOW()
WHERE email = 'profesor@mentis.demo';

-- Comprobar: debería devolver 1 o 2 filas
-- SELECT email, "passwordHash" IS NOT NULL AS has_password FROM users WHERE email IN ('organizador@mentis.demo', 'profesor@mentis.demo');
