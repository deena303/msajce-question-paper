import express, { Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseQuestionBankService';

const router = express.Router();

/**
 * Fire-and-forget audit log helper for master data CRUD actions.
 * NEVER stores passwords, tokens, or API keys.
 */
async function auditLog(
  req: AuthenticatedRequest,
  action: string,
  status: 'SUCCESS' | 'FAILED',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    if (!isSupabaseConfigured() || !req.user) return;
    const ip = req.ip || req.headers['x-forwarded-for'] as string || null;
    const ua = req.headers['user-agent'] || null;
    const client = getSupabaseClient();
    await client.from('audit_logs').insert({
      user_id: req.user.userId,
      user_email: req.user.email,
      user_name: req.user.name,
      role: req.user.role,
      action: action.toUpperCase(),
      status,
      ip_address: ip,
      user_agent: ua,
      metadata: metadata || null,
      created_at: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('[audit] masterData log failed:', err?.message);
  }
}

router.get('/academic-years', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const client = getSupabaseClient();
    let query = client.from('academic_years').select('*').order('year_label', { ascending: false });
    if (req.query.activeOnly === 'true') query = query.eq('status', 'active');
    const { data, error } = await query;
    if (error) throw error;
    return res.json(data || []);
  } catch (err: any) {
    console.error('[masterData] GET academic-years:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to fetch academic years.' });
  }
});

router.post('/academic-years', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year_label, status, start_year, end_year } = req.body;
    if (!year_label) return res.status(400).json({ error: 'year_label is required.' });
    const client = getSupabaseClient();
    const parts = String(year_label).split('-');
    const computedStart = start_year ?? (parts.length === 2 ? parseInt(parts[0]) : null);
    const computedEnd = end_year ?? (parts.length === 2 ? parseInt(parts[1]) : null);
    const { data, error } = await client
      .from('academic_years')
      .insert({ year_label: year_label.trim(), status: status || 'active', is_active: status !== 'inactive', start_year: computedStart, end_year: computedEnd })
      .select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Academic year already exists.' });
      throw error;
    }
    auditLog(req, 'CREATE_ACADEMIC_YEAR', 'SUCCESS', { year_label: data?.year_label });
    return res.status(201).json(data);
  } catch (err: any) {
    console.error('[masterData] POST academic-years:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to create academic year.' });
  }
});

router.put('/academic-years/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { year_label, status, start_year, end_year } = req.body;
    const client = getSupabaseClient();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (year_label !== undefined) updates.year_label = year_label.trim();
    if (status !== undefined) { updates.status = status; updates.is_active = status === 'active'; }
    if (start_year !== undefined) updates.start_year = start_year;
    if (end_year !== undefined) updates.end_year = end_year;
    const { data, error } = await client.from('academic_years').update(updates).eq('id', id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Academic year not found.' });
    auditLog(req, 'UPDATE_ACADEMIC_YEAR', 'SUCCESS', { id, year_label: data?.year_label });
    return res.json(data);
  } catch (err: any) {
    console.error('[masterData] PUT academic-years:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to update academic year.' });
  }
});

router.delete('/academic-years/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    const { count: subjectCount } = await client.from('subjects').select('*', { count: 'exact', head: true }).eq('academic_year_id', id);
    if (subjectCount && subjectCount > 0) {
      const { data, error } = await client.from('academic_years').update({ status: 'inactive', is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return res.json({ ...data, _action: 'deactivated', message: 'Academic year deactivated (referenced by subjects).' });
    }
    const { error } = await client.from('academic_years').delete().eq('id', id);
    if (error) throw error;
    return res.json({ id, _action: 'deleted', message: 'Academic year deleted.' });
  } catch (err: any) {
    console.error('[masterData] DELETE academic-years:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to delete academic year.' });
  }
});

router.get('/departments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const client = getSupabaseClient();
    let query = client.from('departments').select('id, department_code, department_name, short_name, hod_name, is_common, is_active, status, created_at, updated_at').order('department_code');
    if (req.query.activeOnly === 'true') query = query.eq('status', 'active');
    const { data, error } = await query;
    if (error) throw error;
    return res.json(data || []);
  } catch (err: any) {
    console.error('[masterData] GET departments:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to fetch departments.' });
  }
});

router.post('/departments', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { department_code, department_name, short_name, hod_name, is_common, status } = req.body;
    if (!department_code || !department_name) return res.status(400).json({ error: 'department_code and department_name are required.' });
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('departments')
      .insert({ department_code: department_code.trim().toUpperCase(), department_name: department_name.trim(), short_name: short_name?.trim() || null, hod_name: hod_name?.trim() || null, is_common: is_common ?? false, is_active: status !== 'inactive', status: status || 'active' })
      .select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Department code already exists.' });
      throw error;
    }
    auditLog(req, 'CREATE_DEPARTMENT', 'SUCCESS', { department_code: data?.department_code });
    return res.status(201).json(data);
  } catch (err: any) {
    console.error('[masterData] POST departments:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to create department.' });
  }
});

router.put('/departments/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { department_code, department_name, short_name, hod_name, is_common, status } = req.body;
    const client = getSupabaseClient();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (department_code !== undefined) updates.department_code = department_code.trim().toUpperCase();
    if (department_name !== undefined) updates.department_name = department_name.trim();
    if (short_name !== undefined) updates.short_name = short_name?.trim() || null;
    if (hod_name !== undefined) updates.hod_name = hod_name?.trim() || null;
    if (is_common !== undefined) updates.is_common = is_common;
    if (status !== undefined) { updates.status = status; updates.is_active = status === 'active'; }
    const { data, error } = await client.from('departments').update(updates).eq('id', id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Department not found.' });
    const actionType = updates.status === 'inactive' ? 'DEACTIVATE_DEPARTMENT' : 'UPDATE_DEPARTMENT';
    auditLog(req, actionType, 'SUCCESS', { id, department_code: data?.department_code });
    return res.json(data);
  } catch (err: any) {
    console.error('[masterData] PUT departments:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to update department.' });
  }
});

router.delete('/departments/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    const [{ count: subjectCount }, { count: qdCount }] = await Promise.all([
      client.from('subjects').select('*', { count: 'exact', head: true }).eq('department_id', id),
      client.from('question_departments').select('*', { count: 'exact', head: true }).eq('department_id', id),
    ]);
    const isReferenced = (subjectCount ?? 0) > 0 || (qdCount ?? 0) > 0;
    if (isReferenced) {
      const { data, error } = await client.from('departments').update({ status: 'inactive', is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return res.json({ ...data, _action: 'deactivated', message: 'Department deactivated (referenced by existing records).' });
    }
    const { error } = await client.from('departments').delete().eq('id', id);
    if (error) throw error;
    return res.json({ id, _action: 'deleted', message: 'Department deleted.' });
  } catch (err: any) {
    console.error('[masterData] DELETE departments:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to delete department.' });
  }
});

router.get('/subjects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const client = getSupabaseClient();
    let query = client.from('subjects').select('*, departments (id, department_code, department_name, short_name, hod_name, is_common), academic_years (id, year_label, start_year, end_year)').order('subject_code');
    if (req.query.activeOnly === 'true') query = query.eq('status', 'active');
    if (req.query.academicYearId) query = query.eq('academic_year_id', req.query.academicYearId as string);
    if (req.query.departmentId) query = query.eq('department_id', req.query.departmentId as string);
    if (req.query.yearOfStudy) query = query.eq('year_of_study', req.query.yearOfStudy as string);
    const { data, error } = await query;
    if (error) throw error;
    return res.json(data || []);
  } catch (err: any) {
    console.error('[masterData] GET subjects:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to fetch subjects.' });
  }
});

router.post('/subjects', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject_code, subject_name, department_id, academic_year_id, semester, regulation, status, year_of_study, faculty_name, faculty_department } = req.body;
    if (!subject_code || !subject_name || !department_id || !academic_year_id) return res.status(400).json({ error: 'subject_code, subject_name, department_id, academic_year_id are required.' });
    const client = getSupabaseClient();
    const [{ data: yr }, { data: dept }] = await Promise.all([
      client.from('academic_years').select('id, status').eq('id', academic_year_id).single(),
      client.from('departments').select('id, status').eq('id', department_id).single(),
    ]);
    if (!yr) return res.status(400).json({ error: 'Invalid academic year.' });
    if (!dept) return res.status(400).json({ error: 'Invalid department.' });
    if (yr.status === 'inactive') return res.status(400).json({ error: 'Academic year is inactive.' });
    if (dept.status === 'inactive') return res.status(400).json({ error: 'Department is inactive.' });
    
    const insertPayload: Record<string, any> = {
      subject_code: subject_code.trim().toUpperCase(),
      subject_name: subject_name.trim(),
      department_id,
      academic_year_id,
      semester: semester?.trim() || null,
      regulation: regulation?.trim() || null,
      status: status || 'active'
    };
    if (year_of_study !== undefined) insertPayload.year_of_study = year_of_study?.trim() || '3rd Year';
    if (faculty_name !== undefined) insertPayload.faculty_name = faculty_name?.trim() || null;
    if (faculty_department !== undefined) insertPayload.faculty_department = faculty_department?.trim() || null;

    const { data, error } = await client.from('subjects').insert(insertPayload).select('*, departments (id, department_code, department_name, short_name, hod_name, is_common), academic_years (id, year_label, start_year, end_year)').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Subject with this code already exists for the selected department and academic year.' });
      throw error;
    }
    auditLog(req, 'CREATE_SUBJECT', 'SUCCESS', { subject_code: data?.subject_code, subject_name: data?.subject_name });
    return res.status(201).json(data);
  } catch (err: any) {
    console.error('[masterData] POST subjects:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to create subject.' });
  }
});

router.put('/subjects/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subject_code, subject_name, department_id, academic_year_id, semester, regulation, status, year_of_study, faculty_name, faculty_department } = req.body;
    const client = getSupabaseClient();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (subject_code !== undefined) updates.subject_code = subject_code.trim().toUpperCase();
    if (subject_name !== undefined) updates.subject_name = subject_name.trim();
    if (department_id !== undefined) updates.department_id = department_id;
    if (academic_year_id !== undefined) updates.academic_year_id = academic_year_id;
    if (semester !== undefined) updates.semester = semester?.trim() || null;
    if (regulation !== undefined) updates.regulation = regulation?.trim() || null;
    if (status !== undefined) updates.status = status;
    if (year_of_study !== undefined) updates.year_of_study = year_of_study?.trim() || null;
    if (faculty_name !== undefined) updates.faculty_name = faculty_name?.trim() || null;
    if (faculty_department !== undefined) updates.faculty_department = faculty_department?.trim() || null;
    const { data, error } = await client.from('subjects').update(updates).eq('id', id).select('*, departments (id, department_code, department_name, short_name, hod_name, is_common), academic_years (id, year_label, start_year, end_year)').single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Subject not found.' });
    const actionType = updates.status === 'inactive' ? 'DEACTIVATE_SUBJECT' : 'UPDATE_SUBJECT';
    auditLog(req, actionType, 'SUCCESS', { id, subject_code: data?.subject_code, subject_name: data?.subject_name });
    return res.json(data);
  } catch (err: any) {
    console.error('[masterData] PUT subjects:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to update subject.' });
  }
});

router.delete('/subjects/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    const { count: qbCount } = await client.from('question_banks').select('*', { count: 'exact', head: true }).eq('subject_id', id);
    if (qbCount && qbCount > 0) {
      const { data, error } = await client.from('subjects').update({ status: 'inactive', updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return res.json({ ...data, _action: 'deactivated', message: 'Subject deactivated (referenced by question banks).' });
    }
    const { error } = await client.from('subjects').delete().eq('id', id);
    if (error) throw error;
    return res.json({ id, _action: 'deleted', message: 'Subject deleted.' });
  } catch (err: any) {
    console.error('[masterData] DELETE subjects:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to delete subject.' });
  }
});

router.get('/question-dept-mappings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const { questionId } = req.query;
    if (!questionId) return res.status(400).json({ error: 'questionId is required.' });
    const client = getSupabaseClient();
    const { data, error } = await client.from('question_departments').select('*, departments(id, department_code, department_name)').eq('question_id', questionId as string);
    if (error) throw error;
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

router.post('/question-dept-mappings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionId, departmentIds, scope } = req.body;
    if (!questionId || !Array.isArray(departmentIds) || departmentIds.length === 0) return res.status(400).json({ error: 'questionId and departmentIds[] are required.' });
    const client = getSupabaseClient();
    await client.from('question_departments').delete().eq('question_id', questionId);
    const rows = departmentIds.map((department_id: string) => ({ question_id: questionId, department_id }));
    const { error } = await client.from('question_departments').insert(rows);
    if (error) throw error;
    const resolvedScope = scope || (departmentIds.length > 1 ? 'COMMON' : 'SPECIFIC');
    await client.from('questions').update({ department_scope: resolvedScope }).eq('id', questionId);
    return res.json({ questionId, departmentIds, scope: resolvedScope });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

router.get('/stats/summary', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json({ academicYears: 0, departments: 0, subjects: 0, questionBanks: 0, generatedPapers: 0 });
    const client = getSupabaseClient();
    const [aResult, dResult, sResult, qbResult, gpResult] = await Promise.all([
      client.from('academic_years').select('*', { count: 'exact', head: true }),
      client.from('departments').select('*', { count: 'exact', head: true }),
      client.from('subjects').select('*', { count: 'exact', head: true }),
      client.from('question_banks').select('*', { count: 'exact', head: true }),
      client.from('generated_papers').select('*', { count: 'exact', head: true }),
    ]);
    return res.json({ academicYears: aResult.count ?? 0, departments: dResult.count ?? 0, subjects: sResult.count ?? 0, questionBanks: qbResult.count ?? 0, generatedPapers: gpResult.count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

router.get('/exam-patterns', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('exam_pattern_configs')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return res.json(data || []);
  } catch (err: any) {
    console.error('[masterData] GET exam-patterns:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to fetch exam patterns.' });
  }
});

router.put('/exam-patterns/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      exam_name,
      duration,
      max_marks,
      regulation,
      show_bl_co_pi,
      show_course_obj,
      part_a_config,
      part_b_config,
      part_c_config,
      instructions,
      status
    } = req.body;

    const client = getSupabaseClient();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (exam_name !== undefined) updates.exam_name = exam_name;
    if (duration !== undefined) updates.duration = duration;
    if (max_marks !== undefined) updates.max_marks = max_marks;
    if (regulation !== undefined) updates.regulation = regulation;
    if (show_bl_co_pi !== undefined) updates.show_bl_co_pi = show_bl_co_pi;
    if (show_course_obj !== undefined) updates.show_course_obj = show_course_obj;
    if (part_a_config !== undefined) updates.part_a_config = part_a_config;
    if (part_b_config !== undefined) updates.part_b_config = part_b_config;
    if (part_c_config !== undefined) updates.part_c_config = part_c_config;
    if (instructions !== undefined) updates.instructions = instructions;
    if (status !== undefined) updates.status = status;

    const { data, error } = await client
      .from('exam_pattern_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Exam pattern not found.' });
    auditLog(req, 'UPDATE_EXAM_PATTERN', 'SUCCESS', { id, exam_type: data.exam_type, exam_name: data.exam_name });
    return res.json(data);
  } catch (err: any) {
    console.error('[masterData] PUT exam-patterns:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to update exam pattern.' });
  }
});

export default router;
