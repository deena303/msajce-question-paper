-- ============================================================
-- Migration 005: Create audit_logs table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NULL,
  user_email    TEXT NOT NULL,
  user_name     TEXT NULL,
  role          TEXT NOT NULL,
  action        TEXT NOT NULL,
  status        TEXT NOT NULL,
  ip_address    TEXT NULL,
  user_agent    TEXT NULL,
  metadata      JSONB NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email  ON public.audit_logs (user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_role        ON public.audit_logs (role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status      ON public.audit_logs (status);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by backend Netlify Function)
CREATE POLICY "service_role_full_access_audit_logs"
  ON public.audit_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
