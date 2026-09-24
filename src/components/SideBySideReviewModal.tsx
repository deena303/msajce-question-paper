import React, { useState } from 'react';
import {
  X,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  AlertTriangle,
  Sparkles,
  Layers,
  Save,
  RotateCcw
} from 'lucide-react';
import { BloomsLevel, OcrExtractedQuestion } from '../types';

interface SideBySideReviewModalProps {
  isOpen: boolean;
  question: OcrExtractedQuestion | null;
  onClose: () => void;
  onSave: (updated: OcrExtractedQuestion) => void;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  pageImageMap: Record<number, string>;
  allQuestions: OcrExtractedQuestion[];
  onNavigateQuestion: (direction: 'prev' | 'next') => void;
}

export const SideBySideReviewModal: React.FC<SideBySideReviewModalProps> = ({
  isOpen,
  question,
  onClose,
  onSave,
  onApprove,
  onDelete,
  pageImageMap,
  allQuestions,
  onNavigateQuestion
}) => {
  if (!isOpen || !question) return null;

  // Local editable state for current question
  const [text, setText] = useState(question.questionText);
  const [unit, setUnit] = useState<number | 'Unknown'>(question.unit);
  const [part, setPart] = useState<'A' | 'B' | 'C' | 'Unknown'>(question.part);
  const [marks, setMarks] = useState<number | ''>(question.marks ?? '');
  const [bl, setBl] = useState<BloomsLevel | ''>(question.bl ?? 'K2');
  const [co, setCo] = useState<string>(question.co ?? 'CO1');
  const [pi, setPi] = useState<string>(question.pi ?? '1.1.1');
  const [topic, setTopic] = useState<string>(question.topic || '');
  const [orGroupId, setOrGroupId] = useState<string>(question.orGroupId || '');
  const [orOption, setOrOption] = useState<'A' | 'B' | 'C' | ''>(question.orOption || '');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePage, setActivePage] = useState(question.sourcePage || 1);

  // Sync state if question changes
  React.useEffect(() => {
    if (question) {
      setText(question.questionText);
      setUnit(question.unit);
      setPart(question.part);
      setMarks(question.marks ?? '');
      setBl(question.bl ?? 'K2');
      setCo(question.co ?? 'CO1');
      setPi(question.pi ?? '1.1.1');
      setTopic(question.topic || '');
      setOrGroupId(question.orGroupId || '');
      setOrOption(question.orOption || '');
      setActivePage(question.sourcePage || 1);
    }
  }, [question]);

  const currentIndex = allQuestions.findIndex(q => q.id === question.id);
  const currentImageSrc = pageImageMap[activePage] || Object.values(pageImageMap)[0];

  const handleSave = () => {
    const updated: OcrExtractedQuestion = {
      ...question,
      questionText: text,
      unit,
      part,
      marks: marks === '' ? null : Number(marks),
      bl: (bl || null) as BloomsLevel | null,
      co: co || null,
      pi: pi || null,
      topic,
      orGroupId: orGroupId.trim() || undefined,
      orOption: (orOption || undefined) as any,
      status: 'Approved',
      isEdited: true
    };
    onSave(updated);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          High OCR Confidence ({confidence}%)
        </span>
      );
    }
    if (confidence >= 70) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Needs Review ({confidence}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-300">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
        Low Confidence ({confidence}%)
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5">
      <div className="flex h-[94vh] w-full max-w-7xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-300">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D71945] text-white font-black text-sm">
              Q{question.questionNumber || currentIndex + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  Side-by-Side OCR Verification
                </h2>
                {getConfidenceBadge(question.ocrConfidence)}
              </div>
              <p className="text-xs text-slate-400">
                Source Document: <strong className="text-slate-200">{question.sourceDocument}</strong> • Page {question.sourcePage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Question Navigator */}
            <div className="flex items-center bg-slate-800 rounded-xl px-2 py-1 text-xs font-medium text-slate-300 border border-slate-700">
              <button
                type="button"
                onClick={() => onNavigateQuestion('prev')}
                disabled={currentIndex <= 0}
                className="p-1 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Previous Question"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-bold text-white">
                {currentIndex + 1} of {allQuestions.length}
              </span>
              <button
                type="button"
                onClick={() => onNavigateQuestion('next')}
                disabled={currentIndex >= allQuestions.length - 1}
                className="p-1 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Next Question"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Split Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* LEFT: Original PDF Page / Document Image View */}
          <div className="flex flex-col bg-slate-100 overflow-hidden h-full">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#1976D2]" />
                <span className="font-bold text-slate-800">Original Document</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  Page {activePage}
                </span>
              </div>

              {/* Page & Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.15))}
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-mono px-1 text-slate-500 font-bold">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.15))}
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Document Render Canvas View */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-200/70">
              {currentImageSrc ? (
                <div
                  className="transition-transform duration-150 origin-top shadow-xl rounded-lg bg-white overflow-hidden"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img
                    src={currentImageSrc}
                    alt={`Page ${activePage}`}
                    className="max-w-none w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <FileText className="h-12 w-12 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Digital Document Text Extract</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Extracted from selectable PDF stream. Compare the question text directly on the right.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Extracted Question Structured Fields */}
          <div className="flex flex-col bg-white overflow-y-auto p-5 sm:p-7 space-y-4">
            
            {/* Warning Banners if applicable */}
            {question.status === 'Low Confidence' && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Low Optical Confidence ({question.ocrConfidence}%):</strong>
                  <p className="mt-0.5 text-rose-700">
                    Verify spelling and symbols carefully against the original document on the left.
                  </p>
                </div>
              </div>
            )}

            {question.status === 'Possible Duplicate' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Possible Semantic Duplicate ({question.duplicateSimilarity}% match):</strong>
                    <p className="mt-0.5 text-amber-800 italic">"{question.duplicateText}"</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const updated: OcrExtractedQuestion = {
                        ...question,
                        questionText: text,
                        unit,
                        part,
                        marks: marks === '' ? null : Number(marks),
                        bl: (bl || null) as BloomsLevel | null,
                        co: co || null,
                        pi: pi || null,
                        topic,
                        orGroupId: orGroupId.trim() || undefined,
                        orOption: (orOption || undefined) as any,
                        status: 'Approved',
                        isEdited: true,
                        duplicateText: undefined,
                        duplicateSimilarity: undefined
                      };
                      onSave(updated);
                    }}
                    className="rounded-lg bg-white border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 cursor-pointer shadow-2xs"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mergedText = `${text} [Variant: ${question.duplicateText}]`;
                      setText(mergedText);
                      const updated: OcrExtractedQuestion = {
                        ...question,
                        questionText: mergedText,
                        unit,
                        part,
                        marks: marks === '' ? null : Number(marks),
                        bl: (bl || null) as BloomsLevel | null,
                        co: co || null,
                        pi: pi || null,
                        topic,
                        orGroupId: orGroupId.trim() || undefined,
                        orOption: (orOption || undefined) as any,
                        status: 'Approved',
                        isEdited: true,
                        duplicateText: undefined,
                        duplicateSimilarity: undefined
                      };
                      onSave(updated);
                    }}
                    className="rounded-lg bg-amber-200 border border-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 hover:bg-amber-300 cursor-pointer shadow-2xs"
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(question.id)}
                    className="rounded-lg bg-rose-100 border border-rose-300 px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-200 cursor-pointer shadow-2xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Question Text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Question Text (Editable)
                </label>
                <span className="text-[11px] text-slate-400">
                  Character count: {text.length}
                </span>
              </div>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3.5 text-sm font-medium text-slate-900 focus:border-[#D71945] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D71945]/15 transition-all leading-relaxed"
                placeholder="Enter complete question statement..."
              />
            </div>

            {/* Curriculum Structure (Unit, Part, Marks) */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Unit
                </label>
                <select
                  value={unit.toString()}
                  onChange={(e) => setUnit(e.target.value === 'Unknown' ? 'Unknown' : Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                >
                  <option value="1">Unit I</option>
                  <option value="2">Unit II</option>
                  <option value="3">Unit III</option>
                  <option value="4">Unit IV</option>
                  <option value="5">Unit V</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Part
                </label>
                <select
                  value={part}
                  onChange={(e) => {
                    const p = e.target.value as any;
                    setPart(p);
                    if (p === 'A') setMarks(2);
                    else if (p === 'B') setMarks(13);
                    else if (p === 'C') setMarks(15);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                >
                  <option value="A">Part A (2 Marks)</option>
                  <option value="B">Part B (13 Marks)</option>
                  <option value="C">Part C (15 Marks)</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Marks
                </label>
                <input
                  type="number"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 2, 13"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                />
              </div>
            </div>

            {/* OBE Outcomes: Bloom's Level, CO, PI */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Bloom's Level
                </label>
                <select
                  value={bl}
                  onChange={(e) => setBl(e.target.value as BloomsLevel)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                >
                  <option value="K1">K1 - Remember</option>
                  <option value="K2">K2 - Understand</option>
                  <option value="K3">K3 - Apply</option>
                  <option value="K4">K4 - Analyze</option>
                  <option value="K5">K5 - Evaluate</option>
                  <option value="K6">K6 - Create</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Course Outcome
                </label>
                <select
                  value={co}
                  onChange={(e) => setCo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                >
                  <option value="CO1">CO1</option>
                  <option value="CO2">CO2</option>
                  <option value="CO3">CO3</option>
                  <option value="CO4">CO4</option>
                  <option value="CO5">CO5</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  PI Mapping
                </label>
                <input
                  type="text"
                  value={pi}
                  onChange={(e) => setPi(e.target.value)}
                  placeholder="e.g. 1.1.1"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                />
              </div>
            </div>

            {/* OR Group & Option */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  OR Choice Group ID
                </label>
                <input
                  type="text"
                  value={orGroupId}
                  onChange={(e) => setOrGroupId(e.target.value)}
                  placeholder="e.g. Q11, Q12"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  OR Option (a / b / c)
                </label>
                <select
                  value={orOption}
                  onChange={(e) => setOrOption(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#D71945] focus:outline-hidden"
                >
                  <option value="">None (Standalone)</option>
                  <option value="A">Option A (e.g. 11.a)</option>
                  <option value="B">Option B (e.g. 11.b)</option>
                  <option value="C">Option C (e.g. 11.c)</option>
                </select>
              </div>
            </div>

            {/* Topic Information */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Syllabus Topic / Concept
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic or section reference..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-[#D71945] focus:outline-hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 mt-auto">
              <button
                type="button"
                onClick={() => onDelete(question.id)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Question</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4 text-slate-600" />
                  <span>Save Edits</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    onApprove(question.id);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#D71945] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#b01438] shadow-sm transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Approve & Next</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
