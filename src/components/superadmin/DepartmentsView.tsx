import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X, Power, PowerOff, Building2, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DepartmentRecord, createDepartment, updateDepartment, deleteDepartment, fetchDepartments } from '../../services/authApi';

export const DepartmentsView: React.FC = () => {
  const { authToken, showToast, refreshMasterData } = useApp();
  const [depts, setDepts] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newHodName, setNewHodName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editHodName, setEditHodName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await fetchDepartments(false);
    setDepts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newCode.trim() || !newName.trim()) { showToast('Code and name are required.'); return; }
    if (!authToken) { showToast('Not authenticated.'); return; }
    setSaving(true);
    try {
      const created = await createDepartment(newCode.trim(), newName.trim(), authToken, {
        short_name: newShortName.trim() || undefined,
        hod_name: newHodName.trim() || undefined
      });
      setDepts(prev => [created, ...prev]);
      setNewCode(''); setNewName(''); setNewShortName(''); setNewHodName('');
      setAddingNew(false);
      showToast(`Department "${created.department_code}" added.`);
      await refreshMasterData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create department.');
    } finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    if (!editCode.trim() || !editName.trim()) { showToast('Code and name are required.'); return; }
    if (!authToken) return;
    setSaving(true);
    try {
      const updated = await updateDepartment(id, { department_code: editCode.trim(), department_name: editName.trim(), hod_name: editHodName.trim() || undefined }, authToken);
      setDepts(prev => prev.map(d => d.id === id ? updated : d));
      setEditingId(null);
      showToast('Department updated.');
      await refreshMasterData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update.');
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (dept: DepartmentRecord) => {
    if (!authToken) return;
    const newStatus = dept.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await updateDepartment(dept.id, { status: newStatus }, authToken);
      setDepts(prev => prev.map(d => d.id === dept.id ? updated : d));
      showToast(`Department "${dept.department_code}" set to ${newStatus}.`);
      await refreshMasterData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (dept: DepartmentRecord) => {
    if (!authToken) return;
    if (!window.confirm(`Delete/deactivate "${dept.department_code}"? If referenced, it will be deactivated.`)) return;
    setDeletingId(dept.id);
    try {
      const result = await deleteDepartment(dept.id, authToken);
      if (result._action === 'deleted') {
        setDepts(prev => prev.filter(d => d.id !== dept.id));
      } else {
        await load();
      }
      showToast(result.message);
      await refreshMasterData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete department.');
    } finally { setDeletingId(null); }
  };

  const filtered = depts.filter(d =>
    !searchQuery ||
    d.department_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.department_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-[#E5E7EB] pb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-700">Super Admin</span>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#111827]">Departments</h1>
          <p className="mt-1 text-sm text-[#64748B]">Manage departments — changes reflect instantly across the application</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-purple-400 outline-none w-44" />
          <button onClick={() => { setAddingNew(true); setNewCode(''); setNewName(''); setNewShortName(''); setNewHodName(''); }} className="flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Add Department
          </button>
        </div>
      </div>

      {addingNew && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
          <p className="text-xs font-extrabold text-purple-700 uppercase tracking-wider">New Department</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input autoFocus type="text" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="Code (e.g. CSE)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#111827] focus:border-purple-400 outline-none" />
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Department Name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#111827] focus:border-purple-400 outline-none" />
            <input type="text" value={newShortName} onChange={e => setNewShortName(e.target.value)} placeholder="Short Name (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#111827] focus:border-purple-400 outline-none" />
            <input type="text" value={newHodName} onChange={e => setNewHodName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingNew(false); }} placeholder="HOD Name (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#111827] focus:border-purple-400 outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1 rounded-lg bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-60 transition-colors"><Check className="h-3.5 w-3.5" /> Save Department</button>
            <button onClick={() => setAddingNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-[#E5E7EB] bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 mx-auto text-[#D1D5DB] mb-3" />
            <p className="text-sm font-semibold text-[#64748B]">{depts.length === 0 ? 'No departments found. Run the SQL migration.' : 'No departments match your search.'}</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Code</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Department Name</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">HOD</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">Status</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map(dept => (
                <tr key={dept.id} className="hover:bg-[#F7F8FA] transition-colors">
                  <td className="px-6 py-4">
                    {editingId === dept.id ? (
                      <input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase())} className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-bold text-[#111827] focus:border-purple-400 outline-none w-20" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-block rounded-lg bg-[#F7F8FA] px-2.5 py-1 text-xs font-extrabold text-[#111827] font-mono">{dept.department_code}</span>
                        {dept.is_common && <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">COMMON</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === dept.id ? (
                      <div className="flex flex-col gap-1">
                        <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-[#111827] outline-none w-56" placeholder="Department Name" />
                        <input value={editHodName} onChange={e => setEditHodName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleEdit(dept.id); if (e.key === 'Escape') setEditingId(null); }} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-[#64748B] outline-none w-56" placeholder="HOD Name" />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-[#111827]">{dept.department_name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4"><span className="text-xs text-[#64748B]">{dept.hod_name || '—'}</span></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${dept.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {dept.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === dept.id ? (
                        <>
                          <button onClick={() => handleEdit(dept.id)} disabled={saving} className="flex items-center gap-1 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-60"><Check className="h-3 w-3" /> Save</button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(dept.id); setEditCode(dept.department_code); setEditName(dept.department_name); setEditHodName(dept.hod_name || ''); }} className="rounded-lg border border-slate-200 p-1.5 text-[#64748B] hover:bg-[#F7F8FA] transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleToggleStatus(dept)} title={dept.status === 'active' ? 'Deactivate' : 'Activate'} className={`rounded-lg border p-1.5 transition-colors ${dept.status === 'active' ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                            {dept.status === 'active' ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => handleDelete(dept)} disabled={deletingId === dept.id} title="Delete" className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
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
