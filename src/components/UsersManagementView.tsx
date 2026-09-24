import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  ShieldCheck,
  Mail,
  UserCheck,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole, Department } from '../types';

export const UsersManagementView: React.FC = () => {
  const { users, currentUser, switchUserRole, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [userList, setUserList] = useState<User[]>(users);
  const [modalOpen, setModalOpen] = useState(false);

  // New user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Exam Cell');
  const [department, setDepartment] = useState<Department>('CSE');

  const filteredUsers = userList.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role,
      department,
      status: 'Active',
      staffId: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
      lastLogin: 'Just now'
    };
    setUserList([newUser, ...userList]);
    showToast(`Added staff account for ${name} (${role}).`);
    setModalOpen(false);
    setName('');
    setEmail('');
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
            Academic Personnel
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Staff & Role Management
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Configure faculty permissions, Department Heads, and Examination Cell authorized signatories.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[#D71945] px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Academic Staff</span>
        </button>
      </div>

      {/* Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#94A3B8]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by staff name, email or role..."
          className="w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-4 py-2 text-xs text-[#111827] focus:border-[#D71945] focus:outline-hidden"
        />
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const isMe = u.id === currentUser.id;
          return (
            <div
              key={u.id}
              className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    u.role === 'Super Admin'
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    {u.role}
                  </span>
                  {isMe && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">
                      CURRENT
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <h3 className="text-sm font-extrabold text-[#111827]">{u.name}</h3>
                  <div className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 text-[#94A3B8]" />
                    <span>{u.email}</span>
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">
                    Dept: <strong className="text-[#111827]">{u.department}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active Account
                </span>
                {!isMe && (
                  <button
                    onClick={() => switchUserRole(u.role)}
                    className="text-xs font-bold text-[#1976D2] hover:underline"
                  >
                    Assume Role
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-lg font-extrabold text-[#111827]">
                Add Academic Staff
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 text-[#94A3B8] hover:bg-[#F7F8FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#111827] mb-1">Staff Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. A. Rahman, Ph.D."
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[#111827] focus:border-[#D71945] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111827] mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahman.cse@msajce-edu.in"
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[#111827] focus:border-[#D71945] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-semibold"
                  >
                    <option value="Exam Cell">Exam Cell</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#111827] mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-semibold"
                  >
                    <option value="CSE">CSE</option>
                    <option value="AIDS">AIDS</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E5E7EB] px-4 py-2 font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#D71945] px-5 py-2 font-bold text-white shadow-md hover:bg-[#c0153c]"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
