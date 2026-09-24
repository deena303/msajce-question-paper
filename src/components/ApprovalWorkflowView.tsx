import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Send,
  MessageSquare,
  AlertCircle,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GeneratedPaper, PaperStatus } from '../types';

export const ApprovalWorkflowView: React.FC = () => {
  const {
    generatedPapers,
    updatePaperStatus,
    currentUser,
    setActivePaper,
    setActiveTab,
    showToast
  } = useApp();

  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'pending' | 'endorsed' | 'finalized'>('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectPaperId, setRejectPaperId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredPapers = generatedPapers.filter((p) => {
    if (activeTabFilter === 'pending') {
      return p.status === 'Draft' || p.status === 'Faculty Reviewed' || p.status === 'HOD Review';
    }
    if (activeTabFilter === 'endorsed') {
      return p.status === 'Approved';
    }
    if (activeTabFilter === 'finalized') {
      return p.status === 'Finalized';
    }
    return true;
  });

  const handleOpenReject = (paperId: string) => {
    setRejectPaperId(paperId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectPaperId) return;
    updatePaperStatus(rejectPaperId, 'Rejected');
    showToast(`Paper ${rejectPaperId} marked as Rejected with feedback sent to faculty.`);
    setRejectModalOpen(false);
  };

  const handleApprove = (paper: GeneratedPaper) => {
    if (currentUser.role === 'Faculty') {
      updatePaperStatus(paper.id, 'Faculty Reviewed');
      showToast(`Submitted ${paper.paperCode} to Head of Department for review.`);
    } else if (currentUser.role === 'HOD') {
      updatePaperStatus(paper.id, 'Approved');
      showToast(`Endorsed ${paper.paperCode}. Forwarded to Autonomous Exam Cell.`);
    } else if (currentUser.role === 'Exam Cell' || currentUser.role === 'Admin' || currentUser.role === 'Super Admin') {
      updatePaperStatus(paper.id, 'Finalized');
      showToast(`Paper ${paper.paperCode} officially finalized and authorized for printing.`);
    }
  };

  const handleView = (paper: GeneratedPaper) => {
    setActivePaper(paper);
    setActiveTab('generate-paper');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
            Governance & Quality Assurance
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Approval Workflow
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Three-tier autonomous vetting: Faculty Verification → HOD Academic Endorsement → Exam Cell Release.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-[#F7F8FA] p-1.5 border border-[#E5E7EB]">
          {(['pending', 'endorsed', 'finalized', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTabFilter(tab)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                activeTabFilter === tab
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              {tab === 'pending' ? 'Pending Action' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Progress Banner */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-4">
          Autonomous Institutional Workflow Progression
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-[#F7F8FA] p-4">
            <div className="text-[10px] font-bold text-[#D71945] uppercase">Stage 1</div>
            <div className="font-extrabold text-sm text-[#111827] mt-1">Faculty Assembly</div>
            <div className="text-[11px] text-[#64748B] mt-1">Selects syllabus parameters and generates question draft.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[#F7F8FA] p-4">
            <div className="text-[10px] font-bold text-[#1976D2] uppercase">Stage 2</div>
            <div className="font-extrabold text-sm text-[#111827] mt-1">Faculty Verification</div>
            <div className="text-[11px] text-[#64748B] mt-1">Course coordinator checks marks, BL, and question clarity.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[#F7F8FA] p-4">
            <div className="text-[10px] font-bold text-amber-700 uppercase">Stage 3</div>
            <div className="font-extrabold text-sm text-[#111827] mt-1">HOD Review</div>
            <div className="text-[11px] text-[#64748B] mt-1">Department Head audits standard and endorses paper.</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-[#ECFDF3] p-4">
            <div className="text-[10px] font-bold text-emerald-800 uppercase">Stage 4</div>
            <div className="font-extrabold text-sm text-emerald-950 mt-1">COE Final Release</div>
            <div className="text-[11px] text-emerald-700 mt-1">Exam Cell verifies confidential seal and authorizes print.</div>
          </div>
        </div>
      </div>

      {/* Papers Awaiting Actions */}
      <div className="space-y-4">
        {filteredPapers.length === 0 ? (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-12 text-center text-[#94A3B8] shadow-xs">
            No question papers found matching the "{activeTabFilter}" status filter.
          </div>
        ) : (
          filteredPapers.map((paper) => {
            return (
              <div
                key={paper.id}
                className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5 hover:border-slate-400 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#111827]">{paper.paperCode}</span>
                    <span className="rounded-md bg-[#EAF3FF] px-2 py-0.5 text-[10px] font-bold text-[#1976D2]">
                      {paper.examType}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {paper.maxMarks} Marks
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-[#111827]">
                    {paper.subjectCode} – {paper.subjectName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
                    <span>Created by: <strong className="text-[#111827]">{paper.createdBy}</strong></span>
                    <span>• Exam Date: {paper.examDate}</span>
                    <span>• Current Status: <strong className="text-[#D71945]">{paper.status}</strong></span>
                  </div>
                </div>

                {/* Action Buttons based on Role */}
                <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => handleView(paper)}
                    className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-bold text-[#111827] hover:bg-[#F7F8FA]"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#1976D2]" />
                    <span>Inspect</span>
                  </button>

                  {paper.status !== 'Finalized' && paper.status !== 'Rejected' && (
                    <>
                      <button
                        onClick={() => handleOpenReject(paper.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-[#FFF0F3] px-3.5 py-2 text-xs font-bold text-[#D71945] hover:bg-red-100 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleApprove(paper)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#D71945] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c] cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {paper.status === 'Draft'
                            ? 'Submit Review'
                            : paper.status === 'Faculty Reviewed'
                            ? 'HOD Endorse'
                            : paper.status === 'HOD Review'
                            ? 'COE Approve'
                            : 'Finalize'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-extrabold text-[#111827]">
              Reject Paper for Revision
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              Provide specific academic revision instructions for the course coordinator.
            </p>

            <form onSubmit={handleConfirmReject} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#111827] mb-1">
                  Revision Comments / Deficiency Notice
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Question 7 in Unit 2 is too similar to last year's paper. Please replace with an analytical question."
                  className="w-full rounded-xl border border-[#E5E7EB] p-3 text-xs focus:border-[#D71945] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="rounded-xl border border-[#E5E7EB] px-4 py-2 font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#D71945] px-5 py-2 font-bold text-white shadow-md hover:bg-[#c0153c]"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
