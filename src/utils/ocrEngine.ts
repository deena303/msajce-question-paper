import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import {
  BloomsLevel,
  Department,
  OcrExtractedQuestion,
  OcrDocumentMetadata,
  Question,
  QuestionPart
} from '../types';

// Ensure PDF.js worker is properly configured in the browser
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
}

/**
 * Interface for tracking extraction step progress in the UI
 */
export interface OcrProgressCallback {
  (status: {
    stage: 'loading' | 'rendering' | 'ocr' | 'structure' | 'questions' | 'duplicates' | 'complete' | 'error';
    message: string;
    percent: number;
    currentPage?: number;
    totalPages?: number;
  }): void;
}

/**
 * Result of the full OCR parsing pipeline
 */
export interface OcrProcessingResult {
  metadata: OcrDocumentMetadata;
  questions: OcrExtractedQuestion[];
  pageImages: Record<number, string>; // pageNumber -> dataUrl
  pageTexts: Record<number, string>;
  rawFullText: string;
  duplicateCount: number;
  needsReviewCount: number;
  lowConfidenceCount: number;
  partACount: number;
  partBCount: number;
  partCCount: number;
  errorPages: number[];
}

/**
 * Roman to Arabic unit converter
 */
export function romanToArabic(val: string): number {
  const clean = val.trim().toUpperCase();
  if (clean === 'I' || clean === '1') return 1;
  if (clean === 'II' || clean === '2') return 2;
  if (clean === 'III' || clean === '3') return 3;
  if (clean === 'IV' || clean === '4') return 4;
  if (clean === 'V' || clean === '5') return 5;
  return 1;
}

/**
 * Detect Bloom's Taxonomy Level using action verbs (Anna University OBE)
 */
export function detectBloomsLevel(text: string): BloomsLevel {
  const lower = text.toLowerCase();
  if (/\b(evaluate|critique|judge|justify|assess|prioritize|defend|rate|verify)\b/i.test(lower)) {
    return 'K5';
  }
  if (/\b(create|design|compose|formulate|construct|develop|devise|synthesize|plan)\b/i.test(lower)) {
    return 'K6';
  }
  if (/\b(analyze|differentiate|distinguish|compare|contrast|categorize|deconstruct|examine|investigate)\b/i.test(lower)) {
    return 'K4';
  }
  if (/\b(apply|calculate|solve|demonstrate|implement|compute|show|utilize|determine|derive|execute)\b/i.test(lower)) {
    return 'K3';
  }
  if (/\b(explain|describe|discuss|summarize|interpret|classify|illustrate|outline|clarify|indicate)\b/i.test(lower)) {
    return 'K2';
  }
  return 'K1'; // Define, State, List, Recall, Name, Mention, What is
}

/**
 * Semantic token similarity calculation for duplicate detection
 * Strips common question stop-words to detect semantic equivalences like:
 * "Define Artificial Intelligence" vs "What is artificial intelligence?"
 */
export function calculateSemanticSimilarity(text1: string, text2: string): number {
  const stopWords = new Set([
    'what', 'is', 'are', 'define', 'explain', 'describe', 'discuss', 'briefly',
    'state', 'give', 'list', 'the', 'a', 'an', 'of', 'in', 'and', 'for', 'with',
    'to', 'from', 'by', 'on', 'its', 'their', 'how', 'does', 'why', 'can', 'you',
    'write', 'short', 'notes', 'detailed', 'sketch'
  ]);

  const tokenize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

  const words1 = new Set(tokenize(text1));
  const words2 = new Set(tokenize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Renders a PDF page to canvas and returns a high-resolution data URL
 */
async function renderPageToImage(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Performs OCR on an image data URL using Tesseract.js with fallback
 */
async function ocrImageWithTesseract(
  dataUrl: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const worker = await createWorker('eng');
    const result = await worker.recognize(dataUrl);
    await worker.terminate();
    return result.data.text || '';
  } catch (err) {
    console.warn('Tesseract OCR error, falling back:', err);
    return '';
  }
}

/**
 * Primary OCR Engine that processes PDF or image files and outputs structured academic question objects
 */
export async function processQuestionBankOcr(
  file: File,
  knownSubjects: { code: string; name: string; department: Department }[],
  existingQuestions: Question[],
  onProgress?: OcrProgressCallback
): Promise<OcrProcessingResult> {
  const fileName = file.name;
  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(fileName);
  const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  const pageImages: Record<number, string> = {};
  const pageTexts: Record<number, string> = {};
  const errorPages: number[] = [];
  let totalPages = 1;
  let isScannedImageOnly = false;

  onProgress?.({
    stage: 'loading',
    message: 'Loading and verifying question bank document...',
    percent: 10,
    totalPages: 1
  });

  // 1. Image Upload Processing (Single Page)
  if (isImage) {
    totalPages = 1;
    onProgress?.({
      stage: 'rendering',
      message: 'Processing image and preparing OCR scan...',
      percent: 25,
      currentPage: 1,
      totalPages: 1
    });

    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    pageImages[1] = dataUrl;
    isScannedImageOnly = true;

    onProgress?.({
      stage: 'ocr',
      message: 'Extracting academic text via optical character recognition...',
      percent: 45,
      currentPage: 1,
      totalPages: 1
    });

    const ocrText = await ocrImageWithTesseract(dataUrl, p => {
      onProgress?.({
        stage: 'ocr',
        message: `OCR scanning image (${Math.round(p * 100)}%)...`,
        percent: 45 + Math.round(p * 25),
        currentPage: 1,
        totalPages: 1
      });
    });

    pageTexts[1] = ocrText;
  }
  // 2. PDF Upload Processing (Multi-page)
  else if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    });

    const pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;

    onProgress?.({
      stage: 'rendering',
      message: `Detected ${totalPages} pages. Checking selectable text layers...`,
      percent: 20,
      totalPages
    });

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);

        // Render page image for side-by-side view
        const imgData = await renderPageToImage(page);
        pageImages[pageNum] = imgData;

        // Check selectable text layer
        const textContent = await page.getTextContent();
        const extractedStrings = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .filter((s: string) => s.trim().length > 0);

        let pageText = extractedStrings.join(' ');

        // If selectable text is insufficient (< 30 characters), perform OCR on rendered page image
        if (pageText.trim().length < 30 && imgData) {
          isScannedImageOnly = true;
          onProgress?.({
            stage: 'ocr',
            message: `Scanned page ${pageNum} detected. Running OCR engine...`,
            percent: 20 + Math.round((pageNum / totalPages) * 35),
            currentPage: pageNum,
            totalPages
          });
          const ocrPageText = await ocrImageWithTesseract(imgData);
          pageText = ocrPageText;
        }

        pageTexts[pageNum] = pageText;
      } catch (err) {
        console.error(`Error reading page ${pageNum}:`, err);
        errorPages.push(pageNum);
        pageTexts[pageNum] = '';
      }

      onProgress?.({
        stage: 'rendering',
        message: `Processed page ${pageNum} of ${totalPages}`,
        percent: 20 + Math.round((pageNum / totalPages) * 40),
        currentPage: pageNum,
        totalPages
      });
    }
  } else {
    // Plain text / fallback
    const text = await file.text();
    pageTexts[1] = text;
    totalPages = 1;
  }

  // Combine full document text
  const fullDocumentText = Object.entries(pageTexts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([pageNum, text]) => `\n[--- PAGE ${pageNum} ---]\n${text}`)
    .join('\n');

  onProgress?.({
    stage: 'structure',
    message: 'Analyzing document structure (Units, Parts, Curriculum, Metadata)...',
    percent: 65,
    totalPages
  });

  // 3. Document Structure & Curriculum Metadata Detection
  const metadata: OcrDocumentMetadata = {
    fileName,
    fileSize: fileSizeMb,
    totalPages,
    totalUnitsDetected: 0,
    isScannedImageOnly
  };

  // Detect Subject Code & Name
  for (const sub of knownSubjects) {
    const codeRegex = new RegExp(`\\b${sub.code}\\b`, 'i');
    if (codeRegex.test(fullDocumentText)) {
      metadata.subjectCode = sub.code;
      metadata.subjectName = sub.name;
      metadata.department = sub.department;
      break;
    }
  }
  if (!metadata.subjectCode) {
    const genericCodeMatch = fullDocumentText.match(/\b(2[0-9][A-Z]{2,4}[0-9]{3,4}|[A-Z]{2,4}[0-9]{3,4})\b/i);
    if (genericCodeMatch) {
      metadata.subjectCode = genericCodeMatch[1].toUpperCase();
    } else {
      metadata.subjectCode = knownSubjects[0]?.code || '24AM411';
    }
    const matchedSubject = knownSubjects.find(s => s.code === metadata.subjectCode);
    if (matchedSubject) {
      metadata.subjectName = matchedSubject.name;
      metadata.department = matchedSubject.department;
    }
  }

  // Detect Regulation
  const regMatch = fullDocumentText.match(/\b(?:Regulation|R)[\s\-\:\.\_]*([0-9]{4})\b/i);
  metadata.regulation = regMatch ? `Regulation ${regMatch[1]}` : 'Regulation 2024';

  // Detect Semester
  const semMatch = fullDocumentText.match(/\b(?:Semester|Sem)[\s\-\:\.\_]*([0-9]{1,2}|I{1,3}|IV|V|VI|VII|VIII)\b/i);
  metadata.semester = semMatch ? `Semester ${semMatch[1]}` : 'Semester IV';

  onProgress?.({
    stage: 'questions',
    message: 'Detecting question boundaries, OR groups, sub-questions, and marks...',
    percent: 78,
    totalPages
  });

  // 4. Detailed Question Extraction
  const extractedQuestions: OcrExtractedQuestion[] = [];
  const detectedUnits = new Set<number>();

  let activeUnit: number | 'Unknown' = 'Unknown';
  let activePart: 'A' | 'B' | 'C' | 'Unknown' = 'Unknown';
  let activeMarks: number | null = null;
  let activeTopic = '';
  let currentPage = 1;

  // Process line by line across all pages
  const allLines = fullDocumentText.split(/\r?\n/);

  interface QuestionDraft {
    questionNumber?: string;
    text: string;
    unit: number | 'Unknown';
    part: 'A' | 'B' | 'C' | 'Unknown';
    marks: number | null;
    explicitMarks: boolean;
    bl: BloomsLevel | null;
    co: string | null;
    pi: string | null;
    topic: string;
    sourcePage: number;
    orGroupId?: string;
    orOption?: 'A' | 'B' | 'C';
    subQuestions?: string[];
    rawLines: string[];
  }

  const drafts: QuestionDraft[] = [];
  let currentDraft: QuestionDraft | null = null;

  const saveCurrentDraft = () => {
    if (!currentDraft) return;
    const combinedText = currentDraft.rawLines.join(' ').trim();
    if (combinedText.length >= 6) {
      currentDraft.text = combinedText;
      drafts.push(currentDraft);
    }
    currentDraft = null;
  };

  for (let i = 0; i < allLines.length; i++) {
    const rawLine = allLines[i].trim();
    if (!rawLine) continue;

    // Track Page Markers
    const pageMarker = rawLine.match(/^\[--- PAGE (\d+) ---\]$/);
    if (pageMarker) {
      currentPage = parseInt(pageMarker[1], 10);
      continue;
    }

    // 1. Detect UNIT Headings (Variations: UNIT I, Unit 1, UNIT - I, Unit-I, Module 1, etc.)
    const unitRegex = /^(?:UNIT|Unit|MODULE|Module|UnitNo|Unit\s*Number)[\s\-\:\.\_]*([1-5]|I{1,3}|IV|V)\b[\s\-\:\.]*(.*)$/i;
    const unitMatch = rawLine.match(unitRegex);
    if (unitMatch) {
      saveCurrentDraft();
      const unitNum = romanToArabic(unitMatch[1]);
      activeUnit = unitNum;
      detectedUnits.add(unitNum);
      activeTopic = unitMatch[2]?.trim() || `Unit ${unitNum} Concepts`;
      continue;
    }

    // 2. Detect PART Headings (Variations: PART A, Part-A, PART - A, SECTION A, Section B, etc.)
    const partRegex = /^(?:PART|Part|SECTION|Section)[\s\-\:\.\_]*([ABC])\b[\s\-\:\.]*(.*)$/i;
    const partMatch = rawLine.match(partRegex);
    if (partMatch) {
      saveCurrentDraft();
      const p = partMatch[1].toUpperCase() as 'A' | 'B' | 'C';
      activePart = p;
      if (p === 'A') activeMarks = 2;
      else if (p === 'B') activeMarks = 13;
      else if (p === 'C') activeMarks = 15;
      continue;
    }

    // 3. Detect OR relationship inside Part B / C questions
    // e.g., "11. a) Explain pipelining." followed by "OR" and "b) Explain superscalar architecture."
    const isOrDivider = /^(?:OR|\(OR\)|\[OR\])$/i.test(rawLine);
    if (isOrDivider) {
      if (currentDraft) {
        // Tag current draft as Option A of an OR group
        if (!currentDraft.orGroupId) {
          const num = currentDraft.questionNumber?.replace(/[^0-9]/g, '') || `Q${drafts.length + 1}`;
          currentDraft.orGroupId = `Q${num}`;
          currentDraft.orOption = 'A';
        }
        saveCurrentDraft();
      }
      continue;
    }

    // 4. Detect Start of a New Question
    // Patterns:
    // "1. Define ...", "12) Explain ...", "Q1.", "Question 1:", "11. a)", "11(a)", "11. (b)"
    const newQuestionRegex = /^(?:Q(?:uestion)?\s*(\d{1,3})[\.\:\)]?|(\d{1,3})[\.\)]\s*(?:\(?([a-d])\)?[\.\)]?)?|(?:\(?([a-d])\)?[\.\)]))\s+(.*)$/i;
    const qMatch = rawLine.match(newQuestionRegex);

    if (qMatch) {
      saveCurrentDraft();

      const mainNum = qMatch[1] || qMatch[2] || '';
      const subLetter = (qMatch[3] || qMatch[4] || '').toUpperCase();
      let questionNumStr = mainNum;
      let orGroup: string | undefined;
      let orOpt: 'A' | 'B' | 'C' | undefined;

      if (mainNum && subLetter) {
        questionNumStr = `${mainNum}(${subLetter.toLowerCase()})`;
        orGroup = `Q${mainNum}`;
        orOpt = (subLetter === 'A' || subLetter === 'B' || subLetter === 'C') ? (subLetter as any) : undefined;
      } else if (!mainNum && subLetter) {
        // Follow-up letter e.g. "b) Explain ..."
        const lastQ = drafts[drafts.length - 1];
        const prevGroup = lastQ?.orGroupId || (lastQ?.questionNumber ? `Q${lastQ.questionNumber.replace(/[^0-9]/g, '')}` : undefined);
        questionNumStr = prevGroup ? `${prevGroup.replace('Q', '')}(${subLetter.toLowerCase()})` : subLetter;
        orGroup = prevGroup;
        orOpt = (subLetter === 'A' || subLetter === 'B' || subLetter === 'C') ? (subLetter as any) : undefined;
      }

      // Check for inline metadata tags on question start line
      const initialText = qMatch[5] || '';

      currentDraft = {
        questionNumber: questionNumStr || (drafts.length + 1).toString(),
        text: '',
        unit: activeUnit,
        part: activePart,
        marks: activeMarks,
        explicitMarks: false,
        bl: null,
        co: null,
        pi: null,
        topic: activeTopic,
        sourcePage: currentPage,
        orGroupId: orGroup,
        orOption: orOpt,
        subQuestions: [],
        rawLines: [initialText]
      };
      continue;
    }

    // 5. Detect Sub-questions like "i) ...", "ii) ...", "iii) ..."
    const subQRegex = /^\s*(?:\(?([ivx]+)\)[\.\)]?)\s+(.*)$/i;
    const subQMatch = rawLine.match(subQRegex);
    if (subQMatch && currentDraft) {
      const subRoman = subQMatch[1].toLowerCase();
      const subContent = subQMatch[2];
      currentDraft.subQuestions = currentDraft.subQuestions || [];
      currentDraft.subQuestions.push(`${subRoman}) ${subContent}`);
      currentDraft.rawLines.push(rawLine);
      continue;
    }

    // 6. Continuation of Current Question
    if (currentDraft) {
      currentDraft.rawLines.push(rawLine);
    }
  }

  // Save the final draft
  saveCurrentDraft();

  onProgress?.({
    stage: 'structure',
    message: `Identified ${drafts.length} candidate questions. Extracting academic metadata...`,
    percent: 85,
    totalPages
  });

  metadata.totalUnitsDetected = detectedUnits.size;

  // 5. Structure each Draft into an OcrExtractedQuestion with Metadata & Confidence
  let partACount = 0;
  let partBCount = 0;
  let partCCount = 0;
  let needsReviewCount = 0;
  let lowConfidenceCount = 0;

  for (let idx = 0; idx < drafts.length; idx++) {
    const d = drafts[idx];
    let fullText = d.text.trim();

    // 1. Extract Explicit Marks: e.g. "(2 Marks)", "[13]", "(15)", "(2)"
    let marks = d.marks;
    let explicitMarksFound = false;
    const explicitMarksMatch = fullText.match(/(?:\[|\()?\s*(\d{1,2})\s*(?:Marks?|M)?\s*(?:\]|\))?\s*$/i);
    if (explicitMarksMatch) {
      const parsedMarks = parseInt(explicitMarksMatch[1], 10);
      if (parsedMarks === 2 || parsedMarks === 13 || parsedMarks === 15 || parsedMarks === 16 || parsedMarks === 14) {
        marks = parsedMarks;
        explicitMarksFound = true;
      }
    }

    // 2. Part Resolution (Section 5: Do NOT rely only on marks)
    let part = d.part;
    if (part === 'Unknown') {
      if (marks === 2) part = 'A';
      else if (marks === 13 || marks === 16) part = 'B';
      else if (marks === 15) part = 'C';
    } else {
      // If part was set from Section A/B/C
      part = d.part;
    }

    // Align marks if part is explicitly A, B, or C and marks is null
    if (marks === null) {
      if (part === 'A') marks = 2;
      else if (part === 'B') marks = 13;
      else if (part === 'C') marks = 15;
    }

    if (part === 'A') partACount++;
    else if (part === 'B') partBCount++;
    else if (part === 'C') partCCount++;

    // 3. Extract Explicit Bloom's Taxonomy Level: e.g. [BL: K2], (K1), BTL-2, Level: K3
    let bl: BloomsLevel | null = null;
    const blMatch = fullText.match(/\b(?:BL|Bloom['’]?s?|BTL|Level)?[\s\:\-\[\(]*(K[1-6])\b/i);
    if (blMatch) {
      bl = blMatch[1].toUpperCase() as BloomsLevel;
    } else {
      // Action verb detection
      bl = detectBloomsLevel(fullText);
    }

    // 4. Extract Explicit Course Outcome (CO): e.g. [CO1], (CO: CO2), CO-3
    let co: string | null = null;
    const coMatch = fullText.match(/\b(?:CO|Outcome)?[\s\:\-\[\(]*(CO[1-5])\b/i);
    if (coMatch) {
      co = coMatch[1].toUpperCase();
    } else if (typeof d.unit === 'number' && d.unit >= 1 && d.unit <= 5) {
      co = `CO${d.unit}`;
    }

    // 5. Extract Performance Indicator (PI): e.g. [PI: 1.1.1], 1.1.1, 2.3.1
    let pi: string | null = null;
    const piMatch = fullText.match(/\b(?:PI)?[\s\:\-\[\(]*([1-5]\.[0-9]\.[0-9])\b/i);
    if (piMatch) {
      pi = piMatch[1];
    } else if (typeof d.unit === 'number') {
      pi = `${d.unit}.1.1`;
    }

    // 6. Clean metadata tags from question text
    let cleanText = fullText
      .replace(/\[(?:BL|Bloom|BTL|CO|Marks?|PI)[^\]]*\]/gi, '')
      .replace(/\((?:BL|Bloom|BTL|CO|Marks?|PI)[^\)]*\)/gi, '')
      .replace(/\s*\(\d{1,2}\s*Marks?\)/gi, '')
      .replace(/\s*\[\d{1,2}\s*Marks?\]/gi, '')
      .replace(/\s*K[1-6]\s+CO[1-5]\s+[1-5]\.[0-9]\.[0-9]\s*$/i, '')
      .replace(/\s*K[1-6]\s+CO[1-5]\s*$/i, '')
      .replace(/\s*K[1-6]\s*$/i, '')
      .trim();

    // 7. Calculate OCR Confidence Score (0-100%)
    let confidence = 96;

    // Deduct if unit could not be determined
    if (d.unit === 'Unknown') confidence -= 22;
    // Deduct if marks could not be determined
    if (marks === null) confidence -= 18;
    // Deduct if part could not be determined
    if (part === 'Unknown') confidence -= 15;
    // Deduct if scanned image scan has noisy characters (~, |, \, odd glyphs)
    const noiseChars = (cleanText.match(/[\~\|\`\^\©\®\§]/g) || []).length;
    if (noiseChars > 2) confidence -= Math.min(25, noiseChars * 5);
    // Deduct if text is unusually short
    if (cleanText.length < 15) confidence -= 20;

    // Check for questionable text
    let questionableText: string | undefined;
    if (noiseChars > 0 || cleanText.includes('???') || cleanText.length < 15) {
      questionableText = cleanText.substring(0, 40) + '...';
    }

    confidence = Math.max(35, Math.min(99, confidence));

    // Determine Status according to Rule 11
    let status: OcrExtractedQuestion['status'] = 'Approved';
    if (confidence < 70) {
      status = 'Low Confidence';
      lowConfidenceCount++;
    } else if (confidence < 85 || d.unit === 'Unknown' || marks === null) {
      status = 'Needs Review';
      needsReviewCount++;
    }

    // Difficulty based on Blooms Level
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    if (bl === 'K1' || bl === 'K2') difficulty = 'Easy';
    else if (bl === 'K3' || bl === 'K4') difficulty = 'Medium';
    else difficulty = 'Hard';

    // Topic extraction
    const topicWords = cleanText.split(' ').slice(0, 5).join(' ').replace(/[^a-zA-Z0-9\s]/g, '');
    const topic = d.topic || topicWords || `Unit ${d.unit} Concept`;

    extractedQuestions.push({
      id: `ocr-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      subjectCode: metadata.subjectCode || '24AM411',
      unit: d.unit,
      part,
      questionNumber: d.questionNumber || (idx + 1).toString(),
      questionText: cleanText,
      marks,
      bl,
      co,
      pi,
      topic,
      difficulty,
      orGroupId: d.orGroupId,
      orOption: d.orOption,
      subQuestions: d.subQuestions && d.subQuestions.length > 0 ? d.subQuestions : undefined,
      ocrConfidence: confidence,
      sourceDocument: fileName,
      sourcePage: d.sourcePage,
      status,
      questionableText
    });
  }

  onProgress?.({
    stage: 'duplicates',
    message: 'Running semantic similarity & duplicate analysis...',
    percent: 94,
    totalPages
  });

  // 6. Duplicate Detection (Section 17)
  let duplicateCount = 0;
  const questionsToCheckAgainst = existingQuestions.filter(
    q => q.subjectCode === metadata.subjectCode
  );

  for (const newQ of extractedQuestions) {
    // Check against existing questions in database
    for (const exQ of questionsToCheckAgainst) {
      const similarity = calculateSemanticSimilarity(newQ.questionText, exQ.questionText);
      if (similarity >= 0.65) {
        newQ.status = 'Possible Duplicate';
        newQ.duplicateWithId = exQ.id;
        newQ.duplicateText = exQ.questionText;
        newQ.duplicateSimilarity = Math.round(similarity * 100);
        duplicateCount++;
        break;
      }
    }

    // Also check intra-batch duplicate questions
    if (!newQ.duplicateWithId) {
      for (const otherQ of extractedQuestions) {
        if (otherQ.id !== newQ.id) {
          const sim = calculateSemanticSimilarity(newQ.questionText, otherQ.questionText);
          if (sim >= 0.75) {
            newQ.status = 'Possible Duplicate';
            newQ.duplicateWithId = otherQ.id;
            newQ.duplicateText = otherQ.questionText;
            newQ.duplicateSimilarity = Math.round(sim * 100);
            duplicateCount++;
            break;
          }
        }
      }
    }
  }

  onProgress?.({
    stage: 'complete',
    message: `Extraction complete: ${extractedQuestions.length} questions ready for verification!`,
    percent: 100,
    totalPages
  });

  return {
    metadata,
    questions: extractedQuestions,
    pageImages,
    pageTexts,
    rawFullText: fullDocumentText,
    duplicateCount,
    needsReviewCount,
    lowConfidenceCount,
    partACount,
    partBCount,
    partCCount,
    errorPages
  };
}

/**
 * Built-in Sample Question Banks for Instant OCR Testing
 */
export const SAMPLE_OCR_BANKS: {
  id: string;
  subjectCode: string;
  title: string;
  fileName: string;
  description: string;
  rawText: string;
}[] = [
  {
    id: 'sample-24am411',
    subjectCode: '24AM411',
    title: 'AI & Machine Learning (24AM411) – 5-Unit Complete Question Bank',
    fileName: '24AM411_AI_ML_Question_Bank_5Units.pdf',
    description: 'Accredited Anna University Regulation 2024 OBE question bank containing Parts A, B, and C with OR-groups across Units 1 to 5.',
    rawText: `ANNA UNIVERSITY / MOHAMED SATHAK A J COLLEGE OF ENGINEERING
AUTONOMOUS REGULATION 2024
DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE
QUESTION BANK: 24AM411 - ARTIFICIAL INTELLIGENCE & MACHINE LEARNING

UNIT I: PROBLEM SOLVING & SEARCH STRATEGIES
PART A (2 MARKS)
1. Define Artificial Intelligence. Differentiate between Strong AI and Weak AI. [BL: K1, CO: CO1, 1.1.1] (2)
2. What is machine learning? Mention its core paradigms. [BL: K1, CO: CO1, 1.1.1] (2)
3. Explain intelligent agents and specify the PEAS structure for an automated medical diagnosis agent. [BL: K2, CO: CO1, 1.2.1] (2)
4. Differentiate between deterministic vs stochastic environments. [BL: K2, CO: CO1, 1.2.1] (2)
5. State the optimality criteria of A* search. When is heuristic h(n) considered admissible? [BL: K2, CO: CO1, 1.3.1] (2)
6. Why is Depth-First Search incomplete in infinite state spaces? [BL: K2, CO: CO1, 1.3.1] (2)

PART B (13 MARKS)
11. a) Explain the architecture, state transition mechanisms, and internal behaviors of Simple Reflex, Model-Based, Goal-Based, and Utility-Based Agents with neat diagrams. [BL: K3, CO: CO1, 1.2.2] (13)
    OR
    b) Explain the A* search algorithm with an illustrative 8-puzzle problem search tree. Prove that tree search A* is optimal if the heuristic is admissible. [BL: K4, CO: CO1, 1.3.2] (13)

UNIT II: KNOWLEDGE REPRESENTATION & FIRST-ORDER LOGIC
PART A (2 MARKS)
7. Convert the English statement into First-Order Logic: "Every student who prepares diligently passes the examination." [BL: K3, CO: CO2, 2.1.1] (2)
8. Differentiate between Forward Chaining and Backward Chaining inference methods. [BL: K2, CO: CO2, 2.1.1] (2)
9. What is Conjunctive Normal Form (CNF)? Why is it necessary for resolution refutation? [BL: K1, CO: CO2, 2.2.1] (2)
10. Define ontological engineering and describe semantic networks in knowledge engineering. [BL: K2, CO: CO2, 2.2.1] (2)

PART B (13 MARKS)
12. a) Explain the Resolution Refutation algorithm in First-Order Predicate Logic with an axiomatic knowledge base example. [BL: K4, CO: CO2, 2.2.2] (13)
    OR
    b) Explain Frame systems and Conceptual Dependency representations used for semantic knowledge organization. [BL: K3, CO: CO2, 2.3.1] (13)

UNIT III: UNCERTAINTY & PROBABILISTIC REASONING
PART A (2 MARKS)
11. State Bayes Theorem and explain the role of prior and posterior probabilities. [BL: K2, CO: CO3, 3.1.1] (2)
12. Define conditional independence. How does it reduce parameters in Bayesian Belief Networks? [BL: K2, CO: CO3, 3.1.1] (2)
13. What is a Markov Decision Process (MDP)? List its essential components. [BL: K1, CO: CO3, 3.2.1] (2)

PART B (13 MARKS)
13. a) Explain the construction and variable elimination exact inference algorithm for Bayesian Belief Networks with a numerical example. [BL: K4, CO: CO3, 3.1.2] (13)
    OR
    b) Describe Hidden Markov Models (HMM) and explain the forward-backward algorithm for sequence likelihood computation. [BL: K4, CO: CO3, 3.2.2] (13)

UNIT IV: SUPERVISED & UNSUPERVISED LEARNING
PART A (2 MARKS)
14. Distinguish between Classification and Regression in supervised learning. [BL: K2, CO: CO4, 4.1.1] (2)
15. What is the role of the activation function in artificial neural networks? Give examples. [BL: K1, CO: CO4, 4.2.1] (2)
16. Define the kernel trick in Support Vector Machines (SVM). [BL: K2, CO: CO4, 4.2.1] (2)

PART B (13 MARKS)
14. a) Explain the Decision Tree induction algorithm using Information Gain and Gini Impurity criteria. [BL: K3, CO: CO4, 4.1.2] (13)
    OR
    b) Discuss the K-Means clustering algorithm step-by-step and explain the elbow method for optimal cluster determination. [BL: K3, CO: CO4, 4.3.1] (13)

UNIT V: DEEP LEARNING & REINFORCEMENT LEARNING
PART A (2 MARKS)
17. Define Q-learning and state the Bellman optimality equation. [BL: K2, CO: CO5, 5.1.1] (2)
18. What is vanishing gradient problem in deep neural networks and how does ReLU resolve it? [BL: K2, CO: CO5, 5.2.1] (2)
19. Differentiate between Convolutional Neural Networks (CNN) and Recurrent Neural Networks (RNN). [BL: K2, CO: CO5, 5.2.1] (2)

PART B (13 MARKS)
15. a) Explain the architecture and operational layers of a Convolutional Neural Network (Convolution, Pooling, Flatten, Fully Connected) for image classification. [BL: K4, CO: CO5, 5.2.2] (13)
    OR
    b) Describe the Reinforcement Learning framework. Explain Model-Free Q-learning with the exploration vs exploitation dilemma. [BL: K4, CO: CO5, 5.1.2] (13)

PART C (15 MARKS)
16. a) Design an end-to-end intelligent autonomous surveillance drone system combining computer vision and reinforcement navigation. Specify its PEAS, state representation, convolutional pipeline, and reward formulation. [BL: K5, CO: CO5, 5.3.1] (15)
    OR
    b) Critique the performance of Deep Neural Networks versus Ensemble Random Forests on tabular financial fraud detection datasets with severe class imbalance. Propose a robust evaluation pipeline. [BL: K5, CO: CO4, 4.2.2] (15)
`
  },
  {
    id: 'sample-24cs301',
    subjectCode: '24CS301',
    title: 'Computer Organization & Architecture (24CS301) – 5-Unit Bank',
    fileName: '24CS301_COA_Question_Bank.pdf',
    description: 'Complete 5-unit syllabus with instruction cycle, pipeline hazards, memory hierarchy, cache mapping, and I/O interrupts.',
    rawText: `ANNA UNIVERSITY / MSAJCE AUTONOMOUS
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
QUESTION BANK: 24CS301 - COMPUTER ORGANIZATION AND ARCHITECTURE
REGULATION 2024

UNIT 1: BASIC STRUCTURE OF COMPUTERS & MACHINE INSTRUCTIONS
PART A (2 MARKS)
1. State Von Neumann architecture principles and identify the Von Neumann bottleneck. [BL: K1, CO: CO1, 1.1.1] (2)
2. What is an instruction cycle? List its sequential sub-phases. [BL: K1, CO: CO1, 1.1.1] (2)
3. Differentiate between big-endian and little-endian byte ordering with an example. [BL: K2, CO: CO1, 1.2.1] (2)
4. Explain auto-increment and auto-decrement addressing modes with syntax. [BL: K2, CO: CO1, 1.2.1] (2)

PART B (13 MARKS)
11. a) Explain the various addressing modes with suitable assembly examples and effective address computation. [BL: K3, CO: CO1, 1.2.2] (13)
    OR
    b) Describe the functional units of a digital computer and explain the bus structure with bus arbitration techniques. [BL: K3, CO: CO1, 1.1.2] (13)

UNIT 2: ARITHMETIC OPERATIONS
PART A (2 MARKS)
5. Explain Booth's multiplication algorithm for signed binary integers. [BL: K2, CO: CO2, 2.1.1] (2)
6. Differentiate between restoring and non-restoring division algorithms. [BL: K2, CO: CO2, 2.1.1] (2)
7. State IEEE 754 standard format for single precision floating-point representation. [BL: K1, CO: CO2, 2.2.1] (2)

PART B (13 MARKS)
12. a) Multiply (-7) by (+3) using Booth's multiplication algorithm showing all step-by-step register updates. [BL: K3, CO: CO2, 2.1.2] (13)
    OR
    b) Explain non-restoring division with a step-by-step division of (11) by (3) in binary. [BL: K3, CO: CO2, 2.1.2] (13)

UNIT 3: PROCESSOR DESIGN & PIPELINING
PART A (2 MARKS)
8. Define pipelining in modern processors. What is speedup factor? [BL: K1, CO: CO3, 3.1.1] (2)
9. What are structural hazards in instruction pipelines and how are they avoided? [BL: K2, CO: CO3, 3.2.1] (2)
10. Explain branch prediction and delay slots used to minimize control hazards. [BL: K2, CO: CO3, 3.2.1] (2)

PART B (13 MARKS)
13. a) Explain the 5-stage RISC instruction pipeline with a timing diagram. Discuss data hazard resolution using operand forwarding. [BL: K4, CO: CO3, 3.2.2] (13)
    OR
    b) Describe hardwired control unit versus microprogrammed control unit architecture in detail. [BL: K3, CO: CO3, 3.1.2] (13)

UNIT 4: MEMORY HIERARCHY & CACHE
PART A (2 MARKS)
11. Why is memory hierarchy designed in computing systems? [BL: K2, CO: CO4, 4.1.1] (2)
12. Differentiate between write-through and write-back cache policies. [BL: K2, CO: CO4, 4.2.1] (2)
13. What is Translation Lookaside Buffer (TLB) in virtual memory systems? [BL: K1, CO: CO4, 4.3.1] (2)

PART B (13 MARKS)
14. a) Explain direct mapping, associative mapping, and set-associative cache mapping schemes with block diagrams. [BL: K4, CO: CO4, 4.2.2] (13)
    OR
    b) Explain virtual memory paging mechanism and address translation using page tables and TLB. [BL: K4, CO: CO4, 4.3.2] (13)

UNIT 5: I/O ORGANIZATION & PERIPHERALS
PART A (2 MARKS)
14. What is memory-mapped I/O and how does it differ from isolated I/O? [BL: K2, CO: CO5, 5.1.1] (2)
15. Explain daisy chaining interrupt priority resolution. [BL: K2, CO: CO5, 5.2.1] (2)
16. What is Direct Memory Access (DMA) and cycle stealing? [BL: K1, CO: CO5, 5.3.1] (2)

PART B (13 MARKS)
15. a) Explain DMA controller architecture and DMA data transfer modes (Burst and Cycle Stealing) in detail. [BL: K4, CO: CO5, 5.3.2] (13)
    OR
    b) Discuss synchronous and asynchronous bus communication mechanisms with handshaking timing diagrams. [BL: K3, CO: CO5, 5.1.2] (13)

PART C (15 MARKS)
16. a) Design a 2-way set-associative cache for a 32-bit CPU with 64 KB cache size and 16-byte block size. Show tag, set, and offset division and trace address lookup. [BL: K5, CO: CO4, 4.2.3] (15)
    OR
    b) Analyze the execution of a 100-instruction loop on a 5-stage pipeline with 20% branch instructions and 15% load-use stalls. Compute the actual CPI and throughput speedup. [BL: K5, CO: CO3, 3.2.3] (15)
`
  }
];
