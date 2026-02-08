-- Mini resúmenes de aprendizaje (lo que hemos aprendido + tips del chat)
-- Ejecutar manualmente en PostgreSQL después de tener users y organizations.
-- Si falla uuid_generate_v4(), ejecuta antes: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS learning_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    source_type VARCHAR(50) DEFAULT 'chat',
    source_id VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_learning_summaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_learning_summaries_user_id ON learning_summaries(user_id);
CREATE INDEX idx_learning_summaries_created_at ON learning_summaries("createdAt");
