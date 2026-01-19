# Variables de Entorno - MENTIS

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

## Variables Requeridas

### 1. DATABASE_URL
**Descripción**: Cadena de conexión a tu base de datos PostgreSQL

**Formato**:
```
DATABASE_URL="postgresql://usuario:contraseña@host:puerto/nombre_base_datos?schema=public"
```

**Ejemplos**:
- Local: `postgresql://postgres:mi_password@localhost:5432/mentis?schema=public`
- Remoto: `postgresql://usuario:password@db.ejemplo.com:5432/mentis?schema=public`

**Cómo obtenerla**: 
- Si usas un servicio como Supabase, Railway, o Neon, te la proporcionan en el panel
- Si tienes PostgreSQL local, usa tus credenciales

---

### 2. AUTH_SECRET
**Descripción**: Secreto para firmar los tokens JWT de NextAuth.js

**Cómo generarlo**:

**En Windows (PowerShell)**:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**En Linux/Mac**:
```bash
openssl rand -base64 32
```

**O en Node.js**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Ejemplo de valor generado**:
```
AUTH_SECRET="aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1pQ="
```

⚠️ **IMPORTANTE**: Este valor debe ser único y secreto. No lo compartas ni lo subas a Git.

---

### 3. NEXTAUTH_URL
**Descripción**: URL base de tu aplicación

**Para desarrollo local**:
```
NEXTAUTH_URL="http://localhost:3000"
```

**Para producción**:
```
NEXTAUTH_URL="https://tu-dominio.com"
```

---

## Ejemplo de archivo .env completo

```env
# Database
DATABASE_URL="postgresql://postgres:mi_password_segura@localhost:5432/mentis?schema=public"

# NextAuth
AUTH_SECRET="tu_secreto_generado_aqui_muy_largo_y_aleatorio_1234567890abcdefghijklmnopqrstuvwxyz"

# NextAuth URL
NEXTAUTH_URL="http://localhost:3000"
```

---

## Pasos para configurar

1. **Crea el archivo `.env`** en la raíz del proyecto (mismo nivel que `package.json`)

2. **Copia el contenido** del ejemplo anterior

3. **Reemplaza los valores**:
   - `DATABASE_URL`: Con tu conexión real a PostgreSQL
   - `AUTH_SECRET`: Genera uno nuevo (no uses el ejemplo)
   - `NEXTAUTH_URL`: `http://localhost:3000` para desarrollo

4. **Verifica que el archivo `.env` esté en `.gitignore`** (ya está incluido)

---

## Para EasyPanel

Si vas a desplegar en EasyPanel:

1. Ve a la configuración de tu aplicación en EasyPanel
2. Busca la sección de "Environment Variables" o "Variables de Entorno"
3. Agrega las tres variables:
   - `DATABASE_URL` (tu conexión a PostgreSQL)
   - `AUTH_SECRET` (genera uno nuevo)
   - `NEXTAUTH_URL` (tu dominio de producción, ej: `https://mentis.tudominio.com`)

---

## Verificación

Después de configurar las variables, verifica que funcionen:

```bash
# Genera el cliente de Prisma (verifica DATABASE_URL)
npm run db:generate

# Inicia el servidor (verifica todas las variables)
npm run dev
```

Si hay errores, revisa que:
- ✅ `DATABASE_URL` sea válida y la base de datos esté accesible
- ✅ `AUTH_SECRET` tenga al menos 32 caracteres
- ✅ `NEXTAUTH_URL` coincida con la URL donde corre la app


