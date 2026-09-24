import React, { useState } from 'react';
import {
  Settings,
  GraduationCap,
  ShieldCheck,
  RotateCcw,
  Save,
  CheckCircle2,
  Lock,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsView: React.FC = () => {
  const { showToast } = useApp();
  const [collegeName, setCollegeName] = useState('Mohamed Sathak A J College of Engineering');
  const [affiliation, setAffiliation] = useState('An Autonomous Institution - Affiliated to Anna University, Chennai');
  const [accreditation, setAccreditation] = useState("Approved by AICTE | Accredited by NAAC with 'A+' Grade");
  const [regulation, setRegulation] = useState('Regulation 2024');
  const [reuseLockoutYears, setReuseLockoutYears] = useState(2);
  const [bloomsStrict, setBloomsStrict] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Academic ERP system settings updated successfully.');
  };

  const handleResetData = () => {
    if (confirm('Reset entire application data to default sample question banks, subjects, and papers?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-[#E5E7EB] pb-6">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
          System Configuration
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
          Academic ERP Settings
        </h1>
        <p className="mt-1 text-xs text-[#64748B]">
          Institutional metadata, question generation constraints, and autonomous exam regulations.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* Institutional Branding Settings */}
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#D71945]">
            <GraduationCap className="h-4 w-4" />
            <span>Institutional Question Paper Header</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1">
              College Name (Printed on Examination Sheets)
            </label>
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#D71945] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1">
              Affiliation Subtitle
            </label>
            <input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#D71945] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1">
              Accreditation & Approvals
            </label>
            <input
              type="text"
              value={accreditation}
              onChange={(e) => setAccreditation(e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#D71945] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Question Selection Rules */}
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#1976D2]">
            <ShieldCheck className="h-4 w-4" />
            <span>Question Selection Algorithm Rules</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB]">
            <div>
              <div className="text-xs font-bold text-[#111827]">Strict Bloom's Level Distribution</div>
              <div className="text-[11px] text-[#64748B]">Enforce exact minimum percentage of higher-order thinking (K3-K6) questions.</div>
            </div>
            <input
              type="checkbox"
              checked={bloomsStrict}
              onChange={(e) => setBloomsStrict(e.target.checked)}
              className="h-4 w-4 rounded accent-[#D71945]"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-xs font-bold text-[#111827]">Question Reuse Lockout Buffer</div>
              <div className="text-[11px] text-[#64748B]">Number of exam cycles before a previously used question can be selected again.</div>
            </div>
            <select
              value={reuseLockoutYears}
              onChange={(e) => setReuseLockoutYears(Number(e.target.value))}
              className="rounded-xl border border-[#E5E7EB] px-3 py-1.5 text-xs font-bold text-[#111827]"
            >
              <option value={1}>1 Exam Cycle</option>
              <option value={2}>2 Exam Cycles (1 Academic Year)</option>
              <option value={4}>4 Exam Cycles (2 Academic Years)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={handleResetData}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-[#FFF0F3] px-4 py-2.5 text-xs font-bold text-[#D71945] hover:bg-red-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-[#D71945] px-6 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c] transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
