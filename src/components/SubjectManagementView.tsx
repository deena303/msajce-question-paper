import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  Database,
  X,
  Layers,
  GraduationCap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Subject, Department } from '../types';

export const SubjectManagementView: React.FC = () => {
  const {
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    setSelectedSubjectCode,
    setActiveTab,
    questions
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subject | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Department>('CSE');
  const [semester, setSemester] = useState('IV');
  const [regulation, setRegulation] = useState('Regulation 2024');

  const filteredSubjects = subjects.filter((sub) => {
    if (search) {
      const q = search.toLowerCase();
      if (!sub.code.toLowerCase().includes(q) && !sub.name.toLowerCase().includes(q)) return false;
    }
    if (selectedDept !== 'all' && sub.department !== selectedDept) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingSub(null);
    setCode('');
    setName('');
    setDepartment('CSE');
    setSemester('IV');
    setRegulation('Regulation 2024');
    setModalOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSub(sub);
    setCode(sub.code);
    setName(sub.name);
    setDepartment(sub.department);
    setSemester(sub.semester);
    setRegulation(sub.regulation);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    if (editingSub) {
      updateSubject(editingSub.id, {
        code,
        name,
        department,
        semester,
        regulation
      });
    } else {
      addSubject({
        code,
        name,
        department,
        semester,
        regulation,
        status: 'Active',
        units: [
          { unitNumber: 1, unitTitle: 'Unit I: Fundamental Principles' },
          { unitNumber: 2, unitTitle: 'Unit II: System Architecture' },
          { unitNumber: 3, unitTitle: 'Unit III: Advanced Algorithms' },
          { unitNumber: 4, unitTitle: 'Unit IV: Integration & Protocols' },
          { unitNumber: 5, unitTitle: 'Unit V: Applications & Research Case Studies' },
        ]
      });
    }
    setModalOpen(false);
  };

  const handleManageQuestions = (subCode: string) => {
    setSelectedSubjectCode(subCode);
    setActiveTab('question-bank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
            Academic Catalog
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Subjects
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Manage subjects and their academic configuration under Regulation 2024.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 rounded-xl bg-[#D71945] px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects by code or title..."
            className="w-full rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] pl-10 pr-4 py-2 text-xs text-[#111827] placeholder:text-[#94A3B8] focus:border-[#D71945] focus:bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] font-medium focus:border-[#D71945] focus:outline-hidden"
        >
          <option value="all">All Departments</option>
          <option value="CSE">Computer Science & Engg (CSE)</option>
          <option value="AIDS">Artificial Intelligence & Data Science (AIDS)</option>
          <option value="IT">Information Technology (IT)</option>
          <option value="ECE">Electronics & Communication (ECE)</option>
          <option value="MECH">Mechanical Engineering (MECH)</option>
          <option value="CIVIL">Civil Engineering (CIVIL)</option>
        </select>
      </div>

      {/* Subjects Table */}
      <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Subject Code</th>
                <th className="py-3.5 px-4 min-w-[240px]">Subject Name</th>
                <th className="py-3.5 px-3">Department</th>
                <th className="py-3.5 px-3">Semester</th>
                <th className="py-3.5 px-3">Regulation</th>
                <th className="py-3.5 px-3">Question Bank</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredSubjects.map((sub) => {
                const qCount = questions.filter(q => q.subjectCode === sub.code).length;
                return (
                  <tr key={sub.id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#111827]">
                      {sub.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[#111827]">{sub.name}</div>
                      <div className="text-[11px] text-[#64748B]">5 Units Defined • Autonomous Syllabus</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex rounded-md bg-[#EAF3FF] px-2 py-0.5 text-[11px] font-bold text-[#1976D2]">
                        {sub.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-[#111827]">
                      Sem {sub.semester}
                    </td>
                    <td className="py-3.5 px-3 text-[#64748B]">
                      {sub.regulation}
                    </td>
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => handleManageQuestions(sub.code)}
                        className="inline-flex items-center gap-1.5 font-bold text-[#1976D2] hover:underline"
                      >
                        <Database className="h-3 w-3" />
                        <span>{qCount} Questions</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-2 py-0.5 text-[10px] font-bold text-[#027A48]">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleManageQuestions(sub.code)}
                          className="rounded-lg bg-[#EAF3FF] px-2.5 py-1 text-xs font-bold text-[#1976D2] hover:bg-[#1976D2] hover:text-white transition-colors"
                        >
                          Manage Questions
                        </button>
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#111827]"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete subject ${sub.code} - ${sub.name}?`)) {
                              deleteSubject(sub.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#FFF0F3] hover:text-[#D71945]"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <h3 className="text-xl font-extrabold text-[#111827]">
                {editingSub ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-[#94A3B8] hover:bg-[#F7F8FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 24CS301"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-mono font-bold text-[#111827] focus:border-[#D71945] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Computer Organization and Architecture"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#D71945] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#D71945] focus:outline-hidden"
                  >
                    <option value="CSE">CSE</option>
                    <option value="AIDS">AIDS</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#D71945] focus:outline-hidden"
                  >
                    <option value="I">Semester I</option>
                    <option value="II">Semester II</option>
                    <option value="III">Semester III</option>
                    <option value="IV">Semester IV</option>
                    <option value="V">Semester V</option>
                    <option value="VI">Semester VI</option>
                    <option value="VII">Semester VII</option>
                    <option value="VIII">Semester VIII</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Regulation
                </label>
                <input
                  type="text"
                  required
                  value={regulation}
                  onChange={(e) => setRegulation(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#D71945] focus:outline-hidden"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E5E7EB] px-4 py-2 text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#D71945] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c]"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
