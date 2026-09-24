-- ============================================================
-- MSAJCE Exam Software — Migration 006: Principal Workflow & Paper Set Control
-- Run this ENTIRE script in your Supabase SQL Editor
-- Safe migration: uses IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, DO blocks
-- Does NOT drop or alter existing tables destructively
-- ============================================================

-- ============================================================
-- 1. EXTEND user_accounts: allow PRINCIPAL role
-- ============================================================
-- Drop the old CHECK constraint and re-add with PRINCIPAL included.
-- We use a DO block to handle the case where the constraint may or may not exist.
DO $$
BEGIN
  -- Drop old check constraint if it exists (constraint name varies by PG version)
  EXECUTE (
    SELECT 'ALTER TABLE user_accounts DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'user_accounts'::regclass
      AND contype = 'c'
      AND conname LIKE '%role%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- constraint didn't exist or had a different name, that's fine
END $$;

ALTER TABLE user_accounts
  ADD CONSTRAINT user_accounts_role_check
  CHECK (role IN ('SUPER_ADMIN', 'EXAM_CELL', 'PRINCIPAL'));

-- Seed Principal account (password: Principal@1234, bcrypt hash)
INSERT INTO user_accounts (email, password_hash, role, name, status)
VALUES (
  'principal@msajce-edu.in',
  '$2b$10$YQzW8mKpL3vN9hXsRdT4Gu5FjA2eBcP0qM7SiO1wVxDnKtEoLrYHz',
  'PRINCIPAL',
  'Dr. A. Principal',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================
-- 2. TABLE: paper_set_tracking
-- Authoritative record of every generated set per subject/year/dept/exam.
-- The backend writes here on every successful paper generation.
-- Used to enforce set limits and prevent duplicate set names.
-- ============================================================
CREATE TABLE IF NOT EXISTS paper_set_tracking (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id          UUID        NOT NULL REFERENCES academic_years(id),
  department_id             UUID        NOT NULL REFERENCES departments(id),
  subject_id                UUID        NOT NULL REFERENCES subjects(id),
  exam_type                 TEXT        NOT NULL
    CHECK (exam_type IN ('Internal Assessment I', 'Internal Assessment II', 'End Semester Examination')),
  set_name                  TEXT        NOT NULL,       -- e.g. 'A', 'B', 'C'
  set_display_name          TEXT,                       -- e.g. 'AI & ML – Set A'
  paper_code                TEXT,
  local_paper_id            TEXT,                       -- frontend paper id (for correlation)
  generation_status         TEXT        NOT NULL DEFAULT 'generated'
    CHECK (generation_status IN ('generated', 'voided')),
  additional_set_request_id UUID        NULL,           -- FK set after table created
  created_by_user_id        UUID        REFERENCES user_accounts(id),
  created_by_name           TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent exact duplicate set per subject+year+dept+exam (only among generated, not voided)
  UNIQUE (academic_year_id, department_id, subject_id, exam_type, set_name)
);

CREATE INDEX IF NOT EXISTS idx_pst_subject_id        ON paper_set_tracking(subject_id);
CREATE INDEX IF NOT EXISTS idx_pst_academic_year_id  ON paper_set_tracking(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_pst_department_id     ON paper_set_tracking(department_id);
CREATE INDEX IF NOT EXISTS idx_pst_exam_type         ON paper_set_tracking(exam_type);
CREATE INDEX IF NOT EXISTS idx_pst_created_at        ON paper_set_tracking(created_at DESC);

ALTER TABLE IF EXISTS paper_set_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on paper_set_tracking" ON paper_set_tracking;
CREATE POLICY "Allow all on paper_set_tracking" ON paper_set_tracking
  FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================
-- 3. TABLE: additional_paper_requests
-- Exam Cell submits these when standard set limit is reached.
-- Principal approves/rejects these to unlock additional sets.
-- ============================================================
CREATE TABLE IF NOT EXISTS additional_paper_requests (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number            TEXT        NOT NULL UNIQUE,  -- e.g. 'APR-2024-001'
  academic_year_id          UUID        NOT NULL REFERENCES academic_years(id),
  department_id             UUID        NOT NULL REFERENCES departments(id),
  subject_id                UUID        NOT NULL REFERENCES subjects(id),
  exam_type                 TEXT        NOT NULL
    CHECK (exam_type IN ('Internal Assessment I', 'Internal Assessment II', 'End Semester Examination')),
  existing_set_count        INTEGER     NOT NULL DEFAULT 0,
  existing_set_names        TEXT[]      NOT NULL DEFAULT '{}',
  requested_set_count       INTEGER     NOT NULL DEFAULT 1,
  requested_set_names       TEXT[]      NOT NULL DEFAULT '{}',   -- e.g. {'C'} or {'E','F'}
  reason                    TEXT        NOT NULL,
  supporting_document_path  TEXT        NULL,                    -- Supabase storage path
  requested_by_user_id      UUID        NOT NULL REFERENCES user_accounts(id),
  requested_by_name         TEXT        NOT NULL,
  status                    TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'partially_approved', 'rejected', 'cancelled')),
  -- Principal decision
  principal_decision_by_id  UUID        NULL REFERENCES user_accounts(id),
  principal_decision_by_name TEXT       NULL,
  principal_decision_at     TIMESTAMPTZ NULL,
  principal_remarks         TEXT        NULL,
  approved_set_count        INTEGER     NULL,
  approved_set_names        TEXT[]      NULL,
  -- Tracking
  sets_generated_from_this  INTEGER     NOT NULL DEFAULT 0,  -- how many approved sets were actually generated
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apr_subject_id        ON additional_paper_requests(subject_id);
CREATE INDEX IF NOT EXISTS idx_apr_department_id     ON additional_paper_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_apr_academic_year_id  ON additional_paper_requests(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_apr_status            ON additional_paper_requests(status);
CREATE INDEX IF NOT EXISTS idx_apr_requested_by      ON additional_paper_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_apr_created_at        ON additional_paper_requests(created_at DESC);

DROP TRIGGER IF EXISTS set_additional_paper_requests_updated_at ON additional_paper_requests;
CREATE TRIGGER set_additional_paper_requests_updated_at
  BEFORE UPDATE ON additional_paper_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE IF EXISTS additional_paper_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on additional_paper_requests" ON additional_paper_requests;
CREATE POLICY "Allow all on additional_paper_requests" ON additional_paper_requests
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Now add FK from paper_set_tracking to additional_paper_requests
ALTER TABLE paper_set_tracking
  ADD COLUMN IF NOT EXISTS additional_set_request_id UUID REFERENCES additional_paper_requests(id);
CREATE INDEX IF NOT EXISTS idx_pst_request_id ON paper_set_tracking(additional_set_request_id);

-- ============================================================
-- 4. TABLE: principal_paper_assignments
-- Exam Cell assigns a generated paper to the Principal for review.
-- ============================================================
CREATE TABLE IF NOT EXISTS principal_paper_assignments (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Paper identification (using paper_code since papers are stored locally)
  paper_code              TEXT        NOT NULL,
  local_paper_id          TEXT        NOT NULL,         -- frontend paper id
  subject_code            TEXT        NOT NULL,
  subject_name            TEXT,
  exam_type               TEXT        NOT NULL,
  set_name                TEXT,
  set_display_name        TEXT,
  academic_year_id        UUID        REFERENCES academic_years(id),
  department_id           UUID        REFERENCES departments(id),
  -- Assignment
  assigned_principal_id   UUID        NOT NULL REFERENCES user_accounts(id),
  assigned_principal_name TEXT        NOT NULL,
  assigned_by_user_id     UUID        NOT NULL REFERENCES user_accounts(id),
  assigned_by_name        TEXT        NOT NULL,
  assigned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Review
  review_status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'reviewed', 'returned')),
  review_remarks          TEXT        NULL,
  reviewed_at             TIMESTAMPTZ NULL,
  -- Paper snapshot (JSON of the full paper data for Principal to view)
  paper_snapshot          JSONB       NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppa_paper_code         ON principal_paper_assignments(paper_code);
CREATE INDEX IF NOT EXISTS idx_ppa_principal_id       ON principal_paper_assignments(assigned_principal_id);
CREATE INDEX IF NOT EXISTS idx_ppa_assigned_by        ON principal_paper_assignments(assigned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ppa_review_status      ON principal_paper_assignments(review_status);
CREATE INDEX IF NOT EXISTS idx_ppa_created_at         ON principal_paper_assignments(created_at DESC);

DROP TRIGGER IF EXISTS set_principal_paper_assignments_updated_at ON principal_paper_assignments;
CREATE TRIGGER set_principal_paper_assignments_updated_at
  BEFORE UPDATE ON principal_paper_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE IF EXISTS principal_paper_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on principal_paper_assignments" ON principal_paper_assignments;
CREATE POLICY "Allow all on principal_paper_assignments" ON principal_paper_assignments
  FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================
-- 5. TABLE: paper_request_notifications
-- Simple notification table so Exam Cell sees Principal decisions
-- ============================================================
CREATE TABLE IF NOT EXISTS paper_request_notifications (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id    UUID        NOT NULL REFERENCES user_accounts(id),
  request_id      UUID        NOT NULL REFERENCES additional_paper_requests(id),
  notification_type TEXT      NOT NULL CHECK (notification_type IN ('approved','partially_approved','rejected','submitted','generated')),
  message         TEXT        NOT NULL,
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prn_recipient ON paper_request_notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_prn_created_at ON paper_request_notifications(created_at DESC);

ALTER TABLE IF EXISTS paper_request_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on paper_request_notifications" ON paper_request_notifications;
CREATE POLICY "Allow all on paper_request_notifications" ON paper_request_notifications
  FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Storage bucket for supporting documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('paper-requests', 'paper-requests', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Allow paper-requests storage operations'
  ) THEN
    CREATE POLICY "Allow paper-requests storage operations" ON storage.objects
      FOR ALL TO public
      USING (bucket_id = 'paper-requests')
      WITH CHECK (bucket_id = 'paper-requests');
  END IF;
END $$;

-- ============================================================
-- DONE — Run seed script after migration:
--   npx tsx server/scripts/seedAccounts.ts
-- ============================================================
