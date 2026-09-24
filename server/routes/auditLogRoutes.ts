import express, { Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseQuestionBankService';

const router = express.Router();

/**
 * POST /api/audit-logs
 * Internal endpoint — records an audit log entry.
 * Called server-side after login/logout/admin actions.
 * NEVER stores passwords, tokens, or API keys.
 */
router.post('/audit-logs', async (req: express.Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      // Silently succeed if Supabase is not configured (avoids blocking the app)
      return res.status(200).json({ success: true, skipped: true });
    }

    const { user_id, user_email, user_name, role, action, status, ip_address, user_agent, metadata } = req.body;

    if (!user_email || !role || !action || !status) {
      return res.status(400).json({ error: 'user_email, role, action, status are required.' });
    }

    // Safety check: reject if any sensitive keys are accidentally included
    const safeMetadata = metadata ? { ...metadata } : null;
    if (safeMetadata) {
      delete safeMetadata.password;
      delete safeMetadata.password_hash;
      delete safeMetadata.token;
      delete safeMetadata.api_key;
      delete safeMetadata.service_role_key;
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('audit_logs')
      .insert({
        user_id: user_id || null,
        user_email: String(user_email).toLowerCase().trim(),
        user_name: user_name || null,
        role: String(role),
        action: String(action).toUpperCase(),
        status: String(status).toUpperCase(),
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        metadata: safeMetadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[auditLog] Insert error:', error.message);
      // Don't block the caller — audit log failure should not break the app
      return res.status(200).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    console.error('[auditLog] POST error:', err?.message);
    return res.status(200).json({ success: false, error: err?.message });
  }
});

/**
 * GET /api/audit-logs
 * Returns audit logs with optional filters.
 * Requires authentication.
 */
router.get('/audit-logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json([]);
    }

    const { search, role, action, status, from, to, limit } = req.query;
    const client = getSupabaseClient();

    let query = client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit) || 200);

    if (role) query = query.eq('role', String(role));
    if (action) query = query.eq('action', String(action).toUpperCase());
    if (status) query = query.eq('status', String(status).toUpperCase());
    if (from) query = query.gte('created_at', String(from));
    if (to) query = query.lte('created_at', String(to));
    if (search) {
      const s = String(search).toLowerCase();
      query = query.or(`user_email.ilike.%${s}%,user_name.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json(data || []);
  } catch (err: any) {
    console.error('[auditLog] GET error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to fetch audit logs.' });
  }
});

export default router;
