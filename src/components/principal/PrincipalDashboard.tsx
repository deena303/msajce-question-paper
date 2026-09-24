import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck2,
  ArrowRight,
  Bell,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchPaperRequests, fetchPaperAssignments } from '../../services/authApi';

export const PrincipalDashboard: React.FC = () => {
  const { currentUser, setActiveTab, authSession } = useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    partiallyApproved: 0,
    assignedPapers: 0,
    pendingReview: 0,
    reviewed: 0
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const token = authSession?.token || '';
    Promise.all([
      fetchPaperRequests({}, token),
      fetchPaperAssignments({}, token)
    ]).then(([requests, assignments]) => {
      const pending = requests.filter((r: any) => r.status === 'pending').length;
      const approved = requests.filter((r: any) => r.status === 'approved').length;
      const rejected = requests.filter((r: any) => r.status === 'rejected').length;
      const partiallyApproved = requests.filter((r: any) => r.status === 'partially_approved').length;
      const assignedPapers = assignments.length;
      const pendingReview = assignments.filter((a: any) => a.review_status === 'pending').length;
      const reviewed = assignments.filter((a: any) => a.review_status === 'reviewed').length;
      setStats({ pending, approved, rejected, partiallyApproved, assignedPapers, pendingReview, reviewed });
      setRecentRequests(requests.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authSession]);

  const statCards = [
    {
      id: 'pending',
      label: 'Pending Requests',
      value: stats.pending,
      icon: Clock,
      color: '#B45309',
      bg: '#FFF8E7',
      tab: 'principal-requests',
      desc: 'Awaiting your decision'
    },
    {
      id: 'approved',
      label: 'Approved',
      value: stats.approved + stats.partiallyApproved,
      icon: CheckCircle2,
      color: '#027A48',
      bg: '#ECFDF3',
      tab: 'principal-requests',
      desc: `${stats.approved} approved, ${stats.partiallyApproved} partially`
    },
    {
      id: 'rejected',
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: '#D71945',
      bg: '#FFF0F3',
      tab: 'principal-requests',
      desc: 'Requests not approved'
    },
    {
      id: 'assigned',
      label: 'Assigned Papers',
      value: stats.assignedPapers,
      icon: FileCheck2,
      color: '#1976D2',
      bg: '#EAF3FF',
      tab: 'principal-assigned-papers',
      desc: `${stats.pendingReview} pending review`
    }
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100 text-amber-800', text: '', label: 'Pending' },
      approved: { bg: 'bg-emerald-100 text-emerald-800', text: '', label: 'Approved' },
      partially_approved: { bg: 'bg-blue-100 text-blue-800', text: '', label: 'Partial' },
      rejected: { bg: 'bg-red-100 text-red-800', text: '', label: 'Rejected' },
      cancelled: { bg: 'bg-gray-100 text-gray-600', text: '', label: 'Cancelled' }
    };
    const s = map[status] || { bg: 'bg-gray-100 text-gray-600', text: '', label: status };
    return (
      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${s.bg}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] pb-6">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">Principal</span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
          {getGreeting()}, {currentUser.name.split(' ').slice(-1)[0]}
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          MSAJCE Question Paper Management — Principal Approval Portal
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: card.bg }}>
                  <Icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <button onClick={() => setActiveTab(card.tab)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4">
                {loading ? (
                  <div className="h-9 w-16 rounded-xl bg-[#F1F5F9] animate-pulse" />
                ) : (
                  <div className="text-4xl font-black" style={{ color: card.color }}>{card.value}</div>
                )}
                <div className="mt-1 text-sm font-bold text-[#111827]">{card.label}</div>
                <div className="text-xs text-[#64748B] mt-0.5">{card.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-[#111827] uppercase tracking-wider">Recent Paper Requests</h2>
          <button
            onClick={() => setActiveTab('principal-requests')}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-[#F1F5F9] animate-pulse" />
            ))}
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-10 text-center">
            <ClipboardList className="h-10 w-10 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#64748B]">No paper requests yet.</p>
            <p className="text-xs text-[#94A3B8] mt-1">Requests from the Exam Cell will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((r: any) => (
              <div
                key={r.id}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                    <Bell className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#111827]">{r.request_number}</span>
                      {statusBadge(r.status)}
                    </div>
                    <p className="text-xs text-[#64748B] truncate mt-0.5">
                      {r.subjects?.subject_name || r.subject_id} — {r.exam_type}
                    </p>
                    <p className="text-[10px] text-[#94A3B8]">
                      By {r.requested_by_name} • {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                {r.status === 'pending' && (
                  <button
                    onClick={() => setActiveTab('principal-requests')}
                    className="shrink-0 flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800 transition-colors"
                  >
                    <TrendingUp className="h-3 w-3" />
                    Review
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-black text-[#111827] uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              tab: 'principal-requests',
              icon: ClipboardList,
              label: 'Review Paper Requests',
              desc: 'Approve or reject additional paper set requests',
              accent: '#B45309'
            },
            {
              tab: 'principal-assigned-papers',
              icon: FileCheck2,
              label: 'View Assigned Papers',
              desc: 'Review question papers assigned for your inspection',
              accent: '#1976D2'
            }
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                onClick={() => setActiveTab(action.tab)}
                className="flex items-start gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left hover:shadow-md active:scale-[0.98] transition-all cursor-pointer hover:bg-[#F7F8FA]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F8FA]">
                  <Icon className="h-5 w-5" style={{ color: action.accent }} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#111827]">{action.label}</div>
                  <div className="text-xs text-[#64748B] mt-0.5">{action.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
