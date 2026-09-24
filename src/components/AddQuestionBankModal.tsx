import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  FileCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Trash2,
  Eye,
  Sliders,
  ArrowRight,
  Download,
  Info,
  Layers,
  ChevronRight,
  ClipboardPaste,
  FileCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  extractQuestionsFromText,
  extractQuestionsFromFile,
  SAMPLE_QUESTION_BANKS,
  ExtractedQuestionDraft
} from '../utils/questionExtractor';
import { ExamType, Department, QuestionPart } from '../types';

interface AddQuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessGenerate?: (paperId: string) => void;
  defaultSubjectCode?: string;
}

export const AddQuestionBankModal: React.FC<AddQuestionBankModalProps> = ({
  isOpen,
  onClose,
  onSuccessGenerate,
  defaultSubjectCode
}) => {
  const {
    subjects,
    selectedSubjectCode,
    addQuestions,
    generatePaper,
    setActivePaper,
    setActiveTab,
    currentUser,
    showToast
  } = useApp();

  const [activeInputMode, setActiveInputMode] = useState<'upload' | 'paste' | 'sample'>('upload');
  const [targetSubjectCode, setTargetSubjectCode] = useState<string>(
    defaultSubjectCode || selectedSubjectCode || '24AM411'
  );
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('Internal Assessment I');
  const [pastedText, setPastedText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestionDraft[]>([]);
  const [filterPart, setFilterPart] = useState<'All' | 'Part A' | 'Part B' | 'Part C'>('All');
  const [filterUnit, setFilterUnit] = useState<'All' | '1' | '2' | '3' | '4' | '5'>('All');
  const [dragOver, setDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSubjectObj = subjects.find(s => s.code === targetSubjectCode) || subjects[0];

  // Process text extraction
  const processText = (text: string) => {
    if (!text.trim()) {
      setExtractedQuestions([]);
      return;
    }
    setIsProcessing(true);
    try {
      const extracted = extractQuestionsFromText(text, targetSubjectCode, currentUser.name);
      setExtractedQuestions(extracted);
      if (extracted.length > 0) {
        showToast(`Extracted ${extracted.length} questions from question bank content.`);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      showToast('Failed to parse questions. Please check format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setUploadedFileName(file.name);
    setIsProcessing(true);
    try {
      const extracted = await extractQuestionsFromFile(file, targetSubjectCode, currentUser.name);
      setExtractedQuestions(extracted);
      showToast(`Successfully extracted ${extracted.length} questions from ${file.name}!`);
    } catch (err: any) {
      console.error('File parsing error:', err);
      showToast(err?.message || `Failed to parse ${file.name}. Please upload a .pdf, .docx, .txt or .json file.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  // Load sample question bank
  const handleLoadSample = (code: string) => {
    setTargetSubjectCode(code);
    const sampleText = SAMPLE_QUESTION_BANKS[code] || SAMPLE_QUESTION_BANKS['24AM411'];
    setPastedText(sampleText);
    setActiveInputMode('sample');
    processText(sampleText);
  };

  // Delete an individual question from review list
  const handleDeleteDraft = (index: number) => {
    setExtractedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Filtered view
  const filteredQuestions = useMemo(() => {
    return extractedQuestions.filter(q => {
      if (filterPart !== 'All' && q.part !== filterPart) return false;
      if (filterUnit !== 'All' && String(q.unit) !== filterUnit) return false;
      return true;
    });
  }, [extractedQuestions, filterPart, filterUnit]);

  // Statistics
  const stats = useMemo(() => {
    const total = extractedQuestions.length;
    const partA = extractedQuestions.filter(q => q.part === 'Part A').length;
    const partB = extractedQuestions.filter(q => q.part === 'Part B').length;
    const partC = extractedQuestions.filter(q => q.part === 'Part C').length;
    const unitsCovered = new Set(extractedQuestions.map(q => q.unit)).size;
    return { total, partA, partB, partC, unitsCovered };
  }, [extractedQuestions]);

  // Save questions to bank only
  const handleImportOnly = () => {
    if (extractedQuestions.length === 0) {
      showToast('No questions to import. Please upload or paste a question bank.');
      return;
    }

    addQuestions(extractedQuestions);
    onClose();
  };

  // Extract & Immediately Generate Paper
  const handleExtractAndGenerate = () => {
    if (extractedQuestions.length === 0) {
      showToast('Please upload or load a question bank before generating.');
      return;
    }

    // 1. Add questions to bank
    addQuestions(extractedQuestions);

    // 2. Generate paper immediately
    const newPaper = generatePaper({
      subjectCode: targetSubjectCode,
      examType: selectedExamType,
      examDate: new Date().toISOString().split('T')[0],
      department: currentSubjectObj.department,
      semester: currentSubjectObj.semester,
      regulation: currentSubjectObj.regulation
    });

    // 3. Set active paper and navigate to paper preview
    setActivePaper(newPaper);
    setActiveTab('generate-paper');
    onClose();

    if (onSuccessGenerate) {
      onSuccessGenerate(newPaper.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D71945]/10 text-[#D71945]">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Add Question Bank & Auto-Extract</h2>
              <p className="text-xs text-slate-500">
                Upload syllabus question bank documents (.pdf, .docx, .txt, .json) to extract questions and generate papers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* DEDICATED OCR ENGINE PROMOTION BANNER */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D71945]/30 bg-gradient-to-r from-rose-50 via-white to-rose-50/30 p-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D71945] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#111827]">
                  Looking for full 5-unit OCR Import with side-by-side verification?
                </h4>
                <p className="text-[11px] text-slate-500">
                  Supports scanned PDF pages, image question banks, duplicate detection, and source page tracking.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('import-question-bank');
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#D71945] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#b01438] shrink-0 cursor-pointer shadow-xs"
            >
              <span>Open OCR Import</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* TOP CONFIG BAR: SUBJECT & EXAM TARGET */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Subject
              </label>
              <select
                value={targetSubjectCode}
                onChange={(e) => {
                  setTargetSubjectCode(e.target.value);
                  if (extractedQuestions.length > 0) {
                    setExtractedQuestions(prev => prev.map(q => ({ ...q, subjectCode: e.target.value })));
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#D71945] focus:outline-none"
              >
                {subjects.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name} ({s.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Exam Paper to Generate
              </label>
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value as ExamType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#D71945] focus:outline-none"
              >
                <option value="Internal Assessment I">Internal Assessment I (Units 1, 2, 3 - 60 Marks)</option>
                <option value="Internal Assessment II">Internal Assessment II (Units 3, 4, 5 - 60 Marks)</option>
                <option value="End Semester Examination">End Semester Examination (Units 1 to 5 - 100 Marks)</option>
              </select>
            </div>
          </div>

          {/* INPUT MODE TABS */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveInputMode('upload')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeInputMode === 'upload'
                  ? 'bg-[#D71945] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload Document (.pdf / .docx / .txt / .json)</span>
            </button>

            <button
              onClick={() => setActiveInputMode('paste')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeInputMode === 'paste'
                  ? 'bg-[#D71945] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ClipboardPaste className="h-4 w-4" />
              <span>Paste Question Bank Text</span>
            </button>

            <button
              onClick={() => {
                setActiveInputMode('sample');
                handleLoadSample(targetSubjectCode);
              }}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeInputMode === 'sample'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Load Regulation 2024 Sample Bank</span>
            </button>
          </div>

          {/* INPUT METHOD 1: FILE UPLOAD */}
          {activeInputMode === 'upload' && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                accept=".pdf,.docx,.doc,.txt,.json,.csv"
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#D71945] bg-[#D71945]/5'
                    : 'border-slate-300 hover:border-[#D71945] hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D71945]/10 text-[#D71945]">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to browse or drag and drop question bank document
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF (.pdf), Word Documents (.docx), Plain Text (.txt), CSV, and Blueprint JSON
                    </p>
                  </div>

                  {uploadedFileName && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-800 font-semibold">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      <span>Loaded: {uploadedFileName}</span>
                      {uploadedFileName.toLowerCase().endsWith('.pdf') && (
                        <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                          PDF Document
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Recognizes Unit headers (Unit 1 to 5), Part A/B/C, Bloom's levels (K1-K6), COs, and Marks automatically</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample(targetSubjectCode)}
                  className="font-semibold text-[#D71945] hover:underline"
                >
                  Or test with sample bank →
                </button>
              </div>
            </div>
          )}

          {/* INPUT METHOD 2: TEXT PASTE */}
          {activeInputMode === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Paste Question Bank content here:
                </label>
                <button
                  onClick={() => {
                    const sample = SAMPLE_QUESTION_BANKS[targetSubjectCode] || SAMPLE_QUESTION_BANKS['24AM411'];
                    setPastedText(sample);
                    processText(sample);
                  }}
                  className="text-xs font-bold text-[#D71945] hover:underline"
                >
                  Fill with Sample Format
                </button>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  processText(e.target.value);
                }}
                rows={8}
                placeholder={`Example Format:
UNIT I: PROBLEM SOLVING & SEARCH ALGORITHMS
PART A (2 MARKS)
1. Define Artificial Intelligence. [BL: K1, CO: CO1, Marks: 2]
2. Explain PEAS description for an autonomous taxi agent. [BL: K2, CO: CO1, Marks: 2]

PART B (13 MARKS)
11. (a) Discuss agent architectures with neat diagrams. [BL: K3, CO: CO1, Marks: 13]`}
                className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs text-slate-800 focus:border-[#D71945] focus:outline-none"
              />
            </div>
          )}

          {/* INPUT METHOD 3: SAMPLE LOADER */}
          {activeInputMode === 'sample' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg mt-0.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-emerald-900">
                    Regulation 2024 Autonomous Sample Question Bank Loaded
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Pre-populated comprehensive 5-Unit question bank for <strong className="font-semibold">{targetSubjectCode}</strong> adhering strictly to Anna University Bloom's Taxonomy & OBE CO-PO mapping guidelines.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.keys(SAMPLE_QUESTION_BANKS).map((code) => (
                      <button
                        key={code}
                        onClick={() => handleLoadSample(code)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                          targetSubjectCode === code
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        }`}
                      >
                        {code} Bank
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EXTRACTION METRICS & STATS BAR */}
          {extractedQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Extracted Questions Preview ({stats.total} Total)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review and filter extracted questions before importing into the portal
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-800">
                    Part A: {stats.partA}
                  </span>
                  <span className="rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1 text-xs font-bold text-purple-800">
                    Part B: {stats.partB}
                  </span>
                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800">
                    Part C: {stats.partC}
                  </span>
                  <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    Units: {stats.unitsCovered} / 5
                  </span>
                </div>
              </div>

              {/* FILTERS */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Filter Part:</span>
                </div>
                {(['All', 'Part A', 'Part B', 'Part C'] as const).map((part) => (
                  <button
                    key={part}
                    onClick={() => setFilterPart(part)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      filterPart === part
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {part}
                  </button>
                ))}

                <div className="h-4 w-[1px] bg-slate-300 mx-1 hidden sm:block" />

                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <span>Unit:</span>
                </div>
                {(['All', '1', '2', '3', '4', '5'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setFilterUnit(u)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                      filterUnit === u
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {u === 'All' ? 'All Units' : `Unit ${u}`}
                  </button>
                ))}
              </div>

              {/* QUESTIONS LIST TABLE */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {filteredQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 hover:bg-slate-50 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                          q.part === 'Part A'
                            ? 'bg-blue-100 text-blue-800'
                            : q.part === 'Part B'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {q.part} ({q.marks}M)
                        </span>
                        <span className="font-semibold text-slate-700">Unit {q.unit}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-bold text-[10px]">
                          {q.bloomsLevel}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-bold text-[10px]">
                          {q.co}
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed font-normal">
                        {q.questionText}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteDraft(idx)}
                      title="Remove question"
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <div className="text-xs text-slate-500">
            {extractedQuestions.length > 0 ? (
              <span>Ready to import <strong>{extractedQuestions.length}</strong> questions into <strong>{targetSubjectCode}</strong></span>
            ) : (
              <span>Upload or load a question bank to enable extraction actions</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleImportOnly}
              disabled={extractedQuestions.length === 0 || isProcessing}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Import to Question Bank
            </button>

            <button
              onClick={handleExtractAndGenerate}
              disabled={extractedQuestions.length === 0 || isProcessing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-[#D71945] px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#D71945]/20 hover:bg-[#c0153c] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Extract & Generate Question Paper</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
