-- ============================================================
-- MSAJCE Exam Software — Migration 002: Academic Year & Set Naming
-- Run this in your Supabase project's SQL Editor
-- ============================================================

-- Add academic_year and department to question_banks table
ALTER TABLE IF EXISTS question_banks 
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
  ADD COLUMN IF NOT EXISTS department VARCHAR(20);

-- Add academic_year and department to questions table
ALTER TABLE IF EXISTS questions
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
  ADD COLUMN IF NOT EXISTS department VARCHAR(20);

-- Add academic_year, set_letter, set_display_name to generated_papers table
ALTER TABLE IF EXISTS generated_papers
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
  ADD COLUMN IF NOT EXISTS set_letter VARCHAR(5),
  ADD COLUMN IF NOT EXISTS set_display_name TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_banks_academic_year ON question_banks(academic_year);
CREATE INDEX IF NOT EXISTS idx_question_banks_department ON question_banks(department);
CREATE INDEX IF NOT EXISTS idx_questions_academic_year ON questions(academic_year);
