-- ============================================================
-- MSAJCE Exam Software — Migration 007: AIML 3rd Year Subjects & Year of Study
-- Academic Year: 2024–2028
-- Department: Artificial Intelligence and Machine Learning (AIML)
-- Year of Study: 3rd Year
--
-- Safe Migration:
--  - Adds year_of_study, faculty_name, faculty_department columns if missing
--  - Deactivates non-matching subjects for AIML / 2024-2028
--  - Upserts the 6 official AIML 3rd Year subjects
--  - Never deletes historical papers, question banks, or other departments
-- ============================================================

-- 1. Extend tables with year_of_study and faculty metadata if not exists
ALTER TABLE IF EXISTS subjects
  ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20) DEFAULT '3rd Year',
  ADD COLUMN IF NOT EXISTS faculty_name TEXT,
  ADD COLUMN IF NOT EXISTS faculty_department TEXT;

CREATE INDEX IF NOT EXISTS idx_subjects_year_of_study ON subjects(year_of_study);

ALTER TABLE IF EXISTS question_banks
  ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20) DEFAULT '3rd Year';

CREATE INDEX IF NOT EXISTS idx_question_banks_year_of_study ON question_banks(year_of_study);

ALTER TABLE IF EXISTS questions
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id),
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id),
  ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20) DEFAULT '3rd Year';

CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_academic_year_id ON questions(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_questions_year_of_study ON questions(year_of_study);

ALTER TABLE IF EXISTS generated_papers
  ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20) DEFAULT '3rd Year';

CREATE INDEX IF NOT EXISTS idx_generated_papers_year_of_study ON generated_papers(year_of_study);

-- 2. Ensure AIML Department and 2024-2028 Academic Year exist
INSERT INTO departments (department_code, department_name, status)
VALUES ('AIML', 'Artificial Intelligence and Machine Learning', 'active')
ON CONFLICT (department_code) DO UPDATE
SET status = 'active', department_name = 'Artificial Intelligence and Machine Learning';

INSERT INTO academic_years (year_label, status, start_year, end_year, is_active)
VALUES ('2024-2028', 'active', 2024, 2028, true)
ON CONFLICT (year_label) DO UPDATE
SET status = 'active', is_active = true;

-- 3. Configure the 6 AIML 3rd Year Subjects
DO $$
DECLARE
  aiml_id UUID;
  yr_2024_2028_id UUID;
BEGIN
  SELECT id INTO aiml_id FROM departments WHERE department_code = 'AIML';
  SELECT id INTO yr_2024_2028_id FROM academic_years WHERE year_label = '2024-2028';

  IF aiml_id IS NOT NULL AND yr_2024_2028_id IS NOT NULL THEN
    -- A. Deactivate any existing subjects for AIML / 2024-2028 not in the 6 official subjects
    UPDATE subjects
    SET status = 'inactive', updated_at = NOW()
    WHERE department_id = aiml_id
      AND academic_year_id = yr_2024_2028_id
      AND subject_code NOT IN ('24AM411', '24AM511', '24AD512', '24CS514', '24CS411', '24EC412');

    -- B. Upsert 1: 24AM411 - Artificial Intelligence
    INSERT INTO subjects (subject_code, subject_name, department_id, academic_year_id, semester, regulation, status, year_of_study)
    VALUES ('24AM411', 'Artificial Intelligence', aiml_id, yr_2024_2028_id, 'IV', 'Regulation 2024', 'active', '3rd Year')
    ON CONFLICT (subject_code, academic_year_id, department_id) DO UPDATE
    SET subject_name = 'Artificial Intelligence',
        semester = 'IV',
        regulation = 'Regulation 2024',
        status = 'active',
        year_of_study = '3rd Year',
        updated_at = NOW();

    -- C. Upsert 2: 24AM511 - Machine Learning
    INSERT INTO subjects (subject_code, subject_name, department_id, academic_year_id, semester, regulation, status, year_of_study)
    VALUES ('24AM511', 'Machine Learning', aiml_id, yr_2024_2028_id, 'V', 'Regulation 2024', 'active', '3rd Year')
    ON CONFLICT (subject_code, academic_year_id, department_id) DO UPDATE
    SET subject_name = 'Machine Learning',
        semester = 'V',
        regulation = 'Regulation 2024',
        status = 'active',
        year_of_study = '3rd Year',
        updated_at = NOW();

    -- D. Upsert 3: 24AD512 - Data Exploration and Visualization
    INSERT INTO subjects (subject_code, subject_name, department_id, academic_year_id, semester, regulation, status, year_of_study)
    VALUES ('24AD512', 'Data Exploration and Visualization', aiml_id, yr_2024_2028_id, 'V', 'Regulation 2024', 'active', '3rd Year')
    ON CONFLICT (subject_code, academic_year_id, department_id) DO UPDATE
    SET subject_name = 'Data Exploration and Visualization',
        semester = 'V',
        regulation = 'Regulation 2024',
        status = 'active',
        year_of_study = '3rd Year',
        updated_at = NOW();

    -- E. Upsert 4: 24CS514 - Computer Networks
    INSERT INTO subjects (subject_code, subject_name, department_id, academic_year_id, semester, regulation, status, year_of_study)
    VALUES ('24CS514', 'Computer Networks', aiml_id, yr_2024_2028_id, 'V', 'Regulation 2024', 'active', '3rd Year')
    ON CONFLICT (subject_code, academic_year_id, department_id) DO UPDATE
    SET subject_name = 'Computer Networks',
        semester = 'V',
        regulation = 'Regulation 2024',
        status = 'active',
        year_of_study = '3rd Year',
        updated_at = NOW();

    -- F. Upsert 5: 24CS411 - Operating System
    INSERT INTO subjects (subject_code, subject_name, department_id, academic_year_id, semester, regulation, status, year_of_study)
    VALUES ('24CS411', 'Operating System', aiml_id, yr_2024_2028_id, 'IV', 'Regulation 2024', 'active', '3rd Year')
    ON CONFLICT (subject_code, academic_year_id, department_id) DO UPDATE
    SET subject_name = 'Operating System',
        semester = 'IV',
        regulation = 'Regulation 2024',
        status = 'active',
        year_of_study = '3rd Year',
        updated_at = NOW();

    -- G. Upsert 6: 24EC412 - Microcontroller and Interface
    INSERT INTO subjects (subject_code, subject_name, department_id, academic_year_id, semester, regulation, status, year_of_study)
    VALUES ('24EC412', 'Microcontroller and Interface', aiml_id, yr_2024_2028_id, 'IV', 'Regulation 2024', 'active', '3rd Year')
    ON CONFLICT (subject_code, academic_year_id, department_id) DO UPDATE
    SET subject_name = 'Microcontroller and Interface',
        semester = 'IV',
        regulation = 'Regulation 2024',
        status = 'active',
        year_of_study = '3rd Year',
        updated_at = NOW();

    RAISE NOTICE 'Successfully configured 6 AIML 3rd Year subjects for 2024-2028';
  ELSE
    RAISE WARNING 'AIML department or 2024-2028 academic year not found!';
  END IF;
END $$;
