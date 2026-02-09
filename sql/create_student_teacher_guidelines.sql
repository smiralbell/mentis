-- Mini-prompt del profesor por alumno + notas privadas.
-- Ejecutar en PostgreSQL después de tener la tabla users.
-- La PK de estudiantes es users.id (role = STUDENT).

CREATE TABLE IF NOT EXISTS student_teacher_guidelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL UNIQUE,
    teacher_prompt TEXT,
    private_notes TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_guidelines_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_student_teacher_guidelines_student_id ON student_teacher_guidelines(student_id);
CREATE INDEX idx_student_teacher_guidelines_updated_at ON student_teacher_guidelines("updatedAt");

COMMENT ON TABLE student_teacher_guidelines IS 'Guidelines and private notes per student (organizer/teacher only). teacher_prompt is injected into the AI system prompt for that student.';
