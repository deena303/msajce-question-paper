/**
 * Paper Set Control Routes
 * Handles:
 *  - Set limit status checks
 *  - Paper set tracking (writing to DB on generate)
 *  - Additional paper requests (Exam Cell → Principal)
 *  - Principal decisions (approve / reject)
 *  - Paper assignments to Principal for review
 *  - Notifications
 */
import express, { Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';
import { isSupabaseConfigured, getSupabaseClient } from '../services/supabaseQuestionBankService';

const router = express.Router();

// ====================================================================
// HELPERS
// ====================================================================

const SET_LIMITS: Record<string, number> = {
  'Internal Assessment I': 2,
  'Internal Assessment II': 2,
  'End Semester Examination': 4
};

const ALL_SET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getStandardSetNames(examType: string): string[] {
  const limit = SET_LIMITS[examType] ?? 2;
  return ALL_SET_LETTERS.slice(0, limit);
}

async function insertAuditLog(params: {
  user_id?: string | null;
  user_email: string;
  user_name?: string | null;
  role: string;
  action: string;
  status: string;
  metadata?: Record<string, any> | null;
}): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseClient();
    await client.from('audit_logs').insert({
      user_id: params.user_id || null,
      user_email: String(params.user_email).toLowerCase().trim(),
      user_name: params.user_name || null,
      role: String(params.role),
      action: String(params.action).toUpperCase(),
      status: String(params.status).toUpperCase(),
      metadata: params.metadata || null,
      created_at: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('[audit] paper-set audit log failed:', err?.message);
  }
}

async function generateRequestNumber(client: any): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await client
    .from('additional_paper_requests')
    .select('*', { count: 'exact', head: true });
  const seq = ((count ?? 0) + 1).toString().padStart(3, '0');
  return `APR-${year}-${seq}`;
}

// ====================================================================
// GET /api/paper-sets/status
// Query current set counts and limit info for a specific combination
// ====================================================================
router.get('/paper-sets/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({ sets: [], count: 0, limit: 2, limitReached: false, nextSetName: 'A', pendingRequest: null });
    }
    const client = getSupabaseClient();
    const { subjectId, academicYearId, departmentId, examType } = req.query as Record<string, string>;

    if (!subjectId || !academicYearId || !departmentId || !examType) {
      return res.status(400).json({ error: 'subjectId, academicYearId, departmentId, examType are required.' });
    }

    // Get existing sets from tracking table
    const { data: existingSets, error } = await client
      .from('paper_set_tracking')
      .select('set_name, set_display_name, paper_code, created_at, created_by_name')
      .eq('subject_id', subjectId)
      .eq('academic_year_id', academicYearId)
      .eq('department_id', departmentId)
      .eq('exam_type', examType)
      .eq('generation_status', 'generated')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[paper-sets] status query error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const sets = existingSets || [];
    const generatedSetNames = sets.map((s: any) => s.set_name);
    const limit = SET_LIMITS[examType] ?? 2;
    const standardSetNames = getStandardSetNames(examType);
    const limitReached = generatedSetNames.length >= limit;

    // Find next available set name (including beyond standard limit)
    let nextSetName = 'A';
    for (const letter of ALL_SET_LETTERS) {
      if (!generatedSetNames.includes(letter)) {
        nextSetName = letter;
        break;
      }
    }

    // Check for active (pending/approved/partially_approved) additional paper requests
    const { data: requests } = await client
      .from('additional_paper_requests')
      .select('id, request_number, status, requested_set_names, approved_set_names, approved_set_count, sets_generated_from_this, principal_remarks')
      .eq('subject_id', subjectId)
      .eq('academic_year_id', academicYearId)
      .eq('department_id', departmentId)
      .eq('exam_type', examType)
      .in('status', ['pending', 'approved', 'partially_approved'])
      .order('created_at', { ascending: false })
      .limit(1);

    const activeRequest = requests && requests.length > 0 ? requests[0] : null;

    // Determine if there's an unused approval that allows generation
    let hasValidApproval = false;
    let approvedSetNamesAvailable: string[] = [];
    if (activeRequest && (activeRequest.status === 'approved' || activeRequest.status === 'partially_approved')) {
      const approvedSets: string[] = activeRequest.approved_set_names || [];
      const generatedFromThis: number = activeRequest.sets_generated_from_this || 0;
      const approvedCount: number = activeRequest.approved_set_count || approvedSets.length;
      // Which approved sets have NOT been generated yet?
      approvedSetNamesAvailable = approvedSets.filter((s: string) => !generatedSetNames.includes(s));
      hasValidApproval = approvedSetNamesAvailable.length > 0;
    }

    return res.json({
      sets,
      count: generatedSetNames.length,
      generatedSetNames,
      limit,
      standardSetNames,
      limitReached,
      nextSetName: hasValidApproval ? (approvedSetNamesAvailable[0] || nextSetName) : nextSetName,
      canGenerate: !limitReached || hasValidApproval,
      hasValidApproval,
      approvedSetNamesAvailable,
      activeRequest,
      examTypeRule: examType.includes('Internal Assessment')
        ? `Standard limit: 2 sets (A and B). Additional sets require Principal approval.`
        : `Standard limit: 4 sets (A, B, C and D). Additional sets require Principal approval.`
    });
  } catch (err: any) {
    console.error('[paper-sets] status error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get paper set status.' });
  }
});

// ====================================================================
// POST /api/paper-sets/track
// Record a generated set. Validates limits server-side before inserting.
// ====================================================================
router.post('/paper-sets/track', requireAuth, requireRole('EXAM_CELL', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: 'Tracking skipped (Supabase not configured).' });
    }
    const client = getSupabaseClient();
    const {
      subjectId, academicYearId, departmentId, examType,
      setName, setDisplayName, paperCode, localPaperId,
      additionalSetRequestId
    } = req.body;

    if (!subjectId || !academicYearId || !departmentId || !examType || !setName) {
      return res.status(400).json({ error: 'subjectId, academicYearId, departmentId, examType, setName are required.' });
    }

    const limit = SET_LIMITS[examType] ?? 2;

    // --- Server-side validation: count current generated sets ---
    const { data: existingSets, error: countErr } = await client
      .from('paper_set_tracking')
      .select('set_name')
      .eq('subject_id', subjectId)
      .eq('academic_year_id', academicYearId)
      .eq('department_id', departmentId)
      .eq('exam_type', examType)
      .eq('generation_status', 'generated');

    if (countErr) return res.status(500).json({ error: countErr.message });

    const generatedSetNames = (existingSets || []).map((s: any) => s.set_name);

    // Check for duplicate set name
    if (generatedSetNames.includes(setName)) {
      return res.status(409).json({ error: `Set ${setName} has already been generated for this subject, year, department, and exam type.` });
    }

    const isStandardSet = getStandardSetNames(examType).includes(setName);
    const withinLimit = generatedSetNames.length < limit;

    if (!withinLimit && !isStandardSet) {
      // Additional set — must have valid approval
      if (!additionalSetRequestId) {
        return res.status(403).json({ error: 'Standard set limit reached. An approved additional paper request is required.' });
      }

      // Validate that the approval is real, belongs to this subject/year/dept/exam, and covers this set
      const { data: approval, error: approvalErr } = await client
        .from('additional_paper_requests')
        .select('id, status, approved_set_names, sets_generated_from_this, approved_set_count, subject_id, academic_year_id, department_id, exam_type')
        .eq('id', additionalSetRequestId)
        .maybeSingle();

      if (approvalErr || !approval) {
        return res.status(403).json({ error: 'Invalid or non-existent approval request.' });
      }
      if (approval.status !== 'approved' && approval.status !== 'partially_approved') {
        return res.status(403).json({ error: 'The associated request has not been approved.' });
      }
      // Validate it belongs to exact same subject/year/dept/exam
      if (
        approval.subject_id !== subjectId ||
        approval.academic_year_id !== academicYearId ||
        approval.department_id !== departmentId ||
        approval.exam_type !== examType
      ) {
        return res.status(403).json({ error: 'Approval does not match the current subject, academic year, department, or exam type.' });
      }
      // Validate that the requested set name is in the approved list
      const approvedSets: string[] = approval.approved_set_names || [];
      if (!approvedSets.includes(setName)) {
        return res.status(403).json({ error: `Set ${setName} is not in the approved set list.` });
      }
      // Validate that not all approved sets have already been generated
      const alreadyGenerated = generatedSetNames.filter((s: string) => approvedSets.includes(s));
      if (alreadyGenerated.length >= (approval.approved_set_count || approvedSets.length)) {
        return res.status(403).json({ error: 'All approved additional sets have already been generated.' });
      }
    } else if (!withinLimit) {
      return res.status(403).json({ error: 'Standard set limit reached. Request and obtain Principal approval before generating additional sets.' });
    }

    // --- Insert tracking record ---
    const { data: inserted, error: insertErr } = await client
      .from('paper_set_tracking')
      .insert({
        academic_year_id: academicYearId,
        department_id: departmentId,
        subject_id: subjectId,
        exam_type: examType,
        set_name: setName,
        set_display_name: setDisplayName || null,
        paper_code: paperCode || null,
        local_paper_id: localPaperId || null,
        generation_status: 'generated',
        additional_set_request_id: additionalSetRequestId || null,
        created_by_user_id: req.user!.userId,
        created_by_name: req.user!.name
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(409).json({ error: `Set ${setName} already tracked for this combination.` });
      }
      return res.status(500).json({ error: insertErr.message });
    }

    // If this came from an additional request, increment sets_generated_from_this
    if (additionalSetRequestId) {
      await client
        .from('additional_paper_requests')
        .update({ sets_generated_from_this: client.rpc ? undefined : undefined }) // handled below
        .eq('id', additionalSetRequestId);

      // Increment via direct update
      const { data: reqData } = await client
        .from('additional_paper_requests')
        .select('sets_generated_from_this')
        .eq('id', additionalSetRequestId)
        .single();
      if (reqData) {
        await client
          .from('additional_paper_requests')
          .update({ sets_generated_from_this: (reqData.sets_generated_from_this || 0) + 1 })
          .eq('id', additionalSetRequestId);
      }
    }

    // Audit log
    insertAuditLog({
      user_id: req.user!.userId,
      user_email: req.user!.email,
      user_name: req.user!.name,
      role: req.user!.role,
      action: additionalSetRequestId ? 'ADDITIONAL_SET_GENERATED' : 'PAPER_SET_GENERATED',
      status: 'SUCCESS',
      metadata: { subjectId, examType, setName, paperCode }
    });

    return res.json({ success: true, tracking: inserted });
  } catch (err: any) {
    console.error('[paper-sets] track error:', err);
    return res.status(500).json({ error: err.message || 'Failed to track paper set.' });
  }
});

// ====================================================================
// GET /api/paper-requests
// List additional paper requests (role-filtered)
// ====================================================================
router.get('/paper-requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const client = getSupabaseClient();

    let query = client
      .from('additional_paper_requests')
      .select(`
        *,
        subjects(subject_code, subject_name),
        academic_years(year_label),
        departments(department_code, department_name)
      `)
      .order('created_at', { ascending: false });

    // Exam Cell only sees their own requests; Principal/Super Admin sees all
    if (req.user!.role === 'EXAM_CELL') {
      query = query.eq('requested_by_user_id', req.user!.userId);
    }

    // Filters from query params
    const { status, subjectId, academicYearId, departmentId, examType } = req.query as Record<string, string>;
    if (status) query = query.eq('status', status);
    if (subjectId) query = query.eq('subject_id', subjectId);
    if (academicYearId) query = query.eq('academic_year_id', academicYearId);
    if (departmentId) query = query.eq('department_id', departmentId);
    if (examType) query = query.eq('exam_type', examType);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// POST /api/paper-requests
// Exam Cell submits a new additional paper request
// ====================================================================
router.post('/paper-requests', requireAuth, requireRole('EXAM_CELL', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Database not configured.' });
    }
    const client = getSupabaseClient();

    const {
      academicYearId, departmentId, subjectId, examType,
      existingSetCount, existingSetNames, requestedSetCount,
      requestedSetNames, reason, supportingDocumentPath
    } = req.body;

    if (!academicYearId || !departmentId || !subjectId || !examType || !reason) {
      return res.status(400).json({ error: 'academicYearId, departmentId, subjectId, examType, reason are required.' });
    }

    // Check for existing pending request for same combination
    const { data: existing } = await client
      .from('additional_paper_requests')
      .select('id, status')
      .eq('subject_id', subjectId)
      .eq('academic_year_id', academicYearId)
      .eq('department_id', departmentId)
      .eq('exam_type', examType)
      .eq('status', 'pending')
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'A pending request already exists for this subject and examination. Wait for the Principal\'s decision before submitting a new request.' });
    }

    const requestNumber = await generateRequestNumber(client);

    const { data: inserted, error } = await client
      .from('additional_paper_requests')
      .insert({
        request_number: requestNumber,
        academic_year_id: academicYearId,
        department_id: departmentId,
        subject_id: subjectId,
        exam_type: examType,
        existing_set_count: existingSetCount || 0,
        existing_set_names: existingSetNames || [],
        requested_set_count: requestedSetCount || 1,
        requested_set_names: requestedSetNames || [],
        reason,
        supporting_document_path: supportingDocumentPath || null,
        requested_by_user_id: req.user!.userId,
        requested_by_name: req.user!.name,
        status: 'pending'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Notify all Principal accounts
    const { data: principals } = await client
      .from('user_accounts')
      .select('id')
      .eq('role', 'PRINCIPAL')
      .eq('status', 'active');

    if (principals && principals.length > 0) {
      const notifications = principals.map((p: any) => ({
        recipient_id: p.id,
        request_id: inserted.id,
        notification_type: 'submitted',
        message: `New additional paper request ${requestNumber} submitted by ${req.user!.name} for ${examType}.`
      }));
      await client.from('paper_request_notifications').insert(notifications);
    }

    insertAuditLog({
      user_id: req.user!.userId,
      user_email: req.user!.email,
      user_name: req.user!.name,
      role: req.user!.role,
      action: 'ADDITIONAL_PAPER_REQUEST_SUBMITTED',
      status: 'SUCCESS',
      metadata: { requestId: inserted.id, requestNumber, subjectId, examType }
    });

    return res.status(201).json(inserted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// PUT /api/paper-requests/:id/decision
// Principal approves, partially approves, or rejects a request
// ====================================================================
router.put('/paper-requests/:id/decision', requireAuth, requireRole('PRINCIPAL', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Database not configured.' });
    }
    const client = getSupabaseClient();
    const { id } = req.params;
    const { decision, remarks, approvedSetCount, approvedSetNames } = req.body;

    if (!decision || !['approved', 'partially_approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approved, partially_approved, or rejected.' });
    }

    if ((decision === 'rejected' || decision === 'partially_approved') && !remarks) {
      return res.status(400).json({ error: 'Remarks are mandatory when rejecting or partially approving a request.' });
    }

    // Fetch the request to validate it's pending
    const { data: request, error: fetchErr } = await client
      .from('additional_paper_requests')
      .select('*, subjects(subject_code, subject_name), requested_by_user_id, requested_by_name')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !request) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ error: `Request is already in status: ${request.status}. Only pending requests can receive a decision.` });
    }

    const updatePayload: Record<string, any> = {
      status: decision,
      principal_decision_by_id: req.user!.userId,
      principal_decision_by_name: req.user!.name,
      principal_decision_at: new Date().toISOString(),
      principal_remarks: remarks || null
    };

    if (decision === 'approved') {
      updatePayload.approved_set_count = request.requested_set_count;
      updatePayload.approved_set_names = request.requested_set_names;
    } else if (decision === 'partially_approved') {
      if (!approvedSetCount || !approvedSetNames || approvedSetNames.length === 0) {
        return res.status(400).json({ error: 'approvedSetCount and approvedSetNames are required for partial approval.' });
      }
      updatePayload.approved_set_count = approvedSetCount;
      updatePayload.approved_set_names = approvedSetNames;
    }

    const { data: updated, error: updateErr } = await client
      .from('additional_paper_requests')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    // Notify the Exam Cell user who submitted the request
    await client.from('paper_request_notifications').insert({
      recipient_id: request.requested_by_user_id,
      request_id: id,
      notification_type: decision,
      message: `Your request ${request.request_number} has been ${decision.replace('_', ' ')} by ${req.user!.name}. ${remarks ? 'Remarks: ' + remarks : ''}`
    });

    insertAuditLog({
      user_id: req.user!.userId,
      user_email: req.user!.email,
      user_name: req.user!.name,
      role: req.user!.role,
      action: `REQUEST_${decision.toUpperCase()}`,
      status: 'SUCCESS',
      metadata: { requestId: id, decision, approvedSetNames, remarks }
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// PUT /api/paper-requests/:id/cancel
// Exam Cell cancels their own pending request
// ====================================================================
router.put('/paper-requests/:id/cancel', requireAuth, requireRole('EXAM_CELL'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured.' });
    const client = getSupabaseClient();

    const { data: req2 } = await client
      .from('additional_paper_requests')
      .select('status, requested_by_user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!req2) return res.status(404).json({ error: 'Request not found.' });
    if (req2.requested_by_user_id !== req.user!.userId) return res.status(403).json({ error: 'You can only cancel your own requests.' });
    if (req2.status !== 'pending') return res.status(409).json({ error: 'Only pending requests can be cancelled.' });

    const { data: updated, error } = await client
      .from('additional_paper_requests')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// GET /api/paper-assignments
// Principal sees papers assigned to them; Exam Cell sees papers they assigned
// ====================================================================
router.get('/paper-assignments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const client = getSupabaseClient();

    let query = client
      .from('principal_paper_assignments')
      .select('*')
      .order('assigned_at', { ascending: false });

    if (req.user!.role === 'PRINCIPAL') {
      query = query.eq('assigned_principal_id', req.user!.userId);
    } else if (req.user!.role === 'EXAM_CELL') {
      query = query.eq('assigned_by_user_id', req.user!.userId);
    }
    // SUPER_ADMIN sees all

    const { reviewStatus } = req.query as Record<string, string>;
    if (reviewStatus) query = query.eq('review_status', reviewStatus);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// POST /api/paper-assignments
// Exam Cell assigns a paper to the Principal
// ====================================================================
router.post('/paper-assignments', requireAuth, requireRole('EXAM_CELL', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured.' });
    const client = getSupabaseClient();

    const {
      paperCode, localPaperId, subjectCode, subjectName,
      examType, setName, setDisplayName, academicYearId,
      departmentId, assignedPrincipalId, paperSnapshot
    } = req.body;

    if (!paperCode || !localPaperId || !subjectCode || !examType || !assignedPrincipalId) {
      return res.status(400).json({ error: 'paperCode, localPaperId, subjectCode, examType, assignedPrincipalId are required.' });
    }

    // Get Principal name
    const { data: principal } = await client
      .from('user_accounts')
      .select('name, role')
      .eq('id', assignedPrincipalId)
      .eq('role', 'PRINCIPAL')
      .maybeSingle();

    if (!principal) return res.status(404).json({ error: 'Principal user not found.' });

    const { data: inserted, error } = await client
      .from('principal_paper_assignments')
      .insert({
        paper_code: paperCode,
        local_paper_id: localPaperId,
        subject_code: subjectCode,
        subject_name: subjectName || null,
        exam_type: examType,
        set_name: setName || null,
        set_display_name: setDisplayName || null,
        academic_year_id: academicYearId || null,
        department_id: departmentId || null,
        assigned_principal_id: assignedPrincipalId,
        assigned_principal_name: principal.name,
        assigned_by_user_id: req.user!.userId,
        assigned_by_name: req.user!.name,
        review_status: 'pending',
        paper_snapshot: paperSnapshot || null
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    insertAuditLog({
      user_id: req.user!.userId,
      user_email: req.user!.email,
      user_name: req.user!.name,
      role: req.user!.role,
      action: 'PAPER_ASSIGNED_TO_PRINCIPAL',
      status: 'SUCCESS',
      metadata: { assignmentId: inserted.id, paperCode, subjectCode, examType, setName }
    });

    return res.status(201).json(inserted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// PUT /api/paper-assignments/:id/review
// Principal marks a paper as reviewed
// ====================================================================
router.put('/paper-assignments/:id/review', requireAuth, requireRole('PRINCIPAL', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured.' });
    const client = getSupabaseClient();

    const { reviewStatus, reviewRemarks } = req.body;
    if (!reviewStatus || !['reviewed', 'returned'].includes(reviewStatus)) {
      return res.status(400).json({ error: 'reviewStatus must be reviewed or returned.' });
    }

    // Verify this assignment belongs to this Principal
    const { data: assignment } = await client
      .from('principal_paper_assignments')
      .select('assigned_principal_id, paper_code')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
    if (req.user!.role === 'PRINCIPAL' && assignment.assigned_principal_id !== req.user!.userId) {
      return res.status(403).json({ error: 'This paper was not assigned to you.' });
    }

    const { data: updated, error } = await client
      .from('principal_paper_assignments')
      .update({
        review_status: reviewStatus,
        review_remarks: reviewRemarks || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    insertAuditLog({
      user_id: req.user!.userId,
      user_email: req.user!.email,
      user_name: req.user!.name,
      role: req.user!.role,
      action: 'PAPER_REVIEWED_BY_PRINCIPAL',
      status: 'SUCCESS',
      metadata: { assignmentId: req.params.id, reviewStatus, paperCode: assignment.paper_code }
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// GET /api/paper-requests/notifications
// Get unread notifications for the logged-in user
// ====================================================================
router.get('/paper-requests/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('paper_request_notifications')
      .select('*')
      .eq('recipient_id', req.user!.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark notifications as read
router.put('/paper-requests/notifications/mark-read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json({ success: true });
    const client = getSupabaseClient();
    await client
      .from('paper_request_notifications')
      .update({ is_read: true })
      .eq('recipient_id', req.user!.userId)
      .eq('is_read', false);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// GET /api/principals — list all active Principal accounts
// ====================================================================
router.get('/principals', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) return res.json([]);
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('user_accounts')
      .select('id, name, email')
      .eq('role', 'PRINCIPAL')
      .eq('status', 'active');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
