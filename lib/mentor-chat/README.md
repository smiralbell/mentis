# Chat pedagógico guiado (Profesor Mentis)

Este módulo implementa el **chat guiado** de MENTIS: no es un chat libre tipo ChatGPT, sino un flujo que obliga a definir contexto, actúa como profesor que guía y **nunca da la respuesta final**. Las pistas solo se ofrecen cuando el alumno pulsa "Pedir ayuda".

## Flujo de fases

| Fase | Descripción |
|------|-------------|
| `idle` | Sin contexto. El sistema pregunta "¿Qué quieres trabajar hoy?" y no avanza hasta que el alumno indica tema (ej: Geometría, Integrales). |
| `defining_context` | Se fijan asignatura, tema concreto y tipo (ejercicio vs repaso). Preguntas cortas; no hay puntos ni evaluación hasta cerrar contexto. |
| `solving` | Modo profesor: se propone ejercicio, el alumno escribe razonamiento, el sistema evalúa coherencia. **Pedir ayuda** da una pista conceptual. |
| `evaluating` | El sistema está evaluando el razonamiento (feedback sin dar la solución). |
| `waiting_for_correction` | Se pidió corrección al alumno; se espera su nuevo mensaje. |
| `giving_hint` | Se acaba de dar una pista; el alumno debe seguir trabajando. |
| `completed` | Sesión o ejercicio completado. |

## Archivos

- **`types.ts`**: Tipos (`MentorChatPhase`, `MentorChatContext`, mensajes, request/response). Añadir aquí nuevos campos si se extiende el contexto o las fases.
- **`prompt.ts`**: Prompt del Profesor Mentis y `buildMentorSystemPrompt(phase, context, requestingHint)`. Reglas duras y texto por fase. Cualquier cambio de comportamiento pedagógico debe reflejarse aquí.
- **API**: `app/api/mentor-chat/route.ts`. POST con `phase`, `context`, `messages`, `requestingHint`. Devuelve `reply` y opcionalmente `nextPhase` y `contextUpdate` (parseados desde comentarios `<!-- MENTIS_PHASE=... -->` y `<!-- MENTIS_CONTEXT=... -->` al final de la respuesta del modelo).

## Cómo extender

1. **Nueva fase**: Añadir el valor en `types.ts` (`MentorChatPhase`) y la instrucción en `prompt.ts` (`PHASE_INSTRUCTIONS`). En el frontend, manejar la transición a esa fase donde corresponda.
2. **Más contexto**: Añadir campos a `MentorChatContext` en `types.ts` y usarlos en `buildMentorSystemPrompt` y en el frontend al actualizar estado.
3. **Cambiar reglas pedagógicas**: Editar `RULES` y las entradas de `PHASE_INSTRUCTIONS` en `prompt.ts`. No dar la solución ni aceptar "hazlo por mí" son invariantes del sistema.
4. **Puntos / racha**: El frontend ya tiene estado para racha y puntos PR; la lógica de cuándo sumar (tras evaluación positiva, al completar ejercicio, etc.) se puede conectar cuando el backend o las reglas lo definan.

## UX mínima implementada

- Mensaje inicial del sistema siempre visible (saludo preguntando qué trabajar).
- Input de texto + botón "Enviar".
- Botón "Pedir ayuda" solo activo en fase `solving` (y `evaluating` / `waiting_for_correction`).
- Estado guiado por conversación (por `chatId`) en el dashboard: `guidedStateByChatId`.
