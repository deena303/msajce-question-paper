import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Pencil, Check, X, Power, PowerOff, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  SubjectRecord, AcademicYearRecord, DepartmentRecord,
  createSubject, updateSubject, fetchSubjects, fetchAcademicYears, fetchDepartments
} from '../../services/authApi';

export const SubjectsView: React.FC = () => {
  const { authToken, showToast } = useApp();
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [years, setYears] = useState<AcademicYearRecord[]>([]);
  const [depts, setDepts] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterYearId, setFilterYearId] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');

  // Add form
  const [addingNew, setAddingNew] = useState(false);
  const [newSubject, setNewSubject] = useState({ subject_code: '', subject_name: '', department_id: '', academic_year_id: '', semester: '', regulation: 'Regulation 2024' });

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState({ subject_code: '', subject_name: '', semester: '', regulation: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchAcademicYears(false), fetchDepartments(false)]).then(([y, d]) => {
      setYears(y);
      setDepts(d);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await fetchSubjects({
      academicYearId: filterYearId || undefined,
      departmentId: filterDeptId || undefined
    });
    setSubjects(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterYearId, filterDeptId]);

  const handleAdd = async () => {
    const { subject_code, subject_name, department_id, academic_year_id } = newSubject;
    if (!subject_code.trim() || !subject_name.trim() || !department_id || !academic_year_id) {
      showToast('Code, name, department and academic year are all required.');
      return;
    }
    if (!authToken) { showToast('Not authenticated.'); return; }
    setSaving(true);
    try {
      const created = await createSubject({
        subject_code: subject_code.trim().toUpperCase(),
        subject_name: subject_name.trim(),
        department_id,
        academic_year_id,
        semester: newSubject.semester.trim() || undefined,
        regulation: newSubject.regulation.trim() || undefined
      }, authToken);
      setSubjects(prev => [created, ...prev]);
      setNewSubject({ subject_code: '', subject_name: '', department_id: '', academic_year_id: '', semester: '', regulation: 'Regulation 2024' });
      setAddingNew(false);
      showToast(`Subject "${created.subject_code}" added.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create subject.');
    } finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    if (!editSubject.subject_code.trim() || !editSubject.subject_name.trim()) {
      showToast('Code and name are required.'); return;
    }
    if (!authToken) return;
    setSaving(true);
    try {
      const updated = await updateSubject(id, {
        subject_code: editSubject.subject_code.trim().toUpperCase(),
        subject_name: editSubject.subject_name.trim(),
        semester: editSubject.semester.trim() || undefined,
        regulation: editSubject.regulation.trim() || undefined
      }, authToken);
      setSubjects(prev => prev.map(s => s.id === id ? updated : s));
      setEditingId(null);
      showToast('Subject updated.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update subject.');
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (subject: SubjectRecord) => {
    if (!authToken) return;
    const newStatus = subject.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await updateSubject(subject.id, { status: newStatus }, authToken);
      setSubjects(prev => prev.map(s => s.id === subject.id ? updated : s));
      showToast(`Subject "${subject.subject_code}" set to ${newStatus}.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-[#E5E7EB] pb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-700">Super Admin</span>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#111827]">Subjects</h1>
          <p className="mt-1 text-sm text-[#64748B]">Manage subjects by department and academic year</p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setNewSubject({ subject_code: '', subject_name: '', department_id: '', academic_year_id: '', semester: '', regulation: 'Regulation 2024' }); }}
          className="flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Subject
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterYearId} onChange={e => setFilterYearId(e.target.value)} className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-purple-400 outline-none">
          <option value="">All Academic Years</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
        </select>
        <select value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)} className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-purple-400 outline-none">
          <option value="">All Departments</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.department_code} – {d.department_name}</option>)}
        </select>
      </div>

      {/* Add New Form */}
      {addingNew && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
          <p className="text-xs font-extrabold text-purple-700 uppercase tracking-wider">New Subject</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={newSubject.subject_code} onChange={e => setNewSubject(p => ({ ...p, subject_code: e.target.value.toUpperCase() }))} placeholder="Subject Code (e.g. 24CS301)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#111827] focus:border-purple-400 outline-none" />
            <input value={newSubject.subject_name} onChange={e => setNewSubject(p => ({ ...p, subject_name: e.target.value }))} placeholder="Subject Name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#111827] focus:border-purple-400 outline-none" />
            <select value={newSubject.academic_year_id} onChange={e => setNewSubject(p => ({ ...p, academic_year_id: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#111827] focus:border-purple-400 outline-none">
              <option value="">Select Academic Year</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
            </select>
            <select value={newSubject.department_id} onChange={e => setNewSubject(p => ({ ...p, department_id: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#111827] focus:border-purple-400 outline-none">
              <option value="">Select Department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.department_code} – {d.department_name}</option>)}
            </select>
            <input value={newSubject.semester} onChange={e => setNewSubject(p => ({ ...p, semester: e.target.value }))} placeholder="Semester (e.g. IV)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#111827] focus:border-purple-400 outline-none" />
            <input value={newSubject.regulation} onChange={e => setNewSubject(p => ({ ...p, regulation: e.target.value }))} placeholder="Regulation (e.g. Regulation 2024)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#111827] focus:border-purple-400 outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1 rounded-lg bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-60 transition-colors">
              <Check className="h-3.5 w-3.5" /> Save Subject
            </button>
            <button onClick={() => setAddingNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white overflow-x-auto shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-[#D1D5DB] mb-3" />
            <p className="text-sm font-semibold text-[#64748B]">No subjects found for these filters.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Code</th>
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Subject Name</th>
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Department</th>
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Year</th>
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Status</th>
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {subjects.map(sub => (
                <tr key={sub.id} className="hover:bg-[#F7F8FA] transition-colors">
                  <td className="px-5 py-3">
                    {editingId === sub.id ? (
                      <input value={editSubject.subject_code} onChange={e => setEditSubject(p => ({ ...p, subject_code: e.target.value.toUpperCase() }))} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-[#111827] outline-none w-24" />
                    ) : (
                      <span className="inline-block rounded-lg bg-[#F7F8FA] px-2.5 py-1 text-xs font-extrabold text-[#111827] font-mono">{sub.subject_code}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === sub.id ? (
                      <input autoFocus value={editSubject.subject_name} onChange={e => setEditSubject(p => ({ ...p, subject_name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleEdit(sub.id); if (e.key === 'Escape') setEditingId(null); }} className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-[#111827] outline-none w-48" />
                    ) : (
                      <span className="text-sm font-medium text-[#111827]">{sub.subject_name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-[#64748B]">{sub.departments?.department_code || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-[#64748B]">{sub.academic_years?.year_label || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {sub.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === sub.id ? (
                        <>
                          <button onClick={() => handleEdit(sub.id)} disabled={saving} className="flex items-center gap-1 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-60">
                            <Check className="h-3 w-3" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(sub.id); setEditSubject({ subject_code: sub.subject_code, subject_name: sub.subject_name, semester: sub.semester || '', regulation: sub.regulation || '' }); }} className="rounded-lg border border-slate-200 p-1.5 text-[#64748B] hover:bg-[#F7F8FA] transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleToggleStatus(sub)} className={`rounded-lg border p-1.5 transition-colors ${sub.status === 'active' ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                            {sub.status === 'active' ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
