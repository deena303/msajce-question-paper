import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Eye,
  Check,
  Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Question } from '../types';

export const UsageHistoryView: React.FC = () => {
  const {
    questions,
    subjects,
    selectedSubjectCode,
    setSelectedSubjectCode,
    resetQuestionUsage,
    showToast
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');

  const currentSubject = subjects.find(s => s.code === selectedSubjectCode) || subjects[0];

  const filteredQuestions = questions.filter((q) => {
    if (q.subjectCode !== currentSubject.code) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!q.id.toLowerCase().includes(s) && !q.questionText.toLowerCase().includes(s)) return false;
    }
    if (selectedUnit !== 'all' && q.unit !== Number(selectedUnit)) return false;
    if (usageFilter === 'used' && q.usageHistory.timesUsed === 0) return false;
    if (usageFilter === 'unused' && q.usageHistory.timesUsed > 0) return false;
    return true;
  });

  const usedCount = questions.filter(q => q.subjectCode === currentSubject.code && q.usageHistory.timesUsed > 0).length;
  const unusedCount = questions.filter(q => q.subjectCode === currentSubject.code && q.usageHistory.timesUsed === 0).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
              Question Lifecycle & Audit
            </span>
            <span className="rounded-md bg-[#EAF3FF] px-2 py-0.5 font-mono text-xs font-bold text-[#1976D2]">
              {currentSubject.code}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Question Usage History
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Separates where faculty <em>allows</em> questions to be used versus an automated audit of where they were <em>actually used</em>.
          </p>
        </div>

        <select
          value={currentSubject.code}
          onChange={(e) => setSelectedSubjectCode(e.target.value)}
          aria-label="Select Subject"
          className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-xs font-bold text-[#111827] shadow-xs focus:border-[#D71945] focus:outline-hidden"
        >
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.code}>
              {sub.code} – {sub.name}
            </option>
          ))}
        </select>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-[#64748B] uppercase">Total Bank in Subject</span>
          <div className="mt-2 text-2xl font-black text-[#111827]">{filteredQuestions.length}</div>
          <div className="mt-1 text-xs text-[#64748B]">Subject: {currentSubject.name}</div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-[#ECFDF3] p-5 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase">Fresh / Unused Questions</span>
          <div className="mt-2 text-2xl font-black text-emerald-900">{unusedCount}</div>
          <div className="mt-1 text-xs text-emerald-700">Prioritized for upcoming examinations</div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-[#FFF8E7] p-5 shadow-xs">
          <span className="text-xs font-bold text-amber-800 uppercase">Previously Used Questions</span>
          <div className="mt-2 text-2xl font-black text-amber-900">{usedCount}</div>
          <div className="mt-1 text-xs text-amber-700">Tracked to prevent unintended exam repetition</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by ID or text..."
            className="w-full rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] pl-10 pr-4 py-2 text-xs text-[#111827] placeholder:text-[#94A3B8] focus:border-[#D71945] focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            aria-label="Filter by Unit"
            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] font-medium focus:border-[#D71945] focus:outline-hidden"
          >
            <option value="all">All Units (I–V)</option>
            <option value="1">Unit I</option>
            <option value="2">Unit II</option>
            <option value="3">Unit III</option>
            <option value="4">Unit IV</option>
            <option value="5">Unit V</option>
          </select>

          <select
            value={usageFilter}
            onChange={(e) => setUsageFilter(e.target.value as any)}
            aria-label="Filter by Usage"
            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] font-medium focus:border-[#D71945] focus:outline-hidden"
          >
            <option value="all">All Usage States</option>
            <option value="unused">Fresh / Unused</option>
            <option value="used">Used in Papers</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Q. ID</th>
                <th className="py-3.5 px-4 min-w-[280px]">Question Description</th>
                <th className="py-3.5 px-3">Unit</th>
                <th className="py-3.5 px-3">Allowed Exams (Faculty)</th>
                <th className="py-3.5 px-3">Times Used</th>
                <th className="py-3.5 px-3">Last Exam Paper</th>
                <th className="py-3.5 px-3">Last Date</th>
                <th className="py-3.5 px-4 text-right">Reset Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredQuestions.map((q) => {
                const isUsed = q.usageHistory.timesUsed > 0;
                return (
                  <tr key={q.id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#111827] whitespace-nowrap">
                      {q.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#111827] line-clamp-2 leading-relaxed">
                        {q.questionText}
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        {q.part} • {q.marks} Marks • {q.bloomsLevel}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-[#111827] whitespace-nowrap">
                      Unit {q.unit}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {q.allowedFor.internal1 && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                            IA-1
                          </span>
                        )}
                        {q.allowedFor.internal2 && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                            IA-2
                          </span>
                        )}
                        {q.allowedFor.endSem && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                            EndSem
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {isUsed ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF0F3] px-2 py-0.5 text-[10px] font-bold text-[#D71945]">
                          <History className="h-3 w-3" /> {q.usageHistory.timesUsed} Time(s)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-2 py-0.5 text-[10px] font-bold text-[#027A48]">
                          <Check className="h-3 w-3" /> Unused (0)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-[#111827] whitespace-nowrap">
                      {q.usageHistory.lastUsedPaperCode || '—'}
                    </td>
                    <td className="py-3.5 px-3 text-[#64748B] whitespace-nowrap">
                      {q.usageHistory.lastUsedDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isUsed && (
                        <button
                          onClick={() => {
                            resetQuestionUsage(q.id);
                            showToast(`Reset usage record for question ${q.id}.`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#64748B] hover:bg-[#F7F8FA] hover:text-[#D71945] transition-colors"
                          title="Clear usage history"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
