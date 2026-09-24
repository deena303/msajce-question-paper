-- ============================================================
-- MSAJCE Exam Software — Question Bank Database Migration
-- Run this in your Supabase project's SQL Editor
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: question_banks
-- Records each uploaded PDF question bank document
-- ============================================================
CREATE TABLE IF NOT EXISTS question_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_code VARCHAR(20) NOT NULL,
  subject_name TEXT,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  total_pages INTEGER,
  total_units INTEGER,
  regulation VARCHAR(20),
  storage_path TEXT,                    -- Supabase Storage path
  uploaded_by TEXT DEFAULT 'Exam Cell',
  status VARCHAR(30) DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_banks_subject_code ON question_banks(subject_code);
CREATE INDEX IF NOT EXISTS idx_question_banks_status ON question_banks(status);

-- ============================================================
-- TABLE: questions
-- Individual questions extracted from question bank PDFs
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
  subject_code VARCHAR(20) NOT NULL,
  unit INTEGER CHECK (unit BETWEEN 1 AND 5),
  unit_title TEXT,
  topic TEXT,
  part VARCHAR(10) DEFAULT 'Part B'
    CHECK (part IN ('Part A', 'Part B', 'Part C')),
  marks INTEGER,
  mark_breakdown TEXT,                  -- e.g. "5+8"
  question_text TEXT NOT NULL,
  blooms_level VARCHAR(5),              -- K1–K6
  btl_raw TEXT,                         -- original value from document (L1, L2, etc.)
  co VARCHAR(10),                       -- CO1–CO6
  pi TEXT,                              -- e.g. "1.2.1"
  difficulty VARCHAR(10) DEFAULT 'Medium'
    CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  or_group_id TEXT,                     -- e.g. "Q11" for OR pairs
  or_option CHAR(1),                    -- A or B
  sub_questions JSONB,                  -- array of sub-question texts
  ocr_confidence FLOAT,
  source_document TEXT,
  source_page INTEGER,
  source_page_end INTEGER,
  allowed_internal1 BOOLEAN DEFAULT TRUE,
  allowed_internal2 BOOLEAN DEFAULT TRUE,
  allowed_end_sem BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'Approved'
    CHECK (status IN ('Draft', 'Approved', 'Pending')),
  created_by TEXT DEFAULT 'Exam Cell OCR Engine',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_code ON questions(subject_code);
CREATE INDEX IF NOT EXISTS idx_questions_unit ON questions(unit);
CREATE INDEX IF NOT EXISTS idx_questions_part ON questions(part);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_bank_id ON questions(question_bank_id);

-- ============================================================
-- TABLE: question_usage_history
-- Tracks when each question was used in exams
-- ============================================================
CREATE TABLE IF NOT EXISTS question_usage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  exam_type VARCHAR(40),
  paper_code TEXT,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_question_id ON question_usage_history(question_id);

-- ============================================================
-- TABLE: generated_papers (stub for future use)
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_code TEXT UNIQUE NOT NULL,
  subject_code VARCHAR(20) NOT NULL,
  subject_name TEXT,
  department VARCHAR(10),
  semester TEXT,
  regulation VARCHAR(20),
  exam_type TEXT,
  exam_date DATE,
  duration TEXT,
  max_marks INTEGER DEFAULT 100,
  academic_year TEXT,
  status VARCHAR(20) DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Faculty Reviewed', 'HOD Review', 'Approved', 'Finalized', 'Rejected')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_question_banks_updated_at ON question_banks;
CREATE TRIGGER set_question_banks_updated_at
  BEFORE UPDATE ON question_banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_questions_updated_at ON questions;
CREATE TRIGGER set_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS) Configuration
-- Enables RLS and grants permissive policies for public/anon access
-- Ensures server API keys (both anon and service_role) never get blocked
-- ============================================================
ALTER TABLE IF EXISTS question_banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on question_banks" ON question_banks;
CREATE POLICY "Allow all on question_banks" ON question_banks
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on questions" ON questions;
CREATE POLICY "Allow all on questions" ON questions
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS question_usage_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on question_usage_history" ON question_usage_history;
CREATE POLICY "Allow all on question_usage_history" ON question_usage_history
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS generated_papers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on generated_papers" ON generated_papers;
CREATE POLICY "Allow all on generated_papers" ON generated_papers
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STORAGE: Create private bucket 'question-banks'
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('question-banks', 'question-banks', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Grant storage permissions for question-banks bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow question-banks storage operations'
  ) THEN
    CREATE POLICY "Allow question-banks storage operations" ON storage.objects
    FOR ALL TO public
    USING (bucket_id = 'question-banks')
    WITH CHECK (bucket_id = 'question-banks');
  END IF;
END $$;

