-- ============================================================
-- MSAJCE Exam Software — Migration 004: Common Departments & question_departments
-- Run this ENTIRE script in your Supabase SQL Editor
-- Safe migration: uses ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS
-- Does NOT drop or rename existing columns
-- ============================================================

-- ============================================================
-- EXTEND departments table with new spec columns
-- Keeps existing: id, department_code, department_name, status, created_at, updated_at
-- Adds: short_name, hod_name, is_common, is_active
-- ============================================================
ALTER TABLE IF EXISTS departments
  ADD COLUMN IF NOT EXISTS short_name      TEXT        NULL,
  ADD COLUMN IF NOT EXISTS hod_name        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS is_common       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN     NOT NULL DEFAULT TRUE;

-- Sync is_active with existing status column
UPDATE departments SET is_active = (status = 'active') WHERE is_active IS DISTINCT FROM (status = 'active');

-- ============================================================
-- EXTEND academic_years table with new spec columns
-- Keeps existing: id, year_label, status, created_at, updated_at
-- Adds: start_year, end_year, is_active
-- ============================================================
ALTER TABLE IF EXISTS academic_years
  ADD COLUMN IF NOT EXISTS start_year  INTEGER  NULL,
  ADD COLUMN IF NOT EXISTS end_year    INTEGER  NULL,
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN  NOT NULL DEFAULT TRUE;

-- Sync is_active with existing status column
UPDATE academic_years SET is_active = (status = 'active') WHERE is_active IS DISTINCT FROM (status = 'active');

-- ============================================================
-- EXTEND questions table with department_scope and department_id
-- ============================================================
ALTER TABLE IF EXISTS questions
  ADD COLUMN IF NOT EXISTS department_scope TEXT
    CHECK (department_scope IN ('SPECIFIC', 'COMMON'))
    DEFAULT 'SPECIFIC';

ALTER TABLE IF EXISTS questions
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

CREATE INDEX IF NOT EXISTS idx_questions_department_id ON questions(department_id);
CREATE INDEX IF NOT EXISTS idx_questions_department_scope ON questions(department_scope);

-- ============================================================
-- TABLE: question_departments (many-to-many: questions <-> departments)
-- One record per (question, department) pair
-- A question with 1 mapping = SPECIFIC
-- A question with 2+ mappings = COMMON
-- ============================================================
CREATE TABLE IF NOT EXISTS question_departments (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id   UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  department_id UUID        NOT NULL REFERENCES departments(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_qd_question_id   ON question_departments(question_id);
CREATE INDEX IF NOT EXISTS idx_qd_department_id ON question_departments(department_id);

-- RLS for question_departments
ALTER TABLE IF EXISTS question_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on question_departments" ON question_departments;
CREATE POLICY "Allow all on question_departments" ON question_departments
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Migrate existing questions to question_departments via question_banks
-- Only runs if question_banks has a department column
-- ============================================================
DO $$
DECLARE
  has_dept_col BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'question_banks' AND column_name = 'department'
  ) INTO has_dept_col;

  IF has_dept_col THEN
    INSERT INTO question_departments (question_id, department_id)
    SELECT DISTINCT q.id, d.id
    FROM questions q
    JOIN question_banks qb ON q.question_bank_id = qb.id
    JOIN departments d ON d.department_code = qb.department
    WHERE NOT EXISTS (
      SELECT 1 FROM question_departments qd2
      WHERE qd2.question_id = q.id AND qd2.department_id = d.id
    );

    UPDATE questions q
    SET department_id = d.id,
        department_scope = 'SPECIFIC'
    FROM question_banks qb
    JOIN departments d ON d.department_code = qb.department
    WHERE q.question_bank_id = qb.id
      AND q.department_id IS NULL;
  END IF;
END $$;

-- ============================================================
-- Seed / update AIML department and HOD data
-- ============================================================
INSERT INTO departments (department_code, department_name, short_name, hod_name, is_common, is_active, status)
VALUES
  ('AIML', 'Artificial Intelligence and Machine Learning', 'AIML', 'Dr. P. Arulmozhi', FALSE, TRUE, 'active')
ON CONFLICT (department_code) DO UPDATE SET
  department_name = EXCLUDED.department_name,
  is_active       = TRUE,
  status          = 'active';

UPDATE departments SET hod_name = 'Dr. K. Mohamed Farooq'    WHERE department_code = 'CSE'   AND hod_name IS NULL;
UPDATE departments SET hod_name = 'Dr. N. Selvamani'         WHERE department_code = 'AIDS'  AND hod_name IS NULL;
UPDATE departments SET hod_name = 'Dr. R. Senthil Kumar'     WHERE department_code = 'IT'    AND hod_name IS NULL;
UPDATE departments SET hod_name = 'Dr. S. Malarvizhi'        WHERE department_code = 'ECE'   AND hod_name IS NULL;
UPDATE departments SET hod_name = 'Dr. A. Ramesh Babu'       WHERE department_code = 'MECH'  AND hod_name IS NULL;
UPDATE departments SET hod_name = 'Dr. M. Ganesan'           WHERE department_code = 'CIVIL' AND hod_name IS NULL;

-- Update academic_years with start/end year
UPDATE academic_years
SET
  start_year = CAST(SPLIT_PART(year_label, '-', 1) AS INTEGER),
  end_year   = CAST(SPLIT_PART(year_label, '-', 2) AS INTEGER)
WHERE start_year IS NULL AND year_label ~ '^\d{4}-\d{4}$';

-- ============================================================
-- Add missing columns to question_banks for COMMON import flow
-- ============================================================
ALTER TABLE IF EXISTS question_banks
  ADD COLUMN IF NOT EXISTS department       TEXT NULL,
  ADD COLUMN IF NOT EXISTS academic_year    TEXT NULL,
  ADD COLUMN IF NOT EXISTS department_id   UUID REFERENCES departments(id),
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id),
  ADD COLUMN IF NOT EXISTS department_scope TEXT
    CHECK (department_scope IN ('SPECIFIC', 'COMMON'))
    DEFAULT 'SPECIFIC';

CREATE INDEX IF NOT EXISTS idx_qb_department_id     ON question_banks(department_id);
CREATE INDEX IF NOT EXISTS idx_qb_academic_year_id  ON question_banks(academic_year_id);

-- ============================================================
-- TABLE: question_bank_departments (COMMON question banks)
-- ============================================================
CREATE TABLE IF NOT EXISTS question_bank_departments (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_bank_id UUID        NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  department_id    UUID        NOT NULL REFERENCES departments(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_bank_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_qbd_qb_id   ON question_bank_departments(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_qbd_dept_id ON question_bank_departments(department_id);

ALTER TABLE IF EXISTS question_bank_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on question_bank_departments" ON question_bank_departments;
CREATE POLICY "Allow all on question_bank_departments" ON question_bank_departments
  FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================
-- DONE — After running, restart Express server.
-- Verify with: GET /api/departments (should include is_common, hod_name, etc.)
-- ============================================================
