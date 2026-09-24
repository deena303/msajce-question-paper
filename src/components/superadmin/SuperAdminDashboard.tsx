import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Building2,
  BookOpen,
  Database,
  FileCheck2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchSummaryStats } from '../../services/authApi';

export const SuperAdminDashboard: React.FC = () => {
  const { currentUser, setActiveTab } = useApp();
  const [stats, setStats] = useState({ academicYears: 0, departments: 0, subjects: 0, questionBanks: 0, generatedPapers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummaryStats().then(s => { setStats(s); setLoading(false); });
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    { id: 'academic-years', icon: CalendarDays, label: 'Academic Years', value: stats.academicYears, color: '#7C3AED', bg: '#F5F3FF', action: 'academic-years', desc: 'Configured academic years' },
    { id: 'departments', icon: Building2, label: 'Departments', value: stats.departments, color: '#1976D2', bg: '#EAF3FF', action: 'departments', desc: 'Active departments' },
    { id: 'subjects', icon: BookOpen, label: 'Subjects', value: stats.subjects, color: '#D71945', bg: '#FFF0F3', action: 'subjects', desc: 'Subjects configured' },
    { id: 'question-banks', icon: Database, label: 'Question Banks', value: stats.questionBanks, color: '#027A48', bg: '#ECFDF3', action: 'question-banks', desc: 'Uploaded question banks' },
    { id: 'generated-papers', icon: FileCheck2, label: 'Generated Papers', value: stats.generatedPapers, color: '#B45309', bg: '#FFF8E7', action: 'generated-papers', desc: 'Papers generated' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b border-[#E5E7EB] pb-6">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-700">Super Admin</span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
          {getGreeting()}, {currentUser.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          MSAJCE Question Paper Management System — Master Data Administration
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: card.bg }}>
                  <Icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <button onClick={() => setActiveTab(card.action)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors">
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
              <button onClick={() => setActiveTab(card.action)} className="mt-4 text-xs font-semibold transition-colors" style={{ color: card.color }}>
                Manage {card.label} →
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-black text-[#111827] uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'academic-years', icon: CalendarDays, label: 'Manage Academic Years', desc: 'Add or deactivate academic years', accent: '#7C3AED' },
            { id: 'departments', icon: Building2, label: 'Manage Departments', desc: 'Configure departments and their codes', accent: '#1976D2' },
            { id: 'subjects', icon: BookOpen, label: 'Manage Subjects', desc: 'Add subjects to departments and years', accent: '#D71945' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.id} onClick={() => setActiveTab(action.id)}
                className="flex items-start gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left hover:shadow-md active:scale-[0.98] transition-all cursor-pointer hover:bg-[#F7F8FA]">
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
