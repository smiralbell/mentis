/**
 * Tipos para el chat pedagógico guiado de MENTIS.
 * El chat no es libre: obliga a definir contexto y actúa como profesor que guía,
 * nunca da la respuesta final.
 */

/** Fases del flujo del chat. Determinan qué puede hacer el sistema. */
export type MentorChatPhase =
  | 'idle'                    // Esperando que el alumno diga qué quiere trabajar
  | 'defining_context'        // Fijando asignatura, tema, tipo (ejercicio vs repaso)
  | 'solving'                 // Alumno resolviendo; puede pedir ayuda
  | 'evaluating'              // Sistema evaluando coherencia del razonamiento
  | 'waiting_for_correction'  // Sistema pidió corrección; esperando al alumno
  | 'giving_hint'             // Sistema acaba de dar una pista (Pedir ayuda)
  | 'completed'              // Sesión o ejercicio completado

/** Contexto fijado durante defining_context. Sin esto no hay puntos ni evaluación. */
export interface MentorChatContext {
  /** Ej: "Matemáticas", "Geometría" */
  subject?: string
  /** Tema concreto: "área del cuadrado", "integrales definidas" */
  topic?: string
  /** true = ejercicio concreto, false = repaso general */
  isExercise?: boolean
  /** Descripción breve del ejercicio actual (en solving) */
  exerciseDescription?: string
}

/** Un mensaje en la conversación (sistema o alumno). */
export interface MentorChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Estado persistido por conversación (por chatId). */
export interface MentorChatState {
  phase: MentorChatPhase
  context: MentorChatContext
}

/** Payload al llamar a la API del mentor. */
export interface MentorChatRequest {
  phase: MentorChatPhase
  context: MentorChatContext
  messages: MentorChatMessage[]
  /** true cuando el alumno pulsó "Pedir ayuda": responder SOLO con una pista conceptual */
  requestingHint?: boolean
}

/** Respuesta de la API del mentor. */
export interface MentorChatResponse {
  reply: string
  nextPhase?: MentorChatPhase
  /** Actualización parcial del contexto (ej. subject/topic recién fijados) */
  contextUpdate?: Partial<MentorChatContext>
}
