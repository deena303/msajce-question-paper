-- ============================================================
-- MSAJCE Exam Software — Migration 009
-- Subject: Artificial Intelligence (24AM411)
-- Department: AIML — Artificial Intelligence and Machine Learning
-- Academic Year: 2024-2028
-- Regulation: Regulation 2024
--
-- Safe Migration:
--  - Does not delete or reset any existing data
--  - Ensures required AIML department and 2024-2028 academic year exist
--  - Inserts the subject only if missing
--  - If already present for AIML / 2024-2028, corrects details and activates it
--  - Uses the existing subjects unique relationship:
--      (subject_code, academic_year_id, department_id)
-- ============================================================

INSERT INTO departments (department_code, department_name, status)
VALUES ('AIML', 'Artificial Intelligence and Machine Learning', 'active')
ON CONFLICT (department_code) DO UPDATE
SET department_name = EXCLUDED.department_name,
    status = 'active',
    updated_at = NOW();

INSERT INTO academic_years (year_label, status, start_year, end_year, is_active)
VALUES ('2024-2028', 'active', 2024, 2028, true)
ON CONFLICT (year_label) DO UPDATE
SET status = 'active',
    start_year = COALESCE(academic_years.start_year, EXCLUDED.start_year),
    end_year = COALESCE(academic_years.end_year, EXCLUDED.end_year),
    is_active = true,
    updated_at = NOW();

DO $$
DECLARE
  aiml_id UUID;
  yr_2024_2028_id UUID;
BEGIN
  SELECT id INTO aiml_id
  FROM departments
  WHERE department_code = 'AIML';

  SELECT id INTO yr_2024_2028_id
  FROM academic_years
  WHERE year_label = '2024-2028';

  IF aiml_id IS NULL THEN
    RAISE EXCEPTION 'AIML department could not be resolved.';
  END IF;

  IF yr_2024_2028_id IS NULL THEN
    RAISE EXCEPTION 'Academic year 2024-2028 could not be resolved.';
  END IF;

  INSERT INTO subjects (
    subject_code,
    subject_name,
    department_id,
    academic_year_id,
    semester,
    regulation,
    status,
    year_of_study
  )
  VALUES (
    '24AM411',
    'Artificial Intelligence',
    aiml_id,
    yr_2024_2028_id,
    'IV',
    'Regulation 2024',
    'active',
    '3rd Year'
  )
  ON CONFLICT (subject_code, academic_year_id, department_id) DO UPDATE
  SET subject_name = EXCLUDED.subject_name,
      semester = EXCLUDED.semester,
      regulation = EXCLUDED.regulation,
      status = 'active',
      year_of_study = EXCLUDED.year_of_study,
      updated_at = NOW();

  RAISE NOTICE 'Artificial Intelligence (24AM411) is active for AIML / 2024-2028.';
END $$;

-- Validation query for operators:
-- Expected result: exactly one row for AIML / 2024-2028 / 24AM411, status active.
-- SELECT s.subject_code, s.subject_name, d.department_code, d.department_name,
--        ay.year_label, s.regulation, s.status, COUNT(*) OVER () AS matching_rows
-- FROM subjects s
-- JOIN departments d ON d.id = s.department_id
-- JOIN academic_years ay ON ay.id = s.academic_year_id
-- WHERE s.subject_code = '24AM411'
--   AND d.department_code = 'AIML'
--   AND ay.year_label = '2024-2028';
