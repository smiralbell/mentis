-- Eventos de aprendizaje para agregaciones del dashboard (sesiones, pistas, errores).
-- Ejecutar en PostgreSQL después de tener users.
-- Instrumentar: escribir un evento al crear resumen, al usar pista, etc.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    meta JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_learning_events_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_learning_events_student_created ON learning_events(student_id, created_at DESC);
CREATE INDEX idx_learning_events_type_created ON learning_events(type, created_at DESC);
CREATE INDEX idx_learning_events_created_at ON learning_events(created_at DESC);

COMMENT ON TABLE learning_events IS 'Eventos: session_started, summary_created, hint_used, error_tag. meta puede llevar { tag?, source_id? }.';
COMMENT ON COLUMN learning_events.type IS 'session_started | summary_created | hint_used | error_tag';
