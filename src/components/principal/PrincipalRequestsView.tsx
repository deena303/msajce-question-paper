import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  Filter,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchPaperRequests, decidePaperRequest } from '../../services/authApi';
import { AdditionalPaperRequest } from '../../types';

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  pending:           { label: 'Pending',           bg: 'bg-amber-100',   text: 'text-amber-800' },
  approved:          { label: 'Approved',          bg: 'bg-emerald-100', text: 'text-emerald-800' },
  partially_approved:{ label: 'Partial Approval',  bg: 'bg-blue-100',    text: 'text-blue-800' },
  rejected:          { label: 'Rejected',           bg: 'bg-red-100',     text: 'text-red-800' },
  cancelled:         { label: 'Cancelled',          bg: 'bg-gray-100',    text: 'text-gray-600' }
};

const SET_LETTERS = ['A','B','C','D','E','F','G','H'];

export const PrincipalRequestsView: React.FC = () => {
  const { authSession, showToast } = useApp();
  const [requests, setRequests] = useState<AdditionalPaperRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterExamType, setFilterExamType] = useState('all');

  // Decision modal state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionRequest, setDecisionRequest] = useState<AdditionalPaperRequest | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'partially_approved' | 'rejected'>('approved');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [partialSetCount, setPartialSetCount] = useState(1);
  const [partialSetNames, setPartialSetNames] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const token = authSession?.token || '';
    setLoading(true);
    fetchPaperRequests({}, token).then(data => {
      setRequests(data as AdditionalPaperRequest[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, [authSession]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterExamType !== 'all' && r.exam_type !== filterExamType) return false;
      if (search) {
        const q = search.toLowerCase();
        const subjectMatch = (r.subjects?.subject_name || '').toLowerCase().includes(q)
          || (r.subjects?.subject_code || '').toLowerCase().includes(q);
        const reqMatch = r.request_number.toLowerCase().includes(q);
        const byMatch = r.requested_by_name.toLowerCase().includes(q);
        if (!subjectMatch && !reqMatch && !byMatch) return false;
      }
      return true;
    });
  }, [requests, filterStatus, filterExamType, search]);

  const openDecisionModal = (req: AdditionalPaperRequest, type: 'approved' | 'partially_approved' | 'rejected') => {
    setDecisionRequest(req);
    setDecisionType(type);
    setDecisionRemarks('');
    setPartialSetCount(1);
    // Suggest the first unapproved set from the requested names
    setPartialSetNames(req.requested_set_names?.slice(0, 1) || []);
    setDecisionModalOpen(true);
  };

  const handleDecision = async () => {
    if (!decisionRequest || !authSession?.token) return;
    if ((decisionType === 'rejected' || decisionType === 'partially_approved') && !decisionRemarks.trim()) {
      showToast('Remarks are required when rejecting or partially approving.');
      return;
    }
    setSubmitting(true);
    try {
      await decidePaperRequest(decisionRequest.id, {
        decision: decisionType,
        remarks: decisionRemarks.trim() || undefined,
        approvedSetCount: decisionType === 'partially_approved' ? partialSetCount : undefined,
        approvedSetNames: decisionType === 'partially_approved' ? partialSetNames : undefined
      }, authSession.token);
      showToast(`Request ${decisionRequest.request_number} ${decisionType.replace('_', ' ')} successfully.`);
      setDecisionModalOpen(false);
      load();
    } catch (err: any) {
      showToast(err.message || 'Failed to process decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePartialSet = (letter: string) => {
    setPartialSetNames(prev =>
      prev.includes(letter) ? prev.filter(s => s !== letter) : [...prev, letter]
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const s = STATUS_LABELS[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
    return (
      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] pb-6">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">Principal Portal</span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
          Additional Paper Requests
        </h1>
        <p className="mt-1 text-xs text-[#64748B]">
          Review and decide on additional paper set requests submitted by the Exam Cell.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by subject, request ID, or requester…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] py-2 pl-9 pr-3 text-xs focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#64748B]" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="partially_approved">Partially Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterExamType}
            onChange={e => setFilterExamType(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
          >
            <option value="all">All Exam Types</option>
            <option value="Internal Assessment I">IAT I</option>
            <option value="Internal Assessment II">IAT II</option>
            <option value="End Semester Examination">End Semester</option>
          </select>
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] hover:bg-[#EDF2F7] transition-colors" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5 text-[#64748B]" />
          </button>
        </div>
      </div>

      {/* Request List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-[#F1F5F9] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-12 text-center">
          <ClipboardList className="h-10 w-10 text-[#94A3B8] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#64748B]">No requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
                {/* Request Summary Row */}
                <div className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                      <ClipboardList className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-[#111827]">{r.request_number}</span>
                        <StatusBadge status={r.status} />
                        <span className="rounded-md bg-[#EAF3FF] px-2 py-0.5 text-[10px] font-bold text-[#1976D2]">
                          {r.exam_type.replace('Internal Assessment', 'IAT').replace('End Semester Examination', 'ESE')}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#111827] mt-0.5 truncate">
                        {r.subjects?.subject_name || 'Unknown Subject'} ({r.subjects?.subject_code || ''})
                      </p>
                      <p className="text-[10px] text-[#64748B]">
                        Requested by {r.requested_by_name} • {new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openDecisionModal(r, 'approved')}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => openDecisionModal(r, 'partially_approved')}
                          className="flex items-center gap-1 rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Partial
                        </button>
                        <button
                          onClick={() => openDecisionModal(r, 'rejected')}
                          className="flex items-center gap-1 rounded-xl border border-red-200 bg-[#FFF0F3] px-3 py-1.5 text-[11px] font-bold text-[#D71945] hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="p-2 rounded-xl border border-[#E5E7EB] hover:bg-[#F7F8FA] transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-[#64748B]" /> : <ChevronDown className="h-4 w-4 text-[#64748B]" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#E5E7EB] bg-[#F7F8FA] p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">Department</span>
                        <p className="font-semibold text-[#111827] mt-0.5">{r.departments?.department_name || r.department_id}</p>
                      </div>
                      <div>
                        <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">Academic Year</span>
                        <p className="font-semibold text-[#111827] mt-0.5">{r.academic_years?.year_label || r.academic_year_id}</p>
                      </div>
                      <div>
                        <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">Existing Sets</span>
                        <p className="font-semibold text-[#111827] mt-0.5">
                          {r.existing_set_count} ({r.existing_set_names?.join(', ') || 'None'})
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">Requested Sets</span>
                        <p className="font-semibold text-[#111827] mt-0.5">
                          {r.requested_set_count} set(s): {r.requested_set_names?.join(', ')}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">Reason</span>
                        <p className="font-semibold text-[#111827] mt-0.5">{r.reason}</p>
                      </div>
                    </div>

                    {r.supporting_document_path && (
                      <div>
                        <a
                          href={r.supporting_document_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#1976D2] hover:bg-[#EAF3FF] transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Supporting Document
                        </a>
                      </div>
                    )}

                    {r.principal_decision_at && (
                      <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-xs space-y-1">
                        <div className="font-bold text-[#111827]">Principal Decision</div>
                        <div className="text-[#64748B]">
                          Decision by: <strong>{r.principal_decision_by_name}</strong> on {new Date(r.principal_decision_at).toLocaleString('en-IN')}
                        </div>
                        {r.approved_set_names && (
                          <div className="text-[#64748B]">
                            Approved sets: <strong>{r.approved_set_names.join(', ')}</strong>
                          </div>
                        )}
                        {r.principal_remarks && (
                          <div className="text-[#64748B]">Remarks: <em>{r.principal_remarks}</em></div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {decisionModalOpen && decisionRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              {decisionType === 'approved' && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
              {decisionType === 'partially_approved' && <AlertCircle className="h-6 w-6 text-blue-600" />}
              {decisionType === 'rejected' && <XCircle className="h-6 w-6 text-[#D71945]" />}
              <div>
                <h3 className="text-base font-extrabold text-[#111827]">
                  {decisionType === 'approved' ? 'Approve Request' :
                   decisionType === 'partially_approved' ? 'Partially Approve Request' :
                   'Reject Request'}
                </h3>
                <p className="text-xs text-[#64748B]">{decisionRequest.request_number}</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-[#F7F8FA] p-3 text-xs">
              <p className="font-bold text-[#111827]">{decisionRequest.subjects?.subject_name}</p>
              <p className="text-[#64748B]">Requested sets: <strong>{decisionRequest.requested_set_names?.join(', ')}</strong></p>
              <p className="text-[#64748B]">Exam type: <strong>{decisionRequest.exam_type}</strong></p>
            </div>

            {decisionType === 'partially_approved' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-[#111827] mb-2">
                  Select sets to approve:
                </label>
                <div className="flex flex-wrap gap-2">
                  {(decisionRequest.requested_set_names || []).map(letter => (
                    <button
                      key={letter}
                      onClick={() => togglePartialSet(letter)}
                      className={`w-10 h-10 rounded-xl text-sm font-extrabold border-2 transition-all ${
                        partialSetNames.includes(letter)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-[#111827] border-[#E5E7EB] hover:border-blue-300'
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
                {partialSetNames.length === 0 && (
                  <p className="text-xs text-[#D71945] mt-1">Select at least one set to partially approve.</p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-[#111827] mb-1">
                Remarks {(decisionType === 'rejected' || decisionType === 'partially_approved') ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                rows={3}
                required={decisionType === 'rejected' || decisionType === 'partially_approved'}
                value={decisionRemarks}
                onChange={e => setDecisionRemarks(e.target.value)}
                placeholder={
                  decisionType === 'rejected'
                    ? 'Provide the reason for rejection…'
                    : decisionType === 'partially_approved'
                    ? 'Explain why only certain sets are approved…'
                    : 'Optional remarks for the Exam Cell…'
                }
                className="w-full rounded-xl border border-[#E5E7EB] p-3 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionModalOpen(false)}
                disabled={submitting}
                className="rounded-xl border border-[#E5E7EB] px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-[#F7F8FA]"
              >
                Cancel
              </button>
              <button
                onClick={handleDecision}
                disabled={submitting || (decisionType === 'partially_approved' && partialSetNames.length === 0)}
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition-colors disabled:opacity-50 ${
                  decisionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  decisionType === 'partially_approved' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-[#D71945] hover:bg-[#c0153c]'
                }`}
              >
                {submitting ? 'Processing…' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
