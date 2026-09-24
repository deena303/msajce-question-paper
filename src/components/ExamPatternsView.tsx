import React, { useState } from 'react';
import {
  Sliders,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Edit2,
  Shield,
  Layers,
  Sparkles,
  Info,
  X,
  AlertTriangle,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExamPattern } from '../types';

export const ExamPatternsView: React.FC = () => {
  const { examPatterns, updateExamPattern, setActiveTab } = useApp();
  const [editingPattern, setEditingPattern] = useState<ExamPattern | null>(null);

  // Common fields
  const [duration, setDuration] = useState('3 Hours');
  const [totalMarks, setTotalMarks] = useState(100);

  // Part A fields
  const [partAQCount, setPartAQCount] = useState(10);
  const [partAQMarks, setPartAQMarks] = useState(2);
  const [partAChoiceNote, setPartAChoiceNote] = useState('Answer ALL Questions');
  const [partAUnitDist, setPartAUnitDist] = useState('2 questions per unit for all 5 units');

  // Part B fields
  const [partBQCount, setPartBQCount] = useState(5);
  const [partBQMarks, setPartBQMarks] = useState(13);
  const [partBOrChoice, setPartBOrChoice] = useState(true);
  const [partBUnitDist, setPartBUnitDist] = useState('One pair of OR questions per unit (Units 1 to 5)');

  // Part C fields
  const [partCEnabled, setPartCEnabled] = useState(true);
  const [partCQCount, setPartCQCount] = useState(1);
  const [partCQMarks, setPartCQMarks] = useState(15);
  const [partCOrChoice, setPartCOrChoice] = useState(true);
  const [partCUnitDist, setPartCUnitDist] = useState('Comprehensive / Case Study / Application question');

  // IA specific fields
  const [iaPartAQCount, setIaPartAQCount] = useState(4);
  const [iaPartAQMarks, setIaPartAQMarks] = useState(2);
  const [iaPartBQMarks, setIaPartBQMarks] = useState(13);

  const isEndSem = editingPattern?.examType === 'End Semester Examination';

  // Live auto-calculated totals for End Semester
  const partATotal = partAQCount * partAQMarks;
  const partBTotal = partBQCount * partBQMarks;
  const partCTotal = partCEnabled ? (partCQCount * partCQMarks) : 0;
  const grandTotal = partATotal + partBTotal + partCTotal;
  const isEndSemValid = grandTotal === totalMarks;

  const handleOpenEdit = (pat: ExamPattern) => {
    setEditingPattern(pat);
    setDuration(pat.duration);
    setTotalMarks(pat.totalMarks);

    if (pat.examType === 'End Semester Examination') {
      setPartAQCount(pat.partA.totalQuestions);
      setPartAQMarks(pat.partA.marksPerQuestion);
      setPartAChoiceNote(pat.partA.choiceNote || 'Answer ALL Questions');
      setPartAUnitDist(pat.partA.unitDistribution || '2 questions per unit for all 5 units');

      setPartBQCount(pat.partB.orQuestionsCount || 5);
      setPartBQMarks(pat.partB.marksPerQuestion || 13);
      setPartBOrChoice(pat.partB.format === 'or_choice');
      setPartBUnitDist(pat.partB.unitDistribution || 'One pair of OR questions per unit (Units 1 to 5)');

      setPartCEnabled(pat.partC ? pat.partC.enabled : true);
      setPartCQCount(pat.partC?.orQuestionsCount || 1);
      setPartCQMarks(pat.partC?.marksPerQuestion || 15);
      setPartCOrChoice(true);
      setPartCUnitDist(pat.partC?.unitDistribution || 'Comprehensive question from any unit');
    } else {
      // IA
      setIaPartAQCount(pat.partA.totalQuestions);
      setIaPartAQMarks(pat.partA.marksPerQuestion);
      setIaPartBQMarks(
        pat.partB.format === 'sections'
          ? pat.partB.sectionA?.marksPerQuestion || 13
          : pat.partB.marksPerQuestion || 13
      );
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPattern) return;

    if (isEndSem) {
      if (!isEndSemValid) {
        return; // blocked by validation
      }

      updateExamPattern(editingPattern.id, {
        duration,
        totalMarks,
        partA: {
          ...editingPattern.partA,
          totalQuestions: partAQCount,
          marksPerQuestion: partAQMarks,
          choiceNote: partAChoiceNote,
          unitDistribution: partAUnitDist
        },
        partB: {
          format: 'or_choice',
          orQuestionsCount: partBQCount,
          marksPerQuestion: partBQMarks,
          unitDistribution: partBUnitDist
        },
        partC: {
          enabled: partCEnabled,
          orQuestionsCount: partCQCount,
          marksPerQuestion: partCQMarks,
          unitDistribution: partCUnitDist
        }
      });
    } else {
      // Internal Assessment pattern save
      updateExamPattern(editingPattern.id, {
        duration,
        partA: {
          ...editingPattern.partA,
          totalQuestions: iaPartAQCount,
          marksPerQuestion: iaPartAQMarks
        },
        partB: {
          ...editingPattern.partB,
          format: 'sections',
          sectionA: {
            totalQuestions: 3,
            answerCount: 2,
            marksPerQuestion: iaPartBQMarks
          },
          sectionB: {
            totalQuestions: 3,
            answerCount: 2,
            marksPerQuestion: iaPartBQMarks
          }
        }
      });
    }

    setEditingPattern(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
            Curriculum Regulations
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Exam Patterns
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Configure autonomous marks distribution and question structure for Internal Assessments and End Semester examinations.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('internal-config')}
          className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#F7F8FA] transition-all self-start sm:self-auto cursor-pointer"
        >
          <Sliders className="h-4 w-4 text-[#D71945]" />
          <span>Syllabus Unit Config</span>
        </button>
      </div>

      {/* Pattern Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Internal Assessment (60 Marks) */}
        {examPatterns.filter(p => p.id === 'pat-ia' || p.id === 'pat-ia2').slice(0, 1).map((pattern) => (
          <div
            key={pattern.id}
            className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#FFF0F3] px-3 py-1 text-[11px] font-extrabold text-[#D71945] uppercase">
                  Continuous Assessment
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-[#64748B]">
                  <Clock className="h-3.5 w-3.5 text-[#1976D2]" /> {pattern.duration}
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between border-b border-[#E5E7EB] pb-4">
                <div>
                  <h3 className="text-2xl font-black text-[#111827]">
                    Internal Assessment
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    IA-1 (First 2½ Units) & IA-2 (Remaining 2½ Units)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-[#D71945]">{pattern.totalMarks}</span>
                  <span className="text-xs font-bold text-[#64748B]"> Marks</span>
                </div>
              </div>

              {/* Internal Breakdown */}
              <div className="mt-6 space-y-4">
                {/* Part A */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-[#1976D2] uppercase tracking-wider">
                        Part A (Short Answer)
                      </span>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {pattern.partA.totalQuestions} Questions × {pattern.partA.marksPerQuestion} Marks
                      </p>
                    </div>
                    <span className="text-lg font-black text-[#111827]">
                      {pattern.partA.totalQuestions * pattern.partA.marksPerQuestion} Marks
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-[#64748B] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>{pattern.partA.choiceNote}</span>
                  </div>
                </div>

                {/* Part B */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-[#D71945] uppercase tracking-wider">
                        Part B (Long Form / Sections)
                      </span>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Two Sections with Choice (4 questions to answer)
                      </p>
                    </div>
                    <span className="text-lg font-black text-[#111827]">
                      52 Marks
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-2.5">
                      <div className="font-bold text-[#111827]">Section A</div>
                      <div className="text-[11px] text-[#64748B]">Answer 2 of 3 (13M each)</div>
                      <div className="font-bold text-[#D71945] mt-1">26 Marks</div>
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-2.5">
                      <div className="font-bold text-[#111827]">Section B</div>
                      <div className="text-[11px] text-[#64748B]">Answer 2 of 3 (13M each)</div>
                      <div className="font-bold text-[#D71945] mt-1">26 Marks</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs text-[#94A3B8]">
                Total: 8 + 26 + 26 = <strong>60 Marks</strong>
              </span>
              <button
                onClick={() => handleOpenEdit(pattern)}
                className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-[#111827] hover:bg-[#F7F8FA] hover:text-[#1976D2] transition-colors cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Pattern</span>
              </button>
            </div>
          </div>
        ))}

        {/* Card 2: End Semester Examination (100 Marks) */}
        {examPatterns.filter(p => p.id === 'pat-endsem').map((pattern) => (
          <div
            key={pattern.id}
            className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-extrabold text-purple-700 uppercase">
                  Summative Assessment
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-[#64748B]">
                  <Clock className="h-3.5 w-3.5 text-[#1976D2]" /> {pattern.duration}
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between border-b border-[#E5E7EB] pb-4">
                <div>
                  <h3 className="text-2xl font-black text-[#111827]">
                    End Semester Exam
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Comprehensive 5-Unit Examination (Anna University / Autonomous Pattern)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-[#111827]">{pattern.totalMarks}</span>
                  <span className="text-xs font-bold text-[#64748B]"> Marks</span>
                </div>
              </div>

              {/* End Sem Breakdown */}
              <div className="mt-6 space-y-4">
                {/* Part A */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-[#1976D2] uppercase tracking-wider">
                        Part A (Short Answer)
                      </span>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {pattern.partA.totalQuestions} Questions × {pattern.partA.marksPerQuestion} Marks (2 per unit)
                      </p>
                    </div>
                    <span className="text-lg font-black text-[#111827]">
                      {pattern.partA.totalQuestions * pattern.partA.marksPerQuestion} Marks
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-[#64748B] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>{pattern.partA.choiceNote}</span>
                  </div>
                </div>

                {/* Part B */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-[#D71945] uppercase tracking-wider">
                        Part B (Internal Choice OR Pairs)
                      </span>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {pattern.partB.orQuestionsCount || 5} Questions × {pattern.partB.marksPerQuestion || 13} Marks (One pair per unit)
                      </p>
                    </div>
                    <span className="text-lg font-black text-[#111827]">
                      {(pattern.partB.orQuestionsCount || 5) * (pattern.partB.marksPerQuestion || 13)} Marks
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-[#64748B] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>{pattern.partB.unitDistribution || 'One pair of OR questions per unit'}</span>
                  </div>
                </div>

                {/* Part C */}
                {pattern.partC && pattern.partC.enabled && (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-xs text-purple-700 uppercase tracking-wider">
                          Part C (Application / Case Study)
                        </span>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {pattern.partC.orQuestionsCount} Question × {pattern.partC.marksPerQuestion} Marks (Internal choice)
                        </p>
                      </div>
                      <span className="text-lg font-black text-purple-900">
                        {pattern.partC.orQuestionsCount * pattern.partC.marksPerQuestion} Marks
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-[#64748B] flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>{pattern.partC.unitDistribution || 'Comprehensive question'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs text-[#94A3B8]">
                Total: 20 + 65 + 15 = <strong>100 Marks</strong>
              </span>
              <button
                onClick={() => handleOpenEdit(pattern)}
                className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-[#111827] hover:bg-[#F7F8FA] hover:text-[#1976D2] transition-colors cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Pattern</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pattern Edit Modal */}
      {editingPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D71945]">
                  Pattern Configuration
                </span>
                <h3 className="text-lg font-extrabold text-[#111827]">
                  Edit {editingPattern.examType}
                </h3>
              </div>
              <button
                onClick={() => setEditingPattern(null)}
                className="rounded-full p-1 text-[#94A3B8] hover:bg-[#F7F8FA] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-6 text-xs">
              {isEndSem ? (
                /* FULL END SEMESTER PATTERN EDITOR */
                <div className="space-y-6">
                  {/* General Configuration */}
                  <div className="rounded-2xl border border-slate-200 bg-[#F7F8FA] p-4 space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      General Exam Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Total Marks
                        </label>
                        <input
                          type="number"
                          value={totalMarks}
                          onChange={(e) => setTotalMarks(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="e.g. 3 Hours"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Part A Section */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#1976D2] uppercase tracking-wider">
                        Part A (Short Answer Questions)
                      </span>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-[#1976D2]">
                        Total: {partATotal} Marks
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          No. of Questions
                        </label>
                        <input
                          type="number"
                          value={partAQCount}
                          onChange={(e) => setPartAQCount(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Marks per Question
                        </label>
                        <input
                          type="number"
                          value={partAQMarks}
                          onChange={(e) => setPartAQMarks(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Calculated Subtotal
                        </label>
                        <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 font-black text-blue-900 text-sm">
                          {partATotal} Marks
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Answer Instruction
                        </label>
                        <input
                          type="text"
                          value={partAChoiceNote}
                          onChange={(e) => setPartAChoiceNote(e.target.value)}
                          placeholder="e.g. Answer ALL Questions"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Unit Distribution Note
                        </label>
                        <input
                          type="text"
                          value={partAUnitDist}
                          onChange={(e) => setPartAUnitDist(e.target.value)}
                          placeholder="e.g. 2 questions per unit for all 5 units"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Part B Section */}
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#D71945] uppercase tracking-wider">
                        Part B (Long Questions / Internal Choice)
                      </span>
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-[#D71945]">
                        Total: {partBTotal} Marks
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          No. of Main Questions
                        </label>
                        <input
                          type="number"
                          value={partBQCount}
                          onChange={(e) => setPartBQCount(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Marks per Question
                        </label>
                        <input
                          type="number"
                          value={partBQMarks}
                          onChange={(e) => setPartBQMarks(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Calculated Subtotal
                        </label>
                        <div className="rounded-xl border border-rose-200 bg-white px-3 py-2 font-black text-rose-900 text-sm">
                          {partBTotal} Marks
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id="partBOrChoice"
                          checked={partBOrChoice}
                          onChange={(e) => setPartBOrChoice(e.target.checked)}
                          className="rounded border-slate-300 text-[#D71945] focus:ring-[#D71945]"
                        />
                        <label htmlFor="partBOrChoice" className="font-bold text-slate-800">
                          Internal Choice (OR questions per unit)
                        </label>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Unit Distribution Note
                        </label>
                        <input
                          type="text"
                          value={partBUnitDist}
                          onChange={(e) => setPartBUnitDist(e.target.value)}
                          placeholder="e.g. One pair of OR questions per unit"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#D71945] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Part C Section */}
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="partCEnabled"
                          checked={partCEnabled}
                          onChange={(e) => setPartCEnabled(e.target.checked)}
                          className="rounded border-slate-300 text-purple-700 focus:ring-purple-700"
                        />
                        <label htmlFor="partCEnabled" className="font-extrabold text-xs text-purple-900 uppercase tracking-wider">
                          Part C (Application / Case Study)
                        </label>
                      </div>
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-800">
                        Total: {partCTotal} Marks
                      </span>
                    </div>

                    {partCEnabled && (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">
                              No. of Questions
                            </label>
                            <input
                              type="number"
                              value={partCQCount}
                              onChange={(e) => setPartCQCount(Number(e.target.value))}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">
                              Marks per Question
                            </label>
                            <input
                              type="number"
                              value={partCQMarks}
                              onChange={(e) => setPartCQMarks(Number(e.target.value))}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">
                              Calculated Subtotal
                            </label>
                            <div className="rounded-xl border border-purple-200 bg-white px-3 py-2 font-black text-purple-900 text-sm">
                              {partCTotal} Marks
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Unit Distribution Note
                          </label>
                          <input
                            type="text"
                            value={partCUnitDist}
                            onChange={(e) => setPartCUnitDist(e.target.value)}
                            placeholder="e.g. Comprehensive / Application question from any unit"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#D71945] focus:outline-hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LIVE TOTALS & VALIDATION SUMMARY */}
                  <div className={`rounded-2xl border p-4 transition-all ${
                    isEndSemValid
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-rose-200 bg-rose-50 text-rose-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {isEndSemValid ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                          )}
                          <span className="font-extrabold text-xs uppercase tracking-wider">
                            {isEndSemValid ? 'Marks Breakdown Valid' : 'Marks Mismatch Detected'}
                          </span>
                        </div>
                        <p className="text-xs mt-1">
                          Part A ({partATotal}M) + Part B ({partBTotal}M) + Part C ({partCTotal}M) ={' '}
                          <strong>{grandTotal} Marks</strong> (Target: {totalMarks} Marks)
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-black ${isEndSemValid ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {grandTotal} / {totalMarks}
                        </span>
                      </div>
                    </div>

                    {!isEndSemValid && (
                      <p className="mt-2 text-xs font-bold text-rose-700 border-t border-rose-200 pt-2">
                        Total marks sum ({grandTotal}) must equal specified Total Marks ({totalMarks}). Please adjust Part A, B, or C before saving.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* INTERNAL ASSESSMENT PATTERN EDITOR */
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-[#111827] mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-bold text-[#111827]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#111827] mb-1">
                      Part A Total Questions
                    </label>
                    <input
                      type="number"
                      value={iaPartAQCount}
                      onChange={(e) => setIaPartAQCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-bold text-[#111827]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#111827] mb-1">
                      Part A Marks per Question
                    </label>
                    <input
                      type="number"
                      value={iaPartAQMarks}
                      onChange={(e) => setIaPartAQMarks(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-bold text-[#111827]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#111827] mb-1">
                      Part B Marks per Question
                    </label>
                    <input
                      type="number"
                      value={iaPartBQMarks}
                      onChange={(e) => setIaPartBQMarks(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-bold text-[#111827]"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPattern(null)}
                  className="rounded-xl border border-[#E5E7EB] px-4 py-2 font-bold text-[#64748B] hover:bg-[#F7F8FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEndSem && !isEndSemValid}
                  className="rounded-xl bg-[#D71945] px-6 py-2.5 font-bold text-white shadow-md shadow-[#D71945]/20 hover:bg-[#c0153c] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
