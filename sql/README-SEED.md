# Datos sintéticos para MENTIS

Para rellenar las tablas de PostgreSQL y ver el **panel del organizador** con datos de ejemplo:

## 1. Base de datos lista

Asegúrate de que:

- PostgreSQL está en marcha y accesible.
- Las tablas están creadas (ejecuta los scripts en `sql/`: `create_tables.sql`, `create_student_progress.sql`, `create_learning_summaries.sql`).
- En la raíz del proyecto tienes un `.env` con `DATABASE_URL` apuntando a tu Postgres.

## 2. Ejecutar el seed

Desde la raíz del proyecto:

```bash
npm run db:seed
```

Esto crea:

- **1 organización**: Colegio Demo MENTIS
- **1 organizador** y **1 profesor** (con email y contraseña)
- **12 estudiantes** con nombres sintéticos
- **2 clases** (Primero A, Primero B) y enrollments
- **Progreso** por estudiante (puntos PR, racha, último chat, pistas)
- **Resúmenes de aprendizaje** para varios estudiantes
- **1 join code** de ejemplo: `DEMOJOIN`

## 3. Ver el panel del organizador

1. Arranca la app: `npm run dev`
2. Ve a **Login** e inicia sesión con:
   - **Email:** `organizador@mentis.demo`
   - **Contraseña:** `demo1234`
3. Entra en **Dashboard** (`/dashboard`).

También puedes usar el profesor:

- **Email:** `profesor@mentis.demo`
- **Contraseña:** `demo1234`

Ambos ven el mismo panel del organizador (Vista general, Estudiantes, Resúmenes) con los datos sintéticos.
