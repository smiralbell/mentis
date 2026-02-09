/**
 * Umbrales para Vista General del organizador.
 * Ajustar aquí para cambiar alertas y segmentación sin tocar lógica.
 */

/** Pistas por sesión por encima => flag "Dependencia alta" */
export const HIGH_HINTS_AVG = 5

/** Días sin actividad => flag "Inactividad" */
export const INACTIVE_DAYS = 7

/** Para "inactivo 14d" */
export const INACTIVE_DAYS_14 = 14

/** Mínimo de resúmenes/sesiones para considerar "actividad alta" en estancamiento */
export const STAGNATION_SESSIONS_MIN = 3

/** Crecimiento de puntos por debajo => posible estancamiento (si hay sesiones) */
export const STAGNATION_POINTS_GROWTH_MAX = 10

/** Segmentación: hints/sesión por debajo => perfil más autónomo */
export const SEGMENT_HINTS_LOW = 2

/** Segmentación: hints/sesión por encima => dependiente */
export const SEGMENT_HINTS_HIGH = 5

/** Segmentación: racha mínima para "constante" */
export const SEGMENT_STREAK_MIN = 3
