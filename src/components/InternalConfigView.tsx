import React, { useState } from 'react';
import {
  SlidersHorizontal,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  BookOpen,
  PieChart,
  ArrowRight,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UnitSyllabusConfig } from '../types';

export const InternalConfigView: React.FC = () => {
  const {
    ia1Syllabus,
    setIa1Syllabus,
    ia2Syllabus,
    setIa2Syllabus,
    setActiveTab,
    showToast
  } = useApp();

  const [selectedExam, setSelectedExam] = useState<'IA1' | 'IA2'>('IA1');

  const currentList = selectedExam === 'IA1' ? ia1Syllabus : ia2Syllabus;
  const setList = selectedExam === 'IA1' ? setIa1Syllabus : setIa2Syllabus;

  const handlePortionChange = (
    unitNumber: number,
    portion: UnitSyllabusConfig['portionLabel']
  ) => {
    let coverage = 0;
    if (portion === '100%') coverage = 100;
    else if (portion === 'First Half' || portion === 'Remaining Half') coverage = 50;
    else coverage = 0;

    setList(prev =>
      prev.map(u =>
        u.unitNumber === unitNumber
          ? { ...u, coverage, portionLabel: portion }
          : u
      )
    );
    showToast(`Unit ${unitNumber} syllabus coverage updated to ${portion}.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
            Syllabus Mapping
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Internal Assessment Configuration
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Configure unit-wise syllabus coverage and partial unit portion distribution for Autonomous Internal Assessments.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('generate-paper')}
          className="flex items-center gap-2 rounded-xl bg-[#D71945] px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="h-4 w-4" />
          <span>Generate Using This Pattern</span>
        </button>
      </div>

      {/* Exam Selection Pills */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedExam('IA1')}
          className={`flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-xs font-bold transition-all cursor-pointer ${
            selectedExam === 'IA1'
              ? 'border-[#D71945] bg-[#FFF0F3] text-[#D71945] shadow-xs'
              : 'border-[#E5E7EB] bg-white text-[#64748B] hover:text-[#111827]'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Internal Assessment I (Units 1 to 2.5)</span>
        </button>

        <button
          onClick={() => setSelectedExam('IA2')}
          className={`flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-xs font-bold transition-all cursor-pointer ${
            selectedExam === 'IA2'
              ? 'border-[#1976D2] bg-[#EAF3FF] text-[#1976D2] shadow-xs'
              : 'border-[#E5E7EB] bg-white text-[#64748B] hover:text-[#111827]'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Internal Assessment II (Units 2.5 to 5)</span>
        </button>
      </div>

      {/* Timeline & Unit Progress Breakdown */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E5E7EB] pb-4 mb-6">
          <div>
            <h3 className="text-xl font-extrabold text-[#111827]">
              {selectedExam === 'IA1' ? 'Internal Assessment I Coverage Matrix' : 'Internal Assessment II Coverage Matrix'}
            </h3>
            <p className="text-xs text-[#64748B]">
              Total Autonomous Weightage: <strong>60 Marks</strong> • First 2½ Units vs. Remaining 2½ Units
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#027A48]">
            <CheckCircle2 className="h-3.5 w-3.5" /> 2.5 Units Effective Total
          </span>
        </div>

        {/* Visual Progress Bar of Units */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] p-5 mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
            Syllabus Coverage Visual Timeline
          </div>
          <div className="grid grid-cols-5 gap-2">
            {currentList.map((unit) => {
              const isIncluded = unit.coverage > 0;
              const isPartial = unit.coverage === 50;

              return (
                <div key={unit.unitNumber} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#111827]">
                    <span>Unit {unit.unitNumber}</span>
                    <span className={isIncluded ? 'text-[#D71945]' : 'text-[#94A3B8]'}>
                      {unit.portionLabel}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isPartial ? 'bg-amber-500' : isIncluded ? 'bg-[#D71945]' : 'bg-transparent'
                      }`}
                      style={{ width: `${unit.coverage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unit Configuration Cards */}
        <div className="space-y-4">
          {currentList.map((unit) => {
            const isZero = unit.coverage === 0;

            return (
              <div
                key={unit.unitNumber}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border p-5 transition-all ${
                  isZero
                    ? 'border-[#E5E7EB] bg-[#F7F8FA]/50 opacity-75'
                    : 'border-[#E5E7EB] bg-white shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                    unit.coverage === 100
                      ? 'bg-[#D71945] text-white'
                      : unit.coverage === 50
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    U{unit.unitNumber}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#111827]">
                      {unit.unitTitle}
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Status:{' '}
                      <strong className={unit.coverage > 0 ? 'text-[#111827]' : 'text-[#94A3B8]'}>
                        {unit.portionLabel} ({unit.coverage}%)
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Interactive Radio / Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {(['100%', 'First Half', 'Remaining Half', 'Not Included'] as const).map((label) => {
                    const isSelected = unit.portionLabel === label;
                    return (
                      <button
                        key={label}
                        onClick={() => handlePortionChange(unit.unitNumber, label)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? label === 'Not Included'
                              ? 'bg-[#111827] text-white'
                              : 'bg-[#D71945] text-white shadow-xs'
                            : 'bg-slate-100 text-[#64748B] hover:bg-slate-200 hover:text-[#111827]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
