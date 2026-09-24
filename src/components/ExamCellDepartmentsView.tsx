import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ExamCellDepartmentsView: React.FC = () => {
  const { departmentsList, masterDataLoading, refreshMasterData } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMasterData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredDepts = useMemo(() => {
    if (!searchQuery.trim()) return departmentsList;
    const q = searchQuery.toLowerCase().trim();
    return departmentsList.filter(d =>
      d.department_code.toLowerCase().includes(q) ||
      d.department_name.toLowerCase().includes(q) ||
      (d.hod_name && d.hod_name.toLowerCase().includes(q))
    );
  }, [departmentsList, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
              Master Data
            </span>
            <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-[#D71945] border border-rose-200">
              Read-Only
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Academic Departments
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Authoritative engineering departments and faculties synchronized with institutional database.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={masterDataLoading || isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#F7F8FA] hover:border-slate-400 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-[#64748B] ${(masterDataLoading || isRefreshing) ? 'animate-spin' : ''}`} />
          <span>Refresh Database</span>
        </button>
      </div>

      {/* Info Notice */}
      <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900">
        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold">Managed by Super Administration:</span> Department codes and titles are maintained globally. Exam Cell uses these departments to organize course syllabi, question banks, and generated question papers.
        </div>
      </div>

      {/* Filter / Search */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, department name, or HOD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D71945]/20 focus:border-[#D71945] transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white overflow-hidden shadow-xs">
        {masterDataLoading ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            <RefreshCw className="h-6 w-6 animate-spin text-[#D71945] mx-auto mb-2" />
            Loading departments...
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#111827]">No departments found</h3>
            <p className="mt-1 text-xs text-[#64748B]">
              No records match your search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3.5 px-4 sm:px-6">Dept Code</th>
                  <th className="py-3.5 px-4">Department Name</th>
                  <th className="py-3.5 px-4">Head of Department (HOD)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredDepts.map(dept => (
                  <tr key={dept.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-mono font-black text-sm text-[#1976D2]">
                      <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {dept.department_code}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-extrabold text-[#111827]">
                      {dept.department_name}
                      {dept.short_name && <span className="ml-2 text-xs font-normal text-[#64748B]">({dept.short_name})</span>}
                    </td>
                    <td className="py-4 px-4 text-[#64748B]">
                      {dept.hod_name || '—'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        (dept.status === 'active' || dept.is_active !== false)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${(dept.status === 'active' || dept.is_active !== false) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {dept.status || (dept.is_active !== false ? 'active' : 'inactive')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
