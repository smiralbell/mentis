-- Progreso por estudiante: puntos PR, última actividad en chat, racha, pistas usadas.
-- Ejecutar en PostgreSQL después de tener la tabla users.
-- Una fila por estudiante (user_id único).

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

CREATE INDEX idx_student_progress_user_id ON student_progress(user_id);
CREATE INDEX idx_student_progress_pr_points ON student_progress(pr_points DESC);
CREATE INDEX idx_student_progress_last_chat_at ON student_progress(last_chat_at DESC NULLS LAST);
