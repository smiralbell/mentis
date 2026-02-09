# Mentis — Documentación MVP para Inversores

**Versión:** 1.0  
**Uso:** Presentación del producto, funcionamiento del MVP y métricas del panel de organizador.

---

## 1. Resumen del producto

Mentis es una plataforma B2B de **edtech** que pone el pensamiento del alumno en el centro. El MVP incluye:

- **Dos perfiles de usuario:** **Organizador** (centro/profesor) y **Estudiante**.
- **Chat pedagógico guiado** con IA (Profesor Mentis): el alumno no recibe la respuesta; define contexto, razona y puede pedir pistas.
- **Panel del organizador** con vista general (KPIs, segmentación, alertas), lista de estudiantes y resúmenes de aprendizaje.

---

## 2. Roles y acceso

### 2.1 Roles en el sistema

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **ORGANIZATION_ADMIN** | Administrador del centro (ej. director, coordinador). | Registro del centro, panel completo, gestión de estudiantes y vista de datos. |
| **TEACHER** | Profesor perteneciente a la organización. | Mismo panel que el organizador: vista general, estudiantes, resúmenes. |
| **STUDENT** | Alumno que se une con código de clase. | Solo chat con Mentis y generación de mini resúmenes. No usa email/contraseña en el MVP. |

En la práctica, para la presentación se habla de **dos roles funcionales**:

1. **Organizador** (admin o profesor): ve el panel, KPIs, alertas y detalle por estudiante.
2. **Estudiante**: usa únicamente el chat guiado y los resúmenes.

### 2.2 Cómo se entra en cada rol

- **Organizador:** registro del centro en `/register-school` (nombre del centro, email y contraseña del admin). Luego login en `/login` → redirección a `/dashboard`.
- **Estudiante:** en `/student-access` introduce **nombre** (o alias) y **código de unión** de la clase. Se crea la cuenta y queda logueado; no tiene contraseña.

El **código de unión** lo genera el centro (en el futuro desde el panel); con ese código el alumno se asocia a la organización y a la clase.

---

## 3. Chat del estudiante (Profesor Mentis)

### 3.1 Idea central

El chat **no es libre**. Mentis actúa como un profesor que:

- **Nunca da la solución completa** ni el resultado final del ejercicio.
- **Obliga a definir contexto:** asignatura (elegida en la UI), tema concreto y tipo (ejercicio vs repaso).
- **Guía con preguntas** cuando el alumno se equivoca, sin explicar la respuesta correcta.
- **Solo da pistas** cuando el alumno pulsa **“Pedir ayuda”**, y siempre **una pista conceptual** (sin números finales ni fórmulas completas).

### 3.2 Fases del chat

El flujo está gobernado por **fases** en el backend:

| Fase | Descripción |
|------|-------------|
| **idle** | Inicio. La asignatura ya está elegida; Mentis pide el **tema** concreto (ej. “áreas”, “fracciones”). |
| **defining_context** | Se fija tema y tipo (ejercicio / repaso). Mentis hace una pregunta corta cada vez. |
| **solving** | El alumno resuelve. Mentis evalúa coherencia, pide razonamiento paso a paso y puede dar **una** pista si el alumno pide ayuda. |
| **evaluating** | Mentis valora el razonamiento. No da la solución. |
| **waiting_for_correction** | El alumno debe corregir tras el feedback. |
| **giving_hint** | Se acaba de dar una pista; el alumno debe seguir trabajando con ella. |
| **completed** | Ejercicio o sesión completada. Se puede sugerir “¿Quieres trabajar en algo más?”. |

La IA (p. ej. vía OpenRouter) devuelve la respuesta y, en comentarios HTML, puede indicar:

- `<!-- MENTIS_PHASE=... -->` → siguiente fase.
- `<!-- MENTIS_CONTEXT={...} -->` → actualización de contexto (tema, tipo de ejercicio, etc.).
- `<!-- MENTIS_ADD_POINTS=N -->` → suma de hasta 10 puntos para el alumno (cuando hay acierto/progreso).

### 3.3 Valores que genera el chat (y se guardan)

- **Puntos PR (pr_points):** se suman cuando la IA incluye `MENTIS_ADD_POINTS=N` (máx. 10 por mensaje). El cliente envía el total actualizado a `/api/student-progress`.
- **Pistas usadas (hints_used):** cada vez que el alumno pulsa “Pedir ayuda” se incrementa el contador y se registra (en el cliente y, si está implementado, en eventos de aprendizaje).
- **Última actividad (last_chat_at):** timestamp del último mensaje/actividad en el chat.
- **Racha (streak):** días consecutivos con actividad; se calcula/actualiza en el cliente y se persiste en `student_progress`.

Además se pueden registrar **eventos de aprendizaje** (`learning_events`), por ejemplo:

- `hint_used`: cada vez que se pide una pista.
- `summary_created`: cuando se genera un mini resumen.
- `error_tag`: etiqueta de error/dificultad (si la IA o el sistema la envían); se usan para el panel del organizador.

### 3.4 Mini resumen

El alumno puede generar un **“Mini resumen”** de lo trabajado. Ese contenido se guarda en `learning_summaries` y se asocia a su usuario. En el panel del organizador aparece en la pestaña **Resúmenes**.

### 3.5 Guías del profesor por estudiante

El organizador puede definir, por estudiante, un **mini-prompt** (instrucciones para Mentis). Se guarda en `student_teacher_guidelines` y la API del chat lo inyecta en el system prompt de la IA para personalizar cómo Mentis guía a ese alumno (por ejemplo, nivel de exigencia o foco en un tipo de error).

---

## 4. Panel del organizador: qué hay en cada pestaña

### 4.1 Vista general

- **Filtros:** período (7, 14 o 30 días) y “Solo activos” (excluye alumnos sin actividad).
- **KPIs en tarjetas:** ver siguiente sección.
- **Gráficos:**
  - Sesiones / pistas por día (series temporales).
  - Distribución por **segmento** (autónomo, constante dependiente, intermitente, sin actividad).
  - Errores frecuentes (tags más repetidos en el período).
- **Alertas pedagógicas:** hasta 5 alumnos con flags (dependencia alta, inactivo 7d/14d, estancamiento).
- **Acciones recomendadas:** enlaces directos al detalle del estudiante según el tipo de alerta.

### 4.2 Estudiantes

- **Buscador** encima de la tabla: por nombre o email.
- **Tabla** con columnas: Estudiante, Email, Nivel, Dependencia, Puntos, Racha, Pistas, Alertas, Último chat.
- **Ordenación:** clic en la cabecera de cada columna (asc/desc) con indicador visual.
- **Clic en una fila** → detalle del estudiante (métricas, resúmenes, guía del profesor, etc.).

### 4.3 Resúmenes

- Listado de **mini resúmenes** generados por los estudiantes (contenido, alumno, fecha).

---

## 5. Cómo se calculan los KPIs y métricas del panel

### 5.1 Fuentes de datos

- **users:** alumnos de la organización (`role = STUDENT`).
- **student_progress:** por alumno, `pr_points`, `last_chat_at`, `streak`, `hints_used`.
- **learning_summaries:** cada “Mini resumen” = una sesión de trabajo (se usa para contar sesiones).
- **learning_events:** eventos `hint_used`, `summary_created`, `error_tag` (para pistas por período y errores frecuentes).

El período (días) lo elige el usuario en Vista general (7, 14 o 30).

### 5.2 KPIs de Vista general (fórmulas)

| KPI | Cálculo |
|-----|--------|
| **Total estudiantes** | Número de usuarios con `role = STUDENT` en la organización. |
| **Puntos totales** | Suma de `pr_points` de todos los alumnos (de `student_progress`). |
| **Resúmenes** | Número total de registros en `learning_summaries` de la organización. |
| **Activos** | Alumnos con al menos un `last_chat_at` no nulo (han usado el chat alguna vez). |
| **Sesiones (período)** | Número de `learning_summaries` con `created_at` en el período seleccionado. |
| **Pistas totales (período)** | Número de eventos `learning_events` con `type = 'hint_used'` y `created_at` en el período. Si no hay tabla de eventos, se usa la suma de `hints_used` de `student_progress`. |
| **Pistas por sesión (período)** | `pistas_totales_período / sesiones_período` (redondeado a 1 decimal). |
| **Activos en período** | Alumnos con al menos un resumen en el período o `last_chat_at` en el período. |
| **Inactivos en período** | Total estudiantes − activos en período. |
| **Mejor racha** | Máximo de `streak` en `student_progress` entre todos los alumnos. |
| **Puntos promedio** | `puntos_totales / total_estudiantes`. |

### 5.3 Segmentación (perfil de dependencia/autonomía)

Por alumno, en el período (p. ej. 14 días):

- **Sesiones del alumno:** resúmenes con `created_at` en el período.
- **Pistas del alumno:** `hints_used` (total) o eventos `hint_used` en el período.
- **Promedio pistas por sesión:** `pistas_alumno / sesiones_alumno` (si sesiones > 0).

Umbrales (configurables en `lib/organizer/overview-thresholds.ts`):

- **SEGMENT_HINTS_LOW** (ej. 2): pistas/sesión por debajo → perfil más **autónomo**.
- **SEGMENT_HINTS_HIGH** (ej. 5): pistas/sesión por encima → perfil **dependiente**.
- **SEGMENT_STREAK_MIN** (ej. 3): racha mínima para considerar “constante”.

Reglas de segmento (resumidas):

- Sin sesiones ni `last_chat_at` → **Sin actividad**.
- Pistas/sesión ≤ bajo y tiene puntos → **Autónomo**.
- Racha ≥ mínima y pistas/sesión ≥ alto → **Constante dependiente**.
- Resto con actividad → **Intermitente**.

Los **conteos** por segmento (autónomo, constante_dependiente, intermitente, sin_actividad) son los que se muestran en el gráfico de torta y en la lógica “Solo activos”.

### 5.4 Alertas (flags) por estudiante

Se calculan con los mismos umbrales (en overview y en la lista de estudiantes):

| Flag | Condición |
|------|-----------|
| **dependencia_alta** | Promedio pistas/sesión ≥ HIGH_HINTS_AVG (ej. 5) y tiene al menos una sesión. |
| **estancamiento** | Sesiones en período actual ≥ STAGNATION_SESSIONS_MIN (ej. 3), sesiones en período anterior ≥ 3, y `pr_points` < STAGNATION_POINTS_GROWTH_MAX (ej. 10). |
| **inactivo_7d** | Días desde `last_chat_at` ≥ INACTIVE_DAYS (ej. 7) y &lt; 14. |
| **inactivo_14d** | Días desde `last_chat_at` ≥ INACTIVE_DAYS_14 (ej. 14). |

Estos flags son los que alimentan la sección “Alertas pedagógicas” y las “Acciones recomendadas” (con enlace al detalle del estudiante).

### 5.5 Nivel de aprendizaje (tabla Estudiantes)

Se deriva de los puntos del alumno y de si tiene actividad:

- **Sin actividad:** sin actividad reciente o 0 puntos.
- **Bajo:** 1 ≤ pr_points &lt; 50.
- **Medio:** 50 ≤ pr_points &lt; 150.
- **Alto:** pr_points ≥ 150.

(Los umbrales exactos pueden estar en el código de la API de estudiantes/organizer.)

### 5.6 Errores frecuentes (Vista general)

- Se leen eventos `learning_events` con `type = 'error_tag'` y `created_at` en el período.
- En `meta` se guarda un `tag` (ej. “Cálculo mental”, “Fracciones equivalentes”).
- Se agrupa por `tag`, se cuenta y se ordena por frecuencia; se muestran los primeros (ej. 6) con **porcentaje sobre el total de eventos** de tipo error_tag.
- Si no hay datos, el panel puede mostrar una lista de ejemplo (demo) para la presentación.

---

## 6. Resumen técnico para inversores

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS.
- **Backend:** API Routes de Next.js; autenticación con NextAuth (JWT).
- **Base de datos:** PostgreSQL (externo); acceso vía Prisma (schema de referencia; tablas creadas con SQL manual en `/sql`).
- **IA del chat:** integración con OpenRouter (modelo configurable, p. ej. Gemini). El comportamiento pedagógico está definido en prompts y fases; los puntos se extraen de la respuesta con un formato acordado (`MENTIS_ADD_POINTS`, etc.).

---

## 7. Cómo probar el MVP (demo)

1. **Crear un centro:** ir a `/register-school`, nombre del centro, email y contraseña del admin.
2. **Entrar como organizador:** login con ese email/contraseña → dashboard con Vista general, Estudiantes, Resúmenes.
3. **Dar de alta alumnos:** (en el MVP puede hacerse con códigos de unión o datos de prueba en BD.) Los alumnos entran por `/student-access` con nombre y código.
4. **Simular uso del chat:** como estudiante, usar el chat para definir tema, resolver y pedir pistas; generar un mini resumen.
5. **Ver el panel:** en Vista general comprobar KPIs, segmentación y alertas; en Estudiantes ver la tabla ordenable y el buscador; en Resúmenes ver el mini resumen generado.

Con datos sintéticos (scripts SQL en `/sql`, p. ej. `seed_synthetic_data.sql`) se pueden rellenar estudiantes, progreso, resúmenes y eventos para una demo con números creíbles.

---

*Documento preparado para presentación a inversores. Refleja el estado del MVP y puede actualizarse con cada release.*
