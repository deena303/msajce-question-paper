-- ============================================================
-- MSAJCE Exam Software — Migration 008: Exam Pattern Configs
-- Stores IAT I, IAT II, End Semester configurations in Supabase
-- so patterns are editable by Super Admin and used by generator.
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_pattern_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type         VARCHAR(60)  NOT NULL UNIQUE,  -- 'Internal Assessment I', 'Internal Assessment II', 'End Semester Examination'
  exam_name         VARCHAR(120) NOT NULL,          -- Display name on paper header
  duration          VARCHAR(40)  NOT NULL,          -- e.g. '2 Hours', 'Three Hours'
  max_marks         INTEGER      NOT NULL,
  regulation        VARCHAR(60)  DEFAULT 'Regulation 2024',
  show_bl_co_pi     BOOLEAN      DEFAULT TRUE,      -- Show BL/CO/PI columns (TRUE for IAT, FALSE for End Sem)
  show_course_obj   BOOLEAN      DEFAULT FALSE,     -- Show Course Objectives block in header
  part_a_config     JSONB        NOT NULL,          -- { count, marks_per_question, instruction, total }
  part_b_config     JSONB        NOT NULL,          -- { format, sections OR or_choice, marks_per_question, total, unit_map }
  part_c_config     JSONB,                          -- null for IAT; { count, marks_per_question, total, unit } for End Sem
  instructions      TEXT,                           -- e.g. 'Answer ALL Questions'
  status            VARCHAR(20)  DEFAULT 'active',
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE exam_pattern_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_patterns_select" ON exam_pattern_configs;
CREATE POLICY "exam_patterns_select" ON exam_pattern_configs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all on exam_pattern_configs" ON exam_pattern_configs;
CREATE POLICY "Allow all on exam_pattern_configs" ON exam_pattern_configs FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- Seed: Internal Assessment Test I
-- ============================================================
INSERT INTO exam_pattern_configs (
  exam_type, exam_name, duration, max_marks, regulation,
  show_bl_co_pi, show_course_obj,
  part_a_config, part_b_config, part_c_config, instructions
) VALUES (
  'Internal Assessment I',
  'B.E./B.Tech. DEGREE INTERNAL ASSESSMENT TEST-I',
  '2 Hours',
  60,
  'Regulation 2024',
  TRUE,
  TRUE,
  '{"count": 4, "marks_per_question": 2, "total": 8, "instruction": "Answer all Questions", "question_start": 1}',
  '{
    "format": "sections",
    "marks_per_question": 13,
    "total": 52,
    "question_start": 5,
    "sections": [
      {"name": "Section A", "display_questions": 3, "answer_count": 2, "unit_pool": [1, 2], "instruction": "Answer any two Questions"},
      {"name": "Section B", "display_questions": 3, "answer_count": 2, "unit_pool": [2, 3], "instruction": "Answer any two Questions"}
    ]
  }',
  NULL,
  'Answer all the Questions'
) ON CONFLICT (exam_type) DO UPDATE SET
  exam_name = EXCLUDED.exam_name,
  duration = EXCLUDED.duration,
  max_marks = EXCLUDED.max_marks,
  show_bl_co_pi = EXCLUDED.show_bl_co_pi,
  show_course_obj = EXCLUDED.show_course_obj,
  part_a_config = EXCLUDED.part_a_config,
  part_b_config = EXCLUDED.part_b_config,
  instructions = EXCLUDED.instructions,
  updated_at = NOW();

-- ============================================================
-- Seed: Internal Assessment Test II
-- ============================================================
INSERT INTO exam_pattern_configs (
  exam_type, exam_name, duration, max_marks, regulation,
  show_bl_co_pi, show_course_obj,
  part_a_config, part_b_config, part_c_config, instructions
) VALUES (
  'Internal Assessment II',
  'B.E./B.Tech. DEGREE INTERNAL ASSESSMENT TEST-II',
  '2 Hours',
  60,
  'Regulation 2024',
  TRUE,
  TRUE,
  '{"count": 4, "marks_per_question": 2, "total": 8, "instruction": "Answer all Questions", "question_start": 1}',
  '{
    "format": "sections",
    "marks_per_question": 13,
    "total": 52,
    "question_start": 5,
    "sections": [
      {"name": "Section A", "display_questions": 3, "answer_count": 2, "unit_pool": [3, 4], "instruction": "Answer any two Questions"},
      {"name": "Section B", "display_questions": 3, "answer_count": 2, "unit_pool": [4, 5], "instruction": "Answer any two Questions"}
    ]
  }',
  NULL,
  'Answer all the Questions'
) ON CONFLICT (exam_type) DO UPDATE SET
  exam_name = EXCLUDED.exam_name,
  duration = EXCLUDED.duration,
  max_marks = EXCLUDED.max_marks,
  show_bl_co_pi = EXCLUDED.show_bl_co_pi,
  show_course_obj = EXCLUDED.show_course_obj,
  part_a_config = EXCLUDED.part_a_config,
  part_b_config = EXCLUDED.part_b_config,
  instructions = EXCLUDED.instructions,
  updated_at = NOW();

-- ============================================================
-- Seed: End Semester Examination
-- ============================================================
INSERT INTO exam_pattern_configs (
  exam_type, exam_name, duration, max_marks, regulation,
  show_bl_co_pi, show_course_obj,
  part_a_config, part_b_config, part_c_config, instructions
) VALUES (
  'End Semester Examination',
  'B.E. / B.Tech. DEGREE EXAMINATIONS',
  'Three Hours',
  100,
  'Regulation 2024',
  FALSE,
  FALSE,
  '{"count": 10, "marks_per_question": 2, "total": 20, "instruction": "Answer ALL Questions", "question_start": 1, "units_per_question": 2, "unit_count": 5}',
  '{
    "format": "or_choice",
    "marks_per_question": 13,
    "total": 65,
    "question_start": 11,
    "or_pairs": 5,
    "unit_map": {"11": 1, "12": 2, "13": 3, "14": 4, "15": 5}
  }',
  '{"count": 1, "marks_per_question": 15, "total": 15, "question_start": 16, "or_choice": true}',
  'Answer ALL Questions'
) ON CONFLICT (exam_type) DO UPDATE SET
  exam_name = EXCLUDED.exam_name,
  duration = EXCLUDED.duration,
  max_marks = EXCLUDED.max_marks,
  show_bl_co_pi = EXCLUDED.show_bl_co_pi,
  show_course_obj = EXCLUDED.show_course_obj,
  part_a_config = EXCLUDED.part_a_config,
  part_b_config = EXCLUDED.part_b_config,
  part_c_config = EXCLUDED.part_c_config,
  instructions = EXCLUDED.instructions,
  updated_at = NOW();
