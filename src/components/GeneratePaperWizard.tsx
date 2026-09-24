import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Clock,
  ShieldCheck,
  FileCheck2,
  Sliders,
  Check,
  Building2,
  AlertCircle,
  UploadCloud,
  GraduationCap,
  Tag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Department, DepartmentScope, ExamType, GeneratedPaper, Subject } from '../types';
import { PaperPreview } from './PaperPreview';
import { AddQuestionBankModal } from './AddQuestionBankModal';

export const GeneratePaperWizard: React.FC = () => {
  const {
    subjects,
    dbSubjects,
    activeDepartmentsList,
    academicYearsList,
    activeAcademicYearsList,
    departments,
    academicYears,
    generatePaper,
    activePaper,
    setActivePaper,
    currentUser,
    selectedSubjectCode,
    setSelectedSubjectCode,
    getNextSetLetter,
    selectedDeptScope: ctxDeptScope,
    setSelectedDeptScope: setCtxDeptScope,
    selectedCommonDepts: ctxCommonDepts,
    setSelectedCommonDepts: setCtxCommonDepts
  } = useApp();

  // Wizard Steps: 1 to 5 (Step 5 with activePaper renders PaperPreview)
  const [currentStep, setCurrentStep] = useState<number>(() => activePaper ? 5 : 1);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);

  // Auto-sync step when activePaper changes
  useEffect(() => {
    if (activePaper && currentStep !== 5 && !isGenerating) {
      setCurrentStep(5);
    }
  }, [activePaper]);

  // Form selections (in order: Year -> Dept -> Subject -> ExamType)
  const defaultYear = activeAcademicYearsList[0]?.year_label || '2024-2025';
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(defaultYear);
  const [selectedDeptScope, setSelectedDeptScope] = useState<DepartmentScope>(ctxDeptScope || 'SPECIFIC');
  const [selectedDept, setSelectedDept] = useState<Department>('CSE');
  const [selectedCommonDepts, setSelectedCommonDepts] = useState<string[]>(ctxCommonDepts || []);
  const [selectedSubject, setSelectedSubject] = useState<string>(selectedSubjectCode || '24AM411');
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('Internal Assessment I');

  // Keep context in sync
  useEffect(() => {
    setCtxDeptScope(selectedDeptScope);
  }, [selectedDeptScope, setCtxDeptScope]);

  useEffect(() => {
    setCtxCommonDepts(selectedCommonDepts);
  }, [selectedCommonDepts, setCtxCommonDepts]);

  // Generator simulation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepsDone, setGenerationStepsDone] = useState<number>(0);

  const generationCheckpoints = [
    'Checking syllabus coverage & unit definitions',
    'Filtering eligible questions matching exam flag',
    'Auditing historical question reuse & times used',
    'Selecting Part A balanced items',
    'Selecting Part B analytical & descriptive items',
    'Verifying Bloom\'s Taxonomy & Course Outcomes',
    'Assigning academic year & set identifier',
    'Assembling MSAJCE autonomous paper preview'
  ];

  // Map DB subjects to Subject shape
  const dbSubjectsMapped = React.useMemo(() => {
    if (!dbSubjects || dbSubjects.length === 0) return [];
    return dbSubjects.map(s => {
      const deptCode = s.departments?.department_code || activeDepartmentsList.find(d => d.id === s.department_id)?.department_code || '';
      const yearLabel = s.academic_years?.year_label || academicYearsList.find(y => y.id === s.academic_year_id)?.year_label || '';
      return {
        id: s.id,
        code: s.subject_code,
        name: s.subject_name,
        department: deptCode as any,
        semester: s.semester ? parseInt(s.semester) || 1 : 1,
        regulation: s.regulation || 'Regulation 2024',
        totalQuestions: 0,
        status: (s.status === 'active' ? 'Active' : 'Archived') as 'Active' | 'Archived',
        units: [],
        academicYear: yearLabel
      };
    });
  }, [dbSubjects, activeDepartmentsList, academicYearsList]);

  // Combined pool preferring DB subjects as the single source of truth when available.
  const allSubjectsPool = React.useMemo(() => {
    if (dbSubjectsMapped.length > 0) {
      return dbSubjectsMapped;
    }
    return subjects;
  }, [dbSubjectsMapped, subjects]);

  // Subject filtering: either by single department or by common departments
  const deptSubjects = React.useMemo(() => {
    if (selectedDeptScope === 'COMMON') {
      const filtered = allSubjectsPool.filter(s => {
        const matchesDept = selectedCommonDepts.includes(s.department);
        const matchesYear = (s as any).academicYear ? (s as any).academicYear === selectedAcademicYear : true;
        return matchesDept && matchesYear;
      });
      const seen = new Set<string>();
      return filtered.filter(s => {
        if (seen.has(s.code)) return false;
        seen.add(s.code);
        return true;
      });
    }
    return allSubjectsPool.filter(s => {
      const matchesDept = s.department === selectedDept;
      const matchesYear = (s as any).academicYear ? (s as any).academicYear === selectedAcademicYear : true;
      return matchesDept && matchesYear;
    });
  }, [selectedDeptScope, selectedCommonDepts, selectedDept, selectedAcademicYear, allSubjectsPool]);

  // Auto-sync selected subject if current selection is not in filtered list
  useEffect(() => {
    if (deptSubjects.length > 0 && !deptSubjects.some(s => s.code === selectedSubject)) {
      setSelectedSubject(deptSubjects[0].code);
      setSelectedSubjectCode(deptSubjects[0].code);
    }
  }, [deptSubjects, selectedSubject, setSelectedSubjectCode]);

  // Handle normal department selection (clears common selection as per spec)
  const handleDeptSelect = (dept: Department) => {
    setSelectedDeptScope('SPECIFIC');
    setSelectedDept(dept);
    setSelectedCommonDepts([]);
    const sub = allSubjectsPool.find(s => s.department === dept && ((s as any).academicYear ? (s as any).academicYear === selectedAcademicYear : true));
    if (sub) {
      setSelectedSubject(sub.code);
      setSelectedSubjectCode(sub.code);
    }
  };

  // Handle COMMON selection (does not auto-advance, clears specific selection)
  const handleCommonSelect = () => {
    setSelectedDeptScope('COMMON');
  };

  // Toggle department in common multi-select
  const handleToggleCommonDept = (code: string) => {
    setSelectedCommonDepts(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      if (next.length > 0) {
        const sub = allSubjectsPool.find(s => next.includes(s.department) && ((s as any).academicYear ? (s as any).academicYear === selectedAcademicYear : true));
        if (sub) {
          setSelectedSubject(sub.code);
          setSelectedSubjectCode(sub.code);
        }
      }
      return next;
    });
  };

  const handleSubjectSelect = (code: string) => {
    setSelectedSubject(code);
    setSelectedSubjectCode(code);
  };

  const currentSubjectObj = deptSubjects.find(s => s.code === selectedSubject) || allSubjectsPool.find(s => s.code === selectedSubject) || deptSubjects[0] || subjects[0] || {
    id: 'unknown',
    code: selectedSubject,
    name: selectedSubject,
    department: selectedDept,
    semester: 1,
    regulation: 'Regulation 2024',
    totalQuestions: 0,
    status: 'Active' as const,
    units: []
  };

  // Computed next set letter
  const nextSetLetter = getNextSetLetter(selectedSubject, selectedAcademicYear, selectedExamType);
  const setDisplayName = `${currentSubjectObj.name} – Set ${nextSetLetter}`;

  // Run the generation engine with stepped progress simulation
  const handleStartGeneration = () => {
    setIsGenerating(true);
    setGenerationStepsDone(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setGenerationStepsDone(step);
      if (step >= generationCheckpoints.length) {
        clearInterval(interval);
        // Execute real paper generation with academicYear and scope parameters
        const newPaper = generatePaper({
          department: selectedDeptScope === 'COMMON' ? 'COMMON' : selectedDept,
          scope: selectedDeptScope,
          commonDepartments: selectedDeptScope === 'COMMON' ? selectedCommonDepts : undefined,
          subjectCode: selectedSubject,
          academicYear: selectedAcademicYear,
          examType: selectedExamType,
          examDate: new Date().toISOString().split('T')[0],
          semester: currentSubjectObj.semester,
          regulation: currentSubjectObj.regulation,
          duration: selectedExamType === 'End Semester Examination' ? '3 Hours' : '2 Hours'
        });
        setIsGenerating(false);
        setActivePaper(newPaper);
      }
    }, 350);
  };

  // If there's an active paper and user is not currently in the wizard flow, show PaperPreview
  if (activePaper && !isGenerating && currentStep === 5) {
    return (
      <PaperPreview
        paper={activePaper}
        onBack={() => {
          setActivePaper(null);
          setCurrentStep(1);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
            Exam Paper Studio
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Generate Question Paper
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Automated syllabus-compliant question paper generation with controlled question selection and autonomous Set naming.
          </p>
        </div>

        {activePaper && (
          <button
            onClick={() => setCurrentStep(5)}
            className="flex items-center gap-2 rounded-xl border border-[#1976D2] bg-[#EAF3FF] px-4 py-2.5 text-xs font-bold text-[#1976D2] hover:bg-[#1976D2] hover:text-white transition-all self-start sm:self-auto cursor-pointer"
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Return to Active Paper ({activePaper.paperCode})</span>
          </button>
        )}
      </div>

      {/* Progress Steps Indicator (5 Steps) */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-4">
          {[
            { step: 1, title: 'Academic Year' },
            { step: 2, title: 'Department' },
            { step: 3, title: 'Subject' },
            { step: 4, title: 'Exam Type' },
            { step: 5, title: 'Confirmation & Set' },
          ].map((item, idx) => {
            const isPassed = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div key={item.step} className="flex items-center gap-3 shrink-0">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black transition-all ${
                    isPassed
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#D71945] text-white shadow-md shadow-[#D71945]/30 ring-4 ring-[#D71945]/10'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {isPassed ? <Check className="h-4 w-4" /> : item.step}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Step {item.step}
                  </div>
                  <div className={`text-xs font-extrabold ${isCurrent ? 'text-[#111827]' : 'text-[#64748B]'}`}>
                    {item.title}
                  </div>
                </div>
                {idx < 4 && <div className="hidden lg:block h-0.5 w-10 bg-[#E5E7EB] mx-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: SELECT ACADEMIC YEAR */}
      {currentStep === 1 && (
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#D71945]">
              Step 1 of 5
            </span>
            <h2 className="mt-1 text-xl font-extrabold text-[#111827]">
              Select Academic Year
            </h2>
            <p className="text-xs text-[#64748B]">
              Choose the target academic year session for this examination question paper.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(activeAcademicYearsList.length > 0 ? activeAcademicYearsList.map(y => y.year_label) : academicYears).map((yr) => {
              const isSelected = selectedAcademicYear === yr;
              return (
                <div
                  key={yr}
                  onClick={() => setSelectedAcademicYear(yr)}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#D71945] bg-[#FFF0F3] shadow-md shadow-[#D71945]/10 ring-2 ring-[#D71945]'
                      : 'border-[#E5E7EB] bg-white hover:border-slate-400 hover:bg-[#F7F8FA]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs font-bold text-[#111827] border border-[#E5E7EB]">
                      Session
                    </span>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-[#D71945]" />}
                  </div>
                  <h3 className="mt-3 font-black text-lg text-[#111827]">
                    {yr}
                  </h3>
                  <div className="mt-2 text-xs text-[#64748B]">
                    {yr === activeAcademicYearsList[0]?.year_label ? 'Current Active Academic Year' : 'Academic Year Session'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 rounded-xl bg-[#D71945] px-6 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c] cursor-pointer"
            >
              <span>Continue to Department</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT DEPARTMENT */}
      {currentStep === 2 && (
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#D71945]">
              Step 2 of 5
            </span>
            <h2 className="mt-1 text-xl font-extrabold text-[#111827]">
              Select Academic Department
            </h2>
            <p className="text-xs text-[#64748B]">
              Choose the designated engineering branch for this question paper (Academic Year: <strong>{selectedAcademicYear}</strong>).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(departments || []).map((dept) => {
              const isSelected = selectedDeptScope === 'SPECIFIC' && selectedDept === dept.code;
              return (
                <div
                  key={dept.code}
                  onClick={() => handleDeptSelect(dept.code)}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#D71945] bg-[#FFF0F3] shadow-md shadow-[#D71945]/10 ring-2 ring-[#D71945]'
                      : 'border-[#E5E7EB] bg-white hover:border-slate-400 hover:bg-[#F7F8FA]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs font-bold text-[#111827] border border-[#E5E7EB]">
                      {dept.code}
                    </span>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-[#D71945]" />}
                  </div>
                  <h3 className="mt-3 font-extrabold text-sm text-[#111827]">
                    {dept.name}
                  </h3>
                  <div className="mt-2 text-xs text-[#64748B]">
                    HOD: {dept.hod}
                  </div>
                </div>
              );
            })}

            {/* COMMON CARD — Special system option */}
            {(() => {
              const isCommonSelected = selectedDeptScope === 'COMMON';
              return (
                <div
                  key="COMMON"
                  onClick={handleCommonSelect}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                    isCommonSelected
                      ? 'border-[#D71945] bg-[#FFF0F3] shadow-md shadow-[#D71945]/10 ring-2 ring-[#D71945]'
                      : 'border-[#E5E7EB] bg-white hover:border-slate-400 hover:bg-[#F7F8FA]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs font-bold text-[#111827] border border-[#E5E7EB]">
                      COMMON
                    </span>
                    {isCommonSelected && <CheckCircle2 className="h-5 w-5 text-[#D71945]" />}
                  </div>
                  <h3 className="mt-3 font-extrabold text-sm text-[#111827]">
                    Common Questions
                  </h3>
                  <div className="mt-2 text-xs text-[#64748B]">
                    Questions applicable to multiple departments
                  </div>
                </div>
              );
            })()}
          </div>

          {/* COMMON MULTI-DEPARTMENT SELECTION SECTION */}
          {selectedDeptScope === 'COMMON' && (
            <div className="rounded-2xl border border-rose-200 bg-[#FFF8F9] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-rose-100 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D71945]">
                    COMMON QUESTION
                  </span>
                  <h4 className="text-base font-extrabold text-[#111827]">
                    Select the departments this question applies to:
                  </h4>
                  <p className="text-xs text-[#64748B]">
                    Choose 2 or more active academic departments for this common paper / question set.
                  </p>
                </div>
                <div className="text-xs font-bold text-[#D71945] shrink-0">
                  {selectedCommonDepts.length} selected (min. 2)
                </div>
              </div>

              {/* Dynamic Checkbox List from Database */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {(departments || []).map((dept) => {
                  const isChecked = selectedCommonDepts.includes(dept.code);
                  return (
                    <div
                      key={dept.code}
                      onClick={() => handleToggleCommonDept(dept.code)}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'border-[#D71945] bg-white shadow-xs text-[#111827]'
                          : 'border-[#E5E7EB] bg-white/70 hover:bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300 text-[#D71945] focus:ring-[#D71945] cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs font-extrabold text-[#111827] block">
                          {dept.code}
                        </span>
                        <span className="text-[11px] text-[#64748B] truncate block">
                          {dept.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Summary */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-bold text-[#64748B]">Selected Departments:</span>
                {selectedCommonDepts.length === 0 ? (
                  <span className="text-xs italic text-[#94A3B8]">None selected</span>
                ) : (
                  selectedCommonDepts.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100 border border-rose-200 px-2.5 py-1 text-xs font-mono font-extrabold text-[#D71945]"
                    >
                      [{code}]
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCommonDept(code);
                        }}
                        className="hover:text-rose-900 cursor-pointer font-bold"
                        title={`Remove ${code}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Validation Message */}
              {selectedCommonDepts.length < 2 && (
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Select at least 2 departments for a common question.</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-xs font-bold text-[#64748B] hover:bg-[#F7F8FA] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            {(() => {
              const isContinueDisabled = selectedDeptScope === 'COMMON' && selectedCommonDepts.length < 2;
              return (
                <button
                  disabled={isContinueDisabled}
                  onClick={() => setCurrentStep(3)}
                  className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-extrabold shadow-md transition-all ${
                    isContinueDisabled
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-[#D71945] text-white shadow-[#D71945]/25 hover:bg-[#c0153c] cursor-pointer'
                  }`}
                >
                  <span>Continue to Subject</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* STEP 3: SELECT SUBJECT */}
      {currentStep === 3 && (
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#D71945]">
              Step 3 of 5
            </span>
            <h2 className="mt-1 text-xl font-extrabold text-[#111827]">
              {selectedDeptScope === 'COMMON'
                ? `Select Subject (COMMON: ${selectedCommonDepts.join(', ')} – ${selectedAcademicYear})`
                : `Select Subject (${selectedDept} – ${selectedAcademicYear})`}
            </h2>
            <p className="text-xs text-[#64748B]">
              {selectedDeptScope === 'COMMON'
                ? `Pick from the accredited course catalogue for common departments (${selectedCommonDepts.join(', ')}).`
                : `Pick from the accredited course catalogue for ${selectedDept}.`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {deptSubjects.length === 0 ? (
              <div className="col-span-1 sm:col-span-2 rounded-2xl border border-dashed border-gray-300 p-8 text-center bg-gray-50/50">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-800">
                  No subjects available for the selected academic year and department.
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  There are no active subjects registered under {selectedDeptScope === 'COMMON' ? 'selected common departments' : selectedDept} for session {selectedAcademicYear}.
                </p>
              </div>
            ) : (
              deptSubjects.map((sub) => {
                const isSelected = selectedSubject === sub.code;
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSubjectSelect(sub.code)}
                    className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1976D2] bg-[#EAF3FF] shadow-md shadow-[#1976D2]/10 ring-2 ring-[#1976D2]'
                        : 'border-[#E5E7EB] bg-white hover:border-slate-400 hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs font-extrabold text-[#1976D2] border border-[#E5E7EB]">
                        {sub.code}
                      </span>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-[#1976D2]" />}
                    </div>
                    <h3 className="mt-3 font-extrabold text-base text-[#111827]">
                      {sub.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                      <span>Semester {sub.semester}</span>
                      <span>•</span>
                      <span>{sub.regulation}</span>
                      <span>•</span>
                      <span className="font-bold text-[#111827]">{sub.totalQuestions} Questions in Bank</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-xs font-bold text-[#64748B] hover:bg-[#F7F8FA] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              disabled={deptSubjects.length === 0}
              onClick={() => setCurrentStep(4)}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-extrabold text-white shadow-md transition-all ${
                deptSubjects.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-[#D71945] text-white shadow-[#D71945]/25 hover:bg-[#c0153c] cursor-pointer'
              }`}
            >
              <span>Continue to Exam Type</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SELECT EXAM TYPE */}
      {currentStep === 4 && (
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#D71945]">
              Step 4 of 5
            </span>
            <h2 className="mt-1 text-xl font-extrabold text-[#111827]">
              Select Examination Type
            </h2>
            <p className="text-xs text-[#64748B]">
              Subject: <strong>{currentSubjectObj.name} ({currentSubjectObj.code})</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* IA 1 */}
            <div
              onClick={() => setSelectedExamType('Internal Assessment I')}
              className={`rounded-3xl border p-6 cursor-pointer transition-all flex flex-col justify-between ${
                selectedExamType === 'Internal Assessment I'
                  ? 'border-[#D71945] bg-[#FFF0F3] shadow-md ring-2 ring-[#D71945]'
                  : 'border-[#E5E7EB] bg-white hover:border-slate-400'
              }`}
            >
              <div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#D71945] border border-red-200">
                  Continuous Assessment
                </span>
                <h3 className="mt-4 text-xl font-black text-[#111827]">
                  Internal Assessment I
                </h3>
                <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                  Covers Unit 1, Unit 2, and the first half of Unit 3.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-[#111827]">
                  <div className="font-bold">60 Maximum Marks</div>
                  <div className="text-[#64748B]">Duration: 2 Hours</div>
                  <div className="text-[#64748B]">Part A: 4 × 2 = 8M</div>
                  <div className="text-[#64748B]">Part B: 4 × 13 = 52M</div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
                <span className="text-xs font-extrabold text-[#D71945]">
                  Units 1, 2 & 3 (Half)
                </span>
              </div>
            </div>

            {/* IA 2 */}
            <div
              onClick={() => setSelectedExamType('Internal Assessment II')}
              className={`rounded-3xl border p-6 cursor-pointer transition-all flex flex-col justify-between ${
                selectedExamType === 'Internal Assessment II'
                  ? 'border-[#D71945] bg-[#FFF0F3] shadow-md ring-2 ring-[#D71945]'
                  : 'border-[#E5E7EB] bg-white hover:border-slate-400'
              }`}
            >
              <div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#D71945] border border-red-200">
                  Continuous Assessment
                </span>
                <h3 className="mt-4 text-xl font-black text-[#111827]">
                  Internal Assessment II
                </h3>
                <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                  Covers remaining half of Unit 3, Unit 4, and Unit 5.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-[#111827]">
                  <div className="font-bold">60 Maximum Marks</div>
                  <div className="text-[#64748B]">Duration: 2 Hours</div>
                  <div className="text-[#64748B]">Part A: 4 × 2 = 8M</div>
                  <div className="text-[#64748B]">Part B: 4 × 13 = 52M</div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
                <span className="text-xs font-extrabold text-[#D71945]">
                  Units 3 (Half), 4 & 5
                </span>
              </div>
            </div>

            {/* End Semester */}
            <div
              onClick={() => setSelectedExamType('End Semester Examination')}
              className={`rounded-3xl border p-6 cursor-pointer transition-all flex flex-col justify-between ${
                selectedExamType === 'End Semester Examination'
                  ? 'border-[#1976D2] bg-[#EAF3FF] shadow-md ring-2 ring-[#1976D2]'
                  : 'border-[#E5E7EB] bg-white hover:border-slate-400'
              }`}
            >
              <div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#1976D2] border border-blue-200">
                  Degree Examination
                </span>
                <h3 className="mt-4 text-xl font-black text-[#111827]">
                  End Semester Examination
                </h3>
                <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                  Comprehensive examination covering all 5 syllabus units.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-[#111827]">
                  <div className="font-bold">100 Maximum Marks</div>
                  <div className="text-[#64748B]">Duration: 3 Hours</div>
                  <div className="text-[#64748B]">Part A: 10 × 2 = 20M</div>
                  <div className="text-[#64748B]">Part B: 5 × 13 = 65M (OR)</div>
                  <div className="text-[#64748B]">Part C: 1 × 15 = 15M (OR)</div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
                <span className="text-xs font-extrabold text-[#1976D2]">
                  Units 1 through 5 (100%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-xs font-bold text-[#64748B] hover:bg-[#F7F8FA] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="flex items-center gap-2 rounded-xl bg-[#D71945] px-6 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c] cursor-pointer"
            >
              <span>Continue to Confirmation & Set</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CONFIRMATION & SET ALLOCATION */}
      {currentStep === 5 && !isGenerating && (
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#D71945]">
              Step 5 of 5
            </span>
            <h2 className="mt-1 text-xl font-extrabold text-[#111827]">
              Confirm Generation Blueprint & Set Assignment
            </h2>
            <p className="text-xs text-[#64748B]">
              Review the finalized parameters and assigned question paper set before generating.
            </p>
          </div>

          {/* Autonomous Set Allocation Box */}
          <div className="rounded-2xl border-2 border-dashed border-[#D71945] bg-[#FFF0F3] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D71945] text-white shadow-md shadow-[#D71945]/30">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D71945]">
                  Automated Set Designation
                </span>
                <h3 className="text-xl font-black text-[#111827]">
                  Assigned Set: <span className="text-[#D71945]">Set {nextSetLetter}</span>
                </h3>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Display Title: &ldquo;{setDisplayName}&rdquo;
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white px-3.5 py-2 border border-rose-200 text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Set Sequencing</span>
              <div className="text-xs font-black text-slate-800">
                Auto-assigned next available letter
              </div>
            </div>
          </div>

          {/* Parameter Details Grid */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Academic Year</span>
                <div className="font-black text-sm text-[#111827]">{selectedAcademicYear}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Department</span>
                <div className="font-black text-sm text-[#111827]">
                  {selectedDeptScope === 'COMMON' ? (
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      <span className="rounded bg-rose-100 border border-rose-200 px-2 py-0.5 font-black text-xs text-[#D71945]">
                        COMMON
                      </span>
                      <span className="text-xs font-bold text-[#64748B]">
                        ({selectedCommonDepts.join(', ')})
                      </span>
                    </span>
                  ) : (
                    selectedDept
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Course Code & Title</span>
                <div className="font-black text-sm text-[#111827]">{currentSubjectObj.code} – {currentSubjectObj.name}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Examination</span>
                <div className="font-black text-sm text-[#D71945]">{selectedExamType}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl bg-white p-3 border border-[#E5E7EB]">
                <div className="text-[#64748B] text-[10px] font-semibold">Maximum Marks</div>
                <div className="font-black text-base text-[#111827]">
                  {selectedExamType === 'End Semester Examination' ? '100 Marks' : '60 Marks'}
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#E5E7EB]">
                <div className="text-[#64748B] text-[10px] font-semibold">Time Duration</div>
                <div className="font-black text-base text-[#111827]">
                  {selectedExamType === 'End Semester Examination' ? '3 Hours' : '2 Hours'}
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#E5E7EB]">
                <div className="text-[#64748B] text-[10px] font-semibold">Syllabus Scope</div>
                <div className="font-black text-base text-[#1976D2]">
                  {selectedExamType === 'Internal Assessment I' ? 'Units 1, 2, 3 (50%)' : selectedExamType === 'Internal Assessment II' ? 'Units 3 (50%), 4, 5' : 'Units 1 to 5'}
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-[#E5E7EB]">
                <div className="text-[#64748B] text-[10px] font-semibold">Repetition Engine</div>
                <div className="font-black text-base text-emerald-700">Strictly Unused First</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-[#ECFDF3] p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong>Quality Assurance:</strong> Questions will only be drawn from {currentSubjectObj.name} ({currentSubjectObj.code}). The engine balances Bloom&apos;s levels and verifies CO/PI mappings for NBA accreditation.
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-xs font-bold text-[#64748B] hover:bg-[#F7F8FA] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleStartGeneration}
              className="flex items-center gap-2 rounded-xl bg-[#D71945] px-6 py-3 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/25 hover:bg-[#c0153c] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Examination Paper ({`Set ${nextSetLetter}`})</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 SIMULATION: AUTOMATIC SELECTION PROCESSING */}
      {currentStep === 5 && isGenerating && (
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 sm:p-12 shadow-xs max-w-xl mx-auto text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FFF0F3] text-[#D71945] animate-pulse">
            <RotateCw className="h-8 w-8 animate-spin" />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
              Autonomous Question Selection Engine
            </span>
            <h2 className="mt-1 text-2xl font-black text-[#111827]">
              Composing Question Paper – Set {nextSetLetter}
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Selecting verified questions for {currentSubjectObj.name} ({selectedAcademicYear})...
            </p>
          </div>

          {/* Staged Checkpoints */}
          <div className="space-y-2.5 text-left text-xs bg-[#F7F8FA] p-5 rounded-2xl border border-[#E5E7EB]">
            {generationCheckpoints.map((label, idx) => {
              const isDone = generationStepsDone > idx;
              const isCurrent = generationStepsDone === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 transition-opacity ${
                    isDone ? 'text-[#111827] font-semibold' : isCurrent ? 'text-[#D71945] font-bold' : 'text-[#94A3B8] opacity-50'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <div className="h-4 w-4 rounded-full border-2 border-[#D71945] border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[#CBD5E1] shrink-0" />
                  )}
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Question Bank Modal */}
      <AddQuestionBankModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        defaultSubjectCode={selectedSubject}
      />
    </div>
  );
};
