/**
 * Frontend API service for authentication and master data.
 * Communicates with the backend API via /api or configured VITE_API_BASE_URL.
 * Token is passed in Authorization header — never stored in localStorage.
 */

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

/**
 * Safely handles parsing JSON responses.
 * Detects HTML/plain-text responses (e.g., from Netlify routing misconfiguration)
 * and produces informative error messages instead of SyntaxError: Unexpected token '<'.
 */
async function safeJsonParse<T>(res: Response, endpointDesc: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    console.error(`[authApi] ${endpointDesc} returned non-JSON content-type ("${contentType}"):`, rawText.slice(0, 300));
    if (rawText.trim().startsWith('<')) {
      throw new Error(
        `Backend API routing error (HTTP ${res.status}): Server returned HTML instead of JSON. Check Netlify Functions and API redirect rules.`
      );
    }
    throw new Error(`API returned non-JSON response (HTTP ${res.status}): ${rawText.slice(0, 100)}`);
  }
  return res.json();
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'EXAM_CELL' | 'PRINCIPAL';
    name: string;
  };
}

export interface AcademicYearRecord {
  id: string;
  year_label: string;
  status: 'active' | 'inactive';
  is_active?: boolean;
  start_year?: number | null;
  end_year?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRecord {
  id: string;
  department_code: string;
  department_name: string;
  short_name?: string | null;
  hod_name?: string | null;
  is_common?: boolean;
  is_active?: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SubjectRecord {
  id: string;
  subject_code: string;
  subject_name: string;
  department_id: string;
  academic_year_id: string;
  semester: string | null;
  regulation: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  departments?: DepartmentRecord;
  academic_years?: AcademicYearRecord;
}

// ============================================================
// AUTH
// ============================================================

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const url = `${API_BASE}/auth/login`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  } catch (netErr: any) {
    console.error('[authApi] Network failure reaching login endpoint:', netErr);
    throw new Error(`Cannot reach authentication server: ${netErr?.message || 'Network error'}`);
  }

  const data = await safeJsonParse<any>(res, 'POST /auth/login');
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || 'Login failed. Please check your credentials.');
  }
  return data as LoginResponse;
}

// ============================================================
// ACADEMIC YEARS
// ============================================================

export async function fetchAcademicYears(activeOnly = false): Promise<AcademicYearRecord[]> {
  try {
    const url = `${API_BASE}/academic-years${activeOnly ? '?activeOnly=true' : ''}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await safeJsonParse<any>(res, 'GET /academic-years');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createAcademicYear(yearLabel: string, token: string): Promise<AcademicYearRecord> {
  const res = await fetch(`${API_BASE}/academic-years`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ year_label: yearLabel, status: 'active' })
  });
  const data = await safeJsonParse<any>(res, 'POST /academic-years');
  if (!res.ok) throw new Error(data.error || 'Failed to create academic year.');
  return data;
}

export async function updateAcademicYear(id: string, updates: Partial<AcademicYearRecord>, token: string): Promise<AcademicYearRecord> {
  const res = await fetch(`${API_BASE}/academic-years/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates)
  });
  const data = await safeJsonParse<any>(res, `PUT /academic-years/${id}`);
  if (!res.ok) throw new Error(data.error || 'Failed to update academic year.');
  return data;
}

export async function deleteAcademicYear(id: string, token: string): Promise<{ id: string; _action: string; message: string }> {
  const res = await fetch(`${API_BASE}/academic-years/${id}`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
  });
  const data = await safeJsonParse<any>(res, `DELETE /academic-years/${id}`);
  if (!res.ok) throw new Error(data.error || 'Failed to delete academic year.');
  return data;
}

// ============================================================
// DEPARTMENTS
// ============================================================

export async function fetchDepartments(activeOnly = false): Promise<DepartmentRecord[]> {
  try {
    const url = `${API_BASE}/departments${activeOnly ? '?activeOnly=true' : ''}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await safeJsonParse<any>(res, 'GET /departments');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createDepartment(
  code: string,
  name: string,
  token: string,
  extra?: { short_name?: string; hod_name?: string; is_common?: boolean }
): Promise<DepartmentRecord> {
  const res = await fetch(`${API_BASE}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ department_code: code, department_name: name, status: 'active', ...extra })
  });
  const data = await safeJsonParse<any>(res, 'POST /departments');
  if (!res.ok) throw new Error(data.error || 'Failed to create department.');
  return data;
}

export async function updateDepartment(id: string, updates: Partial<DepartmentRecord>, token: string): Promise<DepartmentRecord> {
  const res = await fetch(`${API_BASE}/departments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates)
  });
  const data = await safeJsonParse<any>(res, `PUT /departments/${id}`);
  if (!res.ok) throw new Error(data.error || 'Failed to update department.');
  return data;
}

export async function deleteDepartment(id: string, token: string): Promise<{ id: string; _action: string; message: string }> {
  const res = await fetch(`${API_BASE}/departments/${id}`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
  });
  const data = await safeJsonParse<any>(res, `DELETE /departments/${id}`);
  if (!res.ok) throw new Error(data.error || 'Failed to delete department.');
  return data;
}

// ============================================================
// SUBJECTS
// ============================================================

export async function fetchSubjects(filters?: { academicYearId?: string; departmentId?: string; activeOnly?: boolean }): Promise<SubjectRecord[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.academicYearId) params.set('academicYearId', filters.academicYearId);
    if (filters?.departmentId) params.set('departmentId', filters.departmentId);
    if (filters?.activeOnly) params.set('activeOnly', 'true');
    const url = `${API_BASE}/subjects${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await safeJsonParse<any>(res, 'GET /subjects');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createSubject(payload: {
  subject_code: string;
  subject_name: string;
  department_id: string;
  academic_year_id: string;
  semester?: string;
  regulation?: string;
}, token: string): Promise<SubjectRecord> {
  const res = await fetch(`${API_BASE}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...payload, status: 'active' })
  });
  const data = await safeJsonParse<any>(res, 'POST /subjects');
  if (!res.ok) throw new Error(data.error || 'Failed to create subject.');
  return data;
}

export async function updateSubject(id: string, updates: Partial<SubjectRecord>, token: string): Promise<SubjectRecord> {
  const res = await fetch(`${API_BASE}/subjects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates)
  });
  const data = await safeJsonParse<any>(res, `PUT /subjects/${id}`);
  if (!res.ok) throw new Error(data.error || 'Failed to update subject.');
  return data;
}

export async function deleteSubject(id: string, token: string): Promise<{ id: string; _action: string; message: string }> {
  const res = await fetch(`${API_BASE}/subjects/${id}`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
  });
  const data = await safeJsonParse<any>(res, `DELETE /subjects/${id}`);
  if (!res.ok) throw new Error(data.error || 'Failed to delete subject.');
  return data;
}

// ============================================================
// STATS
// ============================================================

export async function fetchSummaryStats(): Promise<{
  academicYears: number;
  departments: number;
  subjects: number;
  questionBanks: number;
  generatedPapers: number;
}> {
  try {
    const res = await fetch(`${API_BASE}/stats/summary`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return { academicYears: 0, departments: 0, subjects: 0, questionBanks: 0, generatedPapers: 0 };
    return await safeJsonParse<any>(res, 'GET /stats/summary');
  } catch {
    return { academicYears: 0, departments: 0, subjects: 0, questionBanks: 0, generatedPapers: 0 };
  }
}

// ============================================================
// LOGOUT
// ============================================================

/**
 * Calls POST /api/auth/logout to record a LOGOUT audit entry.
 * Fire-and-forget — JWT is cleared by the client regardless.
 */
export async function logoutApi(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
    });
  } catch {
    // Ignore errors — logout always succeeds client-side
  }
}

// ============================================================
// AUDIT LOGS
// ============================================================

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string | null;
  role: string;
  action: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AuditLogFilters {
  search?: string;
  role?: string;
  action?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function fetchAuditLogs(filters: AuditLogFilters = {}, token: string): Promise<AuditLog[]> {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.role) params.set('role', filters.role);
    if (filters.action) params.set('action', filters.action);
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.limit) params.set('limit', String(filters.limit));
    const url = `${API_BASE}/audit-logs${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await safeJsonParse<any>(res, 'GET /audit-logs');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ============================================================
// PAPER SET STATUS & TRACKING
// ============================================================

export async function fetchPaperSetStatus(params: {
  subjectId: string;
  academicYearId: string;
  departmentId: string;
  examType: string;
}): Promise<any> {
  try {
    const p = new URLSearchParams(params as any);
    const res = await fetch(`${API_BASE}/paper-sets/status?${p.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    return await safeJsonParse<any>(res, 'GET /paper-sets/status');
  } catch {
    return null;
  }
}

export async function trackPaperSet(params: {
  subjectId: string;
  academicYearId: string;
  departmentId: string;
  examType: string;
  setName: string;
  setDisplayName?: string;
  paperCode?: string;
  localPaperId?: string;
  additionalSetRequestId?: string;
}, token: string): Promise<{ success: boolean; tracking?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/paper-sets/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params)
    });
    const data = await safeJsonParse<any>(res, 'POST /paper-sets/track');
    if (!res.ok) return { success: false, error: data.error || 'Failed to track paper set.' };
    return { success: true, tracking: data.tracking };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// ADDITIONAL PAPER REQUESTS
// ============================================================

export async function fetchPaperRequests(filters: {
  status?: string;
  subjectId?: string;
  academicYearId?: string;
  departmentId?: string;
  examType?: string;
} = {}, token: string): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.subjectId) params.set('subjectId', filters.subjectId);
    if (filters.academicYearId) params.set('academicYearId', filters.academicYearId);
    if (filters.departmentId) params.set('departmentId', filters.departmentId);
    if (filters.examType) params.set('examType', filters.examType);
    const url = `${API_BASE}/paper-requests${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await safeJsonParse<any>(res, 'GET /paper-requests');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function submitPaperRequest(payload: {
  academicYearId: string;
  departmentId: string;
  subjectId: string;
  examType: string;
  existingSetCount: number;
  existingSetNames: string[];
  requestedSetCount: number;
  requestedSetNames: string[];
  reason: string;
  supportingDocumentPath?: string;
}, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/paper-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await safeJsonParse<any>(res, 'POST /paper-requests');
  if (!res.ok) throw new Error(data.error || 'Failed to submit paper request.');
  return data;
}

export async function decidePaperRequest(
  id: string,
  payload: {
    decision: 'approved' | 'partially_approved' | 'rejected';
    remarks?: string;
    approvedSetCount?: number;
    approvedSetNames?: string[];
  },
  token: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/paper-requests/${id}/decision`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await safeJsonParse<any>(res, `PUT /paper-requests/${id}/decision`);
  if (!res.ok) throw new Error(data.error || 'Failed to process decision.');
  return data;
}

export async function cancelPaperRequest(id: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/paper-requests/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
  });
  const data = await safeJsonParse<any>(res, `PUT /paper-requests/${id}/cancel`);
  if (!res.ok) throw new Error(data.error || 'Failed to cancel request.');
  return data;
}

// ============================================================
// PRINCIPAL PAPER ASSIGNMENTS
// ============================================================

export async function fetchPaperAssignments(filters: { reviewStatus?: string } = {}, token: string): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (filters.reviewStatus) params.set('reviewStatus', filters.reviewStatus);
    const url = `${API_BASE}/paper-assignments${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await safeJsonParse<any>(res, 'GET /paper-assignments');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function assignPaperToPrincipal(payload: {
  paperCode: string;
  localPaperId: string;
  subjectCode: string;
  subjectName?: string;
  examType: string;
  setName?: string;
  setDisplayName?: string;
  academicYearId?: string;
  departmentId?: string;
  assignedPrincipalId: string;
  paperSnapshot?: any;
}, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/paper-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await safeJsonParse<any>(res, 'POST /paper-assignments');
  if (!res.ok) throw new Error(data.error || 'Failed to assign paper.');
  return data;
}

export async function reviewPaperAssignment(
  id: string,
  payload: { reviewStatus: 'reviewed' | 'returned'; reviewRemarks?: string },
  token: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/paper-assignments/${id}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await safeJsonParse<any>(res, `PUT /paper-assignments/${id}/review`);
  if (!res.ok) throw new Error(data.error || 'Failed to submit review.');
  return data;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function fetchNotifications(token: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/paper-requests/notifications`, {
      headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await safeJsonParse<any>(res, 'GET /paper-requests/notifications');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function markNotificationsRead(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/paper-requests/notifications/mark-read`, {
      method: 'PUT',
      headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
    });
  } catch { /* ignore */ }
}

// ============================================================
// PRINCIPALS LIST
// ============================================================

export async function fetchPrincipals(token: string): Promise<Array<{ id: string; name: string; email: string }>> {
  try {
    const res = await fetch(`${API_BASE}/principals`, {
      headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await safeJsonParse<any>(res, 'GET /principals');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
