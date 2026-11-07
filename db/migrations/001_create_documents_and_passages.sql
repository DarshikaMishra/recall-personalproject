BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  page_count INTEGER NOT NULL CHECK (page_count > 0),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'failed')),
  embedding_model TEXT NOT NULL,
  embedding_dimensions INTEGER NOT NULL DEFAULT 1536
    CHECK (embedding_dimensions = 1536),
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL
    REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX passages_document_id_idx
  ON passages(document_id);

COMMIT;