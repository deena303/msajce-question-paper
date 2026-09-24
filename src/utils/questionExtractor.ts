import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { Question, QuestionPart, BloomsLevel, Subject, ExamType } from '../types';

export interface ExtractedQuestionDraft {
  id?: string;
  subjectCode: string;
  unit: number;
  topic: string;
  part: QuestionPart;
  marks: number;
  questionText: string;
  bloomsLevel: BloomsLevel;
  co: string;
  pi: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  allowedFor: {
    internal1: boolean;
    internal2: boolean;
    endSem: boolean;
  };
  status: 'Approved' | 'Draft' | 'Pending';
  createdBy?: string;
}

/**
 * Infer Bloom's taxonomy level from question text action verbs
 */
export function inferBloomsLevel(text: string): BloomsLevel {
  const lower = text.toLowerCase();
  
  // Bloom's keywords matching Anna University OBE standards
  if (/\b(evaluate|critique|judge|justify|assess|prioritize|defend|rate)\b/i.test(lower)) {
    return 'K5';
  }
  if (/\b(create|design|compose|formulate|construct|develop|devise|synthesize)\b/i.test(lower)) {
    return 'K6';
  }
  if (/\b(analyze|differentiate|distinguish|compare|contrast|categorize|deconstruct|examine|investigate)\b/i.test(lower)) {
    return 'K4';
  }
  if (/\b(apply|calculate|solve|demonstrate|implement|compute|show|utilize|determine|derive)\b/i.test(lower)) {
    return 'K3';
  }
  if (/\b(explain|describe|discuss|summarize|interpret|classify|illustrate|outline|clarify)\b/i.test(lower)) {
    return 'K2';
  }
  return 'K1'; // Default: Define, List, State, What is, Recall, Name
}

/**
 * Clean up question prefixes (e.g. "1.", "Q1.", "11(a)", "(b)")
 */
function cleanQuestionText(raw: string): string {
  return raw
    .replace(/^(\d+[\.\)]|\(?[a-zA-Z0-9]{1,3}\)[\.\)]?|Q\d+[\.\:]?|\bQuestion\s*\d+[\.\:]?)\s*/i, '')
    .trim();
}

/**
 * Extracts questions from structured or semi-structured text.
 * Handles:
 * - Explicit UNIT and PART markers
 * - Inline tags like [BL: K2, CO: CO1, Marks: 2] or (K2) (CO1)
 * - Plain numbered lists
 */
export function extractQuestionsFromText(
  rawText: string,
  subjectCode: string,
  authorName: string = 'Exam Cell'
): ExtractedQuestionDraft[] {
  const lines = rawText.split(/\r?\n/);
  const questions: ExtractedQuestionDraft[] = [];

  let currentUnit = 1;
  let currentPart: QuestionPart = 'Part A';
  let currentMarks = 2;
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const combinedText = buffer.join(' ').trim();
    buffer = [];

    if (combinedText.length < 8) return; // Skip trivial noise

    // Extract explicit Bloom's if present e.g. [K2], (BL: K3), BL-2
    let blooms: BloomsLevel = 'K2';
    const blMatch = combinedText.match(/\b(?:BL|Bloom['’]?s?|Level)?[\s\:\-\[\(]*(K[1-6])\b/i);
    if (blMatch) {
      blooms = blMatch[1].toUpperCase() as BloomsLevel;
    } else {
      blooms = inferBloomsLevel(combinedText);
    }

    // Extract explicit CO if present e.g. [CO1], (CO: CO2)
    let co = `CO${currentUnit}`;
    const coMatch = combinedText.match(/\b(?:CO|Outcome)?[\s\:\-\[\(]*(CO[1-5])\b/i);
    if (coMatch) {
      co = coMatch[1].toUpperCase();
    }

    // Extract explicit Marks if present e.g. [Marks: 13], (13M), 2 Marks
    let marks = currentMarks;
    const marksMatch = combinedText.match(/\b(\d{1,2})\s*(?:Marks?|M)\b/i);
    if (marksMatch) {
      const parsedMarks = parseInt(marksMatch[1], 10);
      if (parsedMarks === 2 || parsedMarks === 13 || parsedMarks === 15 || parsedMarks === 16) {
        marks = parsedMarks;
      }
    }

    // Infer Part based on marks or text if not explicitly set
    let part = currentPart;
    if (marks === 2) part = 'Part A';
    else if (marks === 13 || marks === 16) part = 'Part B';
    else if (marks === 15) part = 'Part C';

    // Difficulty based on Bloom's
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    if (blooms === 'K1' || blooms === 'K2') difficulty = 'Easy';
    else if (blooms === 'K3' || blooms === 'K4') difficulty = 'Medium';
    else difficulty = 'Hard';

    // Exam eligibility by unit
    const internal1 = currentUnit <= 3;
    const internal2 = currentUnit >= 3;
    const endSem = true;

    // Clean question text removing metadata tags
    let cleaned = cleanQuestionText(combinedText);
    cleaned = cleaned
      .replace(/\[(?:BL|Bloom|CO|Marks?|PI)[^\]]*\]/gi, '')
      .replace(/\((?:BL|Bloom|CO|Marks?|PI)[^\)]*\)/gi, '')
      .replace(/\s*\(\d{1,2}\s*Marks?\)/gi, '')
      .replace(/\s*\[\d{1,2}\s*Marks?\]/gi, '')
      .trim();

    if (cleaned.length < 5) return;

    // Extract a brief topic
    const topic = cleaned.split(' ').slice(0, 4).join(' ').replace(/[^a-zA-Z0-9\s]/g, '') || `Unit ${currentUnit} Concept`;

    questions.push({
      subjectCode,
      unit: currentUnit,
      topic,
      part,
      marks,
      questionText: cleaned,
      bloomsLevel: blooms,
      co,
      pi: `${currentUnit}.1.1`,
      difficulty,
      allowedFor: { internal1, internal2, endSem },
      status: 'Approved',
      createdBy: authorName,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      flushBuffer();
      continue;
    }

    // Check for UNIT header: UNIT I, UNIT 1, Unit - 2, Unit IV
    const unitMatch = rawLine.match(/^(?:UNIT|Unit|MODULE|Module)[\s\-\:\.\_]*([1-5]|I{1,3}|IV|V)\b/i);
    if (unitMatch) {
      flushBuffer();
      const val = unitMatch[1].toUpperCase();
      if (val === 'I' || val === '1') currentUnit = 1;
      else if (val === 'II' || val === '2') currentUnit = 2;
      else if (val === 'III' || val === '3') currentUnit = 3;
      else if (val === 'IV' || val === '4') currentUnit = 4;
      else if (val === 'V' || val === '5') currentUnit = 5;
      continue;
    }

    // Check for PART header: PART A, PART B, PART C
    const partMatch = rawLine.match(/^(?:PART|Part|SECTION|Section)[\s\-\:\.\_]*([ABC])\b/i);
    if (partMatch) {
      flushBuffer();
      const p = partMatch[1].toUpperCase();
      if (p === 'A') {
        currentPart = 'Part A';
        currentMarks = 2;
      } else if (p === 'B') {
        currentPart = 'Part B';
        currentMarks = 13;
      } else if (p === 'C') {
        currentPart = 'Part C';
        currentMarks = 15;
      }
      continue;
    }

    // Check for new question start e.g. "1.", "12.", "Q1:", "(a)", "11(a)"
    const isNewQuestion = /^(?:Q\d+[\.\:]?|\d{1,3}[\.\)]|\([a-z0-9]{1,3}\)|\bQuestion\s*\d+)\s+/i.test(rawLine);
    if (isNewQuestion) {
      flushBuffer();
      buffer.push(rawLine);
    } else {
      // Continuation of current question or plain text
      if (buffer.length > 0) {
        buffer.push(rawLine);
      } else if (rawLine.length > 15) {
        // Standalone question without explicit numbering
        buffer.push(rawLine);
      }
    }
  }

  flushBuffer();

  // If questions were parsed without any unit markers, distribute them evenly across Units 1 to 5
  if (questions.length > 0 && questions.every(q => q.unit === 1)) {
    questions.forEach((q, idx) => {
      const u = (idx % 5) + 1;
      q.unit = u;
      q.co = `CO${u}`;
      q.pi = `${u}.1.1`;
      q.allowedFor = {
        internal1: u <= 3,
        internal2: u >= 3,
        endSem: true,
      };
    });
  }

  return questions;
}

/**
 * Extracts readable text from an uploaded PDF document
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    // Configure workerSrc for browser environment if not yet configured
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      
      const pageStrings = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter((str: string) => str.trim().length > 0);

      fullText += `\n\n--- Page ${pageNum} ---\n` + pageStrings.join(' ');
    }

    if (fullText.trim().length > 15) {
      return fullText;
    }
  } catch (pdfErr) {
    console.warn('PDF.js standard parsing encountered issue, attempting fallback text stream parsing:', pdfErr);
  }

  // Fallback text extractor: extract text strings directly from PDF stream
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    const rawContent = decoder.decode(uint8);

    const matches: string[] = [];
    const textRegex = /\(([^()]{2,})\)\s*(?:Tj|'|")/g;
    let m: RegExpExecArray | null;
    while ((m = textRegex.exec(rawContent)) !== null) {
      matches.push(m[1]);
    }

    if (matches.length > 5) {
      return matches.join(' ');
    }
  } catch (e) {
    console.error('Fallback PDF decoding failed', e);
  }

  return '';
}

/**
 * Parses files (.pdf, .docx, .txt, .csv, .json) and extracts question records
 */
export async function extractQuestionsFromFile(
  file: File,
  subjectCode: string,
  authorName: string = 'Exam Cell'
): Promise<ExtractedQuestionDraft[]> {
  const fileName = file.name.toLowerCase();

  // 1. PDF Document (.pdf)
  if (fileName.endsWith('.pdf')) {
    const pdfText = await extractTextFromPDF(file);
    if (!pdfText.trim()) {
      throw new Error('Unable to extract readable text from PDF. Please verify the PDF is not an image-only scan.');
    }
    return extractQuestionsFromText(pdfText, subjectCode, authorName);
  }

  // 2. Microsoft Word Document (.docx)
  if (fileName.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return extractQuestionsFromText(result.value, subjectCode, authorName);
  }

  // 2. JSON Format
  if (fileName.endsWith('.json')) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any, idx: number) => {
          const unit = Number(item.unit) || ((idx % 5) + 1);
          const marks = Number(item.marks) || 2;
          const part: QuestionPart = item.part || (marks === 2 ? 'Part A' : marks === 15 ? 'Part C' : 'Part B');
          const blooms: BloomsLevel = item.bloomsLevel || inferBloomsLevel(item.questionText || '');
          return {
            subjectCode,
            unit,
            topic: item.topic || `Unit ${unit} Subject Matter`,
            part,
            marks,
            questionText: item.questionText || item.question || item.text || '',
            bloomsLevel: blooms,
            co: item.co || `CO${unit}`,
            pi: item.pi || `${unit}.1.1`,
            difficulty: item.difficulty || 'Medium',
            allowedFor: {
              internal1: unit <= 3,
              internal2: unit >= 3,
              endSem: true
            },
            status: 'Approved' as const,
            createdBy: authorName
          };
        }).filter(q => q.questionText.trim().length > 5);
      }
    } catch (e) {
      console.warn('Failed to parse as JSON, falling back to text parsing', e);
    }
  }

  // 3. Plain Text, CSV, .doc or fallback
  const text = await file.text();
  return extractQuestionsFromText(text, subjectCode, authorName);
}

/**
 * Built-in accredited college sample question banks for all departments & subjects
 */
export const SAMPLE_QUESTION_BANKS: Record<string, string> = {
  '24AM411': `ANNA UNIVERSITY / MSAJCE AUTONOMOUS
QUESTION BANK - 24AM411 ARTIFICIAL INTELLIGENCE & MACHINE LEARNING
REGULATION 2024 (OBE FORMAT)

UNIT I: PROBLEM SOLVING & SEARCH ALGORITHMS
PART A (2 MARKS)
1. Define Artificial Intelligence and distinguish between Strong AI and Weak AI. [BL: K1, CO: CO1, Marks: 2]
2. Explain the operational setup and significance of the Turing Test in AI. [BL: K2, CO: CO1, Marks: 2]
3. What is PEAS description? Provide a PEAS model for an automated taxi driver agent. [BL: K2, CO: CO1, Marks: 2]
4. Differentiate between deterministic vs. stochastic and static vs. dynamic environments. [BL: K2, CO: CO1, Marks: 2]
5. Define admissible and consistent heuristics in the context of A* search. [BL: K1, CO: CO1, Marks: 2]
6. Why is Breadth-First Search optimal when all step costs are equal while Depth-First Search is not? [BL: K2, CO: CO1, Marks: 2]

PART B (13 MARKS)
11. (a) Discuss the architecture and working mechanisms of simple reflex, model-based, goal-based, and utility-based agents with clean block diagrams. [BL: K3, CO: CO1, Marks: 13]
11. (b) Explain the A* search algorithm in detail. Prove that A* using tree search is optimal if the heuristic function h(n) is admissible. [BL: K4, CO: CO1, Marks: 13]

UNIT II: KNOWLEDGE REPRESENTATION & FIRST-ORDER LOGIC
PART A (2 MARKS)
7. Convert the English statement into First Order Logic: "Every student who studies hard passes the examination". [BL: K3, CO: CO2, Marks: 2]
8. Differentiate between Forward Chaining and Backward Chaining inference mechanisms. [BL: K2, CO: CO2, Marks: 2]
9. What is Conjunctive Normal Form (CNF)? Mention its significance in automated theorem proving. [BL: K1, CO: CO2, Marks: 2]
10. Define ontological engineering and semantic networks in AI knowledge bases. [BL: K2, CO: CO2, Marks: 2]

PART B (13 MARKS)
12. (a) Explain the resolution refutation algorithm in First-Order Logic with an illustrative axiomatic knowledge base example. [BL: K4, CO: CO2, Marks: 13]
12. (b) Describe frame-based systems and conceptual dependency models used in natural language knowledge representation. [BL: K3, CO: CO2, Marks: 13]

UNIT III: UNCERTAINTY, PROBABILISTIC REASONING & DECISION NETWORKS
PART A (2 MARKS)
11. State Bayes Theorem and explain the role of conditional probability in medical diagnosis systems. [BL: K2, CO: CO3, Marks: 2]
12. Define Conditional Independence and explain how it simplifies joint probability tables in Bayesian Networks. [BL: K2, CO: CO3, Marks: 2]
13. What is a Markov Decision Process (MDP)? List its core formal tuple elements. [BL: K1, CO: CO3, Marks: 2]
14. Explain the concept of utility functions in decision-theoretic agents. [BL: K2, CO: CO3, Marks: 2]

PART B (13 MARKS)
13. (a) Construct a Bayesian Belief Network for an alarm-burglary-earthquake scenario and demonstrate inference by variable elimination. [BL: K4, CO: CO3, Marks: 13]
13. (b) Explain Bellman optimality equations and the Value Iteration algorithm for solving Markov Decision Processes. [BL: K4, CO: CO3, Marks: 13]

UNIT IV: MACHINE LEARNING & NEURAL NETWORKS
PART A (2 MARKS)
15. Differentiate between Supervised, Unsupervised, and Reinforcement Learning paradigms with practical use cases. [BL: K2, CO: CO4, Marks: 2]
16. What is the role of the activation function in artificial neural networks? Contrast Sigmoid and ReLU. [BL: K2, CO: CO4, Marks: 2]
17. Define overfitting in machine learning models and mention two regularization techniques to mitigate it. [BL: K2, CO: CO4, Marks: 2]
18. Explain the concept of Information Gain and Gini Impurity in Decision Tree induction. [BL: K3, CO: CO4, Marks: 2]

PART B (13 MARKS)
14. (a) Derive the backpropagation weight update rule for a multi-layer feedforward perceptron using gradient descent optimization. [BL: K4, CO: CO4, Marks: 13]
14. (b) Explain the Support Vector Machine (SVM) algorithm for linearly separable and non-linear data using Kernel methods. [BL: K4, CO: CO4, Marks: 13]

UNIT V: NATURAL LANGUAGE PROCESSING & ETHICS IN AI
PART A (2 MARKS)
19. What is word embedding? Differentiate between One-Hot Encoding and Word2Vec representations. [BL: K2, CO: CO5, Marks: 2]
20. Explain the Self-Attention mechanism that underpins modern Transformer language models. [BL: K2, CO: CO5, Marks: 2]
21. Define algorithmic bias in machine learning models and state one strategy to detect and prevent it. [BL: K2, CO: CO5, Marks: 2]
22. What is Explainable AI (XAI) and why is it essential for autonomous clinical or financial decision systems? [BL: K2, CO: CO5, Marks: 2]

PART B (13 MARKS)
15. (a) Detail the complete transformer architecture (Encoder-Decoder blocks) highlighting Multi-Head Attention and Positional Encodings. [BL: K4, CO: CO5, Marks: 13]
15. (b) Discuss ethical implications of autonomous AI systems, addressing safety, transparency, accountability, and environmental impact. [BL: K4, CO: CO5, Marks: 13]

PART C (15 MARKS - APPLICATION & DESIGN)
16. (a) Design a comprehensive AI architecture for an Autonomous Smart Healthcare Monitoring and Alert System that ingests real-time ICU sensor feeds, detects anomalies, reasons over uncertainty, and recommends clinical interventions while complying with data privacy. [BL: K6, CO: CO5, Marks: 15]
16. (b) Formulate an end-to-end intelligent disaster management system utilizing UAV swarms, computer vision object detection, multi-agent path planning, and real-time survivor triage. [BL: K6, CO: CO5, Marks: 15]`,

  '24CS301': `ANNA UNIVERSITY / MSAJCE AUTONOMOUS
QUESTION BANK - 24CS301 COMPUTER ORGANIZATION AND ARCHITECTURE
REGULATION 2024 (OBE FORMAT)

UNIT I: BASIC STRUCTURE OF COMPUTERS & MACHINE INSTRUCTIONS
PART A (2 MARKS)
1. State Amdahl's Law and explain its significance in modern multicore processor scaling. [BL: K2, CO: CO1, Marks: 2]
2. What is branch prediction? Explain how branch target buffer assists dynamic prediction. [BL: K2, CO: CO1, Marks: 2]
3. Differentiate between Big-Endian and Little-Endian byte addressing with memory illustrations. [BL: K2, CO: CO1, Marks: 2]
4. Contrast RISC and CISC design philosophies in terms of instruction set complexity and cycle counts. [BL: K2, CO: CO1, Marks: 2]

PART B (13 MARKS)
11. (a) Explain various addressing modes available in modern processor instruction sets with assembly syntax and effective address formulas. [BL: K3, CO: CO1, Marks: 13]
11. (b) Describe the instruction execution cycle (Fetch, Decode, Execute, Memory, Write-back) with bus timing diagrams. [BL: K3, CO: CO1, Marks: 13]

UNIT II: ARITHMETIC LOGIC UNIT & NUMBER REPRESENTATION
PART A (2 MARKS)
5. Explain Booth's multiplication algorithm for signed two's complement numbers. [BL: K2, CO: CO2, Marks: 2]
6. Differentiate between restoring and non-restoring integer division algorithms. [BL: K2, CO: CO2, Marks: 2]
7. Explain IEEE 754 floating-point single-precision representation format. [BL: K2, CO: CO2, Marks: 2]
8. What is a Carry-Lookahead Adder (CLA) and how does it overcome ripple carry propagation delay? [BL: K2, CO: CO2, Marks: 2]

PART B (13 MARKS)
12. (a) Multiply (-9) by (+13) using Booth's algorithm. Show register contents, step-by-step arithmetic operations, and final verified product. [BL: K3, CO: CO2, Marks: 13]
12. (b) Explain IEEE 754 floating-point addition and multiplication workflows with normalized exception handling. [BL: K4, CO: CO2, Marks: 13]

UNIT III: PROCESSOR DATAPATH & PIPELINING
PART A (2 MARKS)
9. Define pipeline throughput and explain pipeline stall or bubble insertion. [BL: K2, CO: CO3, Marks: 2]
10. Identify three categories of pipeline hazards (Data, Structural, Control) and state solutions for each. [BL: K2, CO: CO3, Marks: 2]
11. What is operand forwarding (bypassing) and how does it eliminate RAW data hazards? [BL: K2, CO: CO3, Marks: 2]
12. Explain hardwired control unit versus microprogrammed control unit architectures. [BL: K2, CO: CO3, Marks: 2]

PART B (13 MARKS)
13. (a) Explain the design of a classical 5-stage MIPS instruction pipeline datapath including hazard detection and forwarding units. [BL: K4, CO: CO3, Marks: 13]
13. (b) Describe dynamic instruction scheduling using Tomasulo's algorithm and reservation stations. [BL: K4, CO: CO3, Marks: 13]

UNIT IV: MEMORY HIERARCHY & VIRTUAL MEMORY
PART A (2 MARKS)
13. What is the Principle of Locality of Reference? Differentiate between spatial and temporal locality. [BL: K2, CO: CO4, Marks: 2]
14. Contrast Direct-Mapped, Set-Associative, and Fully-Associative cache mapping techniques. [BL: K2, CO: CO4, Marks: 2]
15. Explain Write-Through vs. Write-Back policies in cache memory management. [BL: K2, CO: CO4, Marks: 2]
16. What is a Translation Lookaside Buffer (TLB) and how does it accelerate virtual-to-physical address translation? [BL: K2, CO: CO4, Marks: 2]

PART B (13 MARKS)
14. (a) A system has a 64 KB 4-way set-associative cache with 32-byte blocks and 32-bit physical addresses. Determine Tag, Index, and Offset bits and explain access workflows. [BL: K4, CO: CO4, Marks: 13]
14. (b) Explain the paged virtual memory architecture including Page Table entries, multi-level paging, and page fault handling. [BL: K4, CO: CO4, Marks: 13]

UNIT V: INPUT/OUTPUT ORGANIZATION & MULTIPROCESSORS
PART A (2 MARKS)
17. Differentiate between Programmed I/O, Interrupt-Driven I/O, and Direct Memory Access (DMA). [BL: K2, CO: CO5, Marks: 2]
18. Explain DMA controller bus arbitration mechanisms (Burst transfer vs. Cycle stealing). [BL: K2, CO: CO5, Marks: 2]
19. What is cache coherence problem in symmetric multiprocessors (SMP)? [BL: K2, CO: CO5, Marks: 2]
20. Explain MESI cache coherence protocol states. [BL: K2, CO: CO5, Marks: 2]

PART B (13 MARKS)
15. (a) Explain Direct Memory Access (DMA) transfer sequence in detail with system bus timing diagrams and DMA controller architecture. [BL: K4, CO: CO5, Marks: 13]
15. (b) Describe multicore processor interconnection topologies (Crossbar, Bus, Ring, Mesh) and snooping vs. directory-based coherence. [BL: K4, CO: CO5, Marks: 13]

PART C (15 MARKS - APPLICATION & DESIGN)
16. (a) Design an optimized memory hierarchy for a high-performance database server requiring 98% hit rates across L1, L2, L3 caches and virtual memory subsystems. [BL: K6, CO: CO4, Marks: 15]
16. (b) Perform architectural comparative analysis between superscalar execution, VLIW, and SIMD vector architectures for deep learning acceleration. [BL: K5, CO: CO3, Marks: 15]`,

  '24CS201': `ANNA UNIVERSITY / MSAJCE AUTONOMOUS
QUESTION BANK - 24CS201 DATA STRUCTURES AND ALGORITHMS
REGULATION 2024 (OBE FORMAT)

UNIT I: LINEAR DATA STRUCTURES - LISTS, STACKS & QUEUES
PART A (2 MARKS)
1. Differentiate between contiguous array and singly linked list representations with time complexity. [BL: K2, CO: CO1, Marks: 2]
2. Explain the push and pop operations on a stack with overflow and underflow conditions. [BL: K2, CO: CO1, Marks: 2]
3. What is a circular queue? How does it overcome memory wastage in standard linear queues? [BL: K2, CO: CO1, Marks: 2]
4. State applications of stack data structure in expression parsing and recursive call management. [BL: K1, CO: CO1, Marks: 2]

PART B (13 MARKS)
11. (a) Write algorithms for infix to postfix conversion and postfix evaluation using stacks with an illustrated trace table. [BL: K3, CO: CO1, Marks: 13]
11. (b) Implement a doubly linked list supporting insertion, deletion at arbitrary positions, and forward/backward traversal. [BL: K3, CO: CO1, Marks: 13]

UNIT II: NON-LINEAR DATA STRUCTURES - TREES & BINARY SEARCH TREES
PART A (2 MARKS)
5. Define complete binary tree and full binary tree with diagrams. [BL: K1, CO: CO2, Marks: 2]
6. Write recursive algorithms for Preorder, Inorder, and Postorder binary tree traversals. [BL: K2, CO: CO2, Marks: 2]
7. Explain the property of Binary Search Trees (BST) and average lookup complexity. [BL: K2, CO: CO2, Marks: 2]
8. What are AVL trees? State the balance factor condition and rotation types (LL, RR, LR, RL). [BL: K2, CO: CO2, Marks: 2]

PART B (13 MARKS)
12. (a) Construct an AVL tree by inserting the following sequence: 40, 20, 10, 25, 30, 22, 50, 60. Show rotations performed. [BL: K4, CO: CO2, Marks: 13]
12. (b) Describe B-Trees and B+ Trees indexing mechanisms used in database storage systems. [BL: K4, CO: CO2, Marks: 13]

UNIT III: GRAPHS & NETWORK ALGORITHMS
PART A (2 MARKS)
9. Differentiate between Adjacency Matrix and Adjacency List graph representations. [BL: K2, CO: CO3, Marks: 2]
10. Contrast Breadth-First Search (BFS) and Depth-First Search (DFS) traversal techniques. [BL: K2, CO: CO3, Marks: 2]
11. What is a Minimum Spanning Tree (MST)? State cut property. [BL: K1, CO: CO3, Marks: 2]
12. Define topological sorting for Directed Acyclic Graphs (DAG). [BL: K2, CO: CO3, Marks: 2]

PART B (13 MARKS)
13. (a) Explain Dijkstra's single-source shortest path algorithm and trace it on a weighted graph with non-negative edges. [BL: K4, CO: CO3, Marks: 13]
13. (b) Compare Prim's and Kruskal's minimum spanning tree algorithms with pseudo-code and cycle-detection mechanics. [BL: K4, CO: CO3, Marks: 13]

UNIT IV: ALGORITHM DESIGN TECHNIQUES - DIVIDE & CONQUER & DYNAMIC PROGRAMMING
PART A (2 MARKS)
13. State the Master Theorem for solving recurrence relations in Divide and Conquer algorithms. [BL: K2, CO: CO4, Marks: 2]
14. Explain the partition procedure in Quicksort algorithm and best/worst case runtimes. [BL: K2, CO: CO4, Marks: 2]
15. Contrast Memoization (top-down) with Tabulation (bottom-up) in Dynamic Programming. [BL: K2, CO: CO4, Marks: 2]
16. State the 0/1 Knapsack problem definition and why greedy choice fails. [BL: K2, CO: CO4, Marks: 2]

PART B (13 MARKS)
14. (a) Explain Merge Sort algorithm, derive its O(n log n) time complexity, and discuss external sorting suitability. [BL: K4, CO: CO4, Marks: 13]
14. (b) Solve the Longest Common Subsequence (LCS) problem for strings X = "ABCBDAB" and Y = "BDCABA" using dynamic programming. [BL: K4, CO: CO4, Marks: 13]

UNIT V: HASHING, HEAPS & ADVANCED DATA STRUCTURES
PART A (2 MARKS)
17. Explain collision resolution techniques in hashing: Linear Probing vs. Separate Chaining. [BL: K2, CO: CO5, Marks: 2]
18. Define Min-Heap and Max-Heap properties and state heapify operation time complexity. [BL: K1, CO: CO5, Marks: 2]
19. Differentiate between P, NP, NP-Complete, and NP-Hard complexity classes. [BL: K2, CO: CO5, Marks: 2]
20. What is amortized analysis? Explain using dynamic array resizing. [BL: K2, CO: CO5, Marks: 2]

PART B (13 MARKS)
15. (a) Explain Heap Sort algorithm in detail with max-heap construction and root extraction stages. [BL: K4, CO: CO5, Marks: 13]
15. (b) Describe Trie data structures for efficient dictionary lookup, prefix matching, and auto-complete indexing. [BL: K4, CO: CO5, Marks: 13]

PART C (15 MARKS - APPLICATION & DESIGN)
16. (a) Design a high-concurrency real-time ride-sharing dispatch system utilizing geospatial spatial index trees (Quadtrees / R-Trees) and priority queues. [BL: K6, CO: CO3, Marks: 15]
16. (b) Formulate an optimal memory caching architecture simulating Least Recently Used (LRU) eviction in O(1) time using hash tables and doubly linked lists. [BL: K6, CO: CO1, Marks: 15]`
};

/**
 * Automatically synthesizes curriculum-accurate questions when a subject has no questions in the bank
 */
export function synthesizeSubjectQuestions(subject: Subject, authorName: string = 'Autonomous System'): Question[] {
  const units = subject.units || [
    { unitNumber: 1, unitTitle: 'Fundamental Principles & Architecture' },
    { unitNumber: 2, unitTitle: 'Analysis & Computational Methods' },
    { unitNumber: 3, unitTitle: 'Design & Engineering Implementations' },
    { unitNumber: 4, unitTitle: 'System Integration & Performance' },
    { unitNumber: 5, unitTitle: 'Applications, Emerging Paradigms & Standards' },
  ];

  const generated: Question[] = [];

  units.forEach((u) => {
    const uNum = u.unitNumber;
    const title = u.unitTitle;

    // Part A Questions (4 per unit)
    const partATemplates = [
      { text: `Define the core principles of ${title} and state its engineering significance.`, bl: 'K1' as BloomsLevel, marks: 2 },
      { text: `Differentiate between conventional approaches and modern implementations in ${title}.`, bl: 'K2' as BloomsLevel, marks: 2 },
      { text: `State the mathematical formulation or governing model associated with ${title}.`, bl: 'K2' as BloomsLevel, marks: 2 },
      { text: `List three critical performance trade-offs encountered in ${title}.`, bl: 'K1' as BloomsLevel, marks: 2 },
    ];

    partATemplates.forEach((tpl, idx) => {
      generated.push({
        id: `${subject.code}-U${uNum}-A-${String(idx + 1).padStart(3, '0')}`,
        subjectCode: subject.code,
        unit: uNum,
        topic: title.split(':')[1]?.trim() || title,
        part: 'Part A',
        marks: tpl.marks,
        questionText: tpl.text,
        bloomsLevel: tpl.bl,
        co: `CO${uNum}`,
        pi: `${uNum}.1.1`,
        difficulty: 'Easy',
        allowedFor: {
          internal1: uNum <= 3,
          internal2: uNum >= 3,
          endSem: true,
        },
        usageHistory: { internal1: false, internal2: false, endSem: false, timesUsed: 0 },
        status: 'Approved',
        createdBy: authorName,
        createdDate: new Date().toISOString().split('T')[0],
      });
    });

    // Part B Questions (3 per unit)
    const partBTemplates = [
      { text: `Analyze the structural architecture and design framework of ${title} with neat technical diagrams.`, bl: 'K3' as BloomsLevel, marks: 13 },
      { text: `Derive the analytical equations or algorithmic workflow applicable to ${title}. Illustrate with a step-by-step numerical or case study.`, bl: 'K4' as BloomsLevel, marks: 13 },
      { text: `Critically evaluate optimization strategies and real-world deployment challenges in ${title}.`, bl: 'K4' as BloomsLevel, marks: 13 },
    ];

    partBTemplates.forEach((tpl, idx) => {
      generated.push({
        id: `${subject.code}-U${uNum}-B-${String(idx + 1).padStart(3, '0')}`,
        subjectCode: subject.code,
        unit: uNum,
        topic: title.split(':')[1]?.trim() || title,
        part: 'Part B',
        marks: tpl.marks,
        questionText: tpl.text,
        bloomsLevel: tpl.bl,
        co: `CO${uNum}`,
        pi: `${uNum}.2.1`,
        difficulty: 'Medium',
        allowedFor: {
          internal1: uNum <= 3,
          internal2: uNum >= 3,
          endSem: true,
        },
        usageHistory: { internal1: false, internal2: false, endSem: false, timesUsed: 0 },
        status: 'Approved',
        createdBy: authorName,
        createdDate: new Date().toISOString().split('T')[0],
      });
    });

    // Part C Question (1 for Unit 4 and 5)
    if (uNum >= 4) {
      generated.push({
        id: `${subject.code}-U${uNum}-C-001`,
        subjectCode: subject.code,
        unit: uNum,
        topic: `${title} Comprehensive Design`,
        part: 'Part C',
        marks: 15,
        questionText: `Design and formulate an end-to-end industrial-scale system incorporating concepts of ${title}. Provide architectural schemas, reliability metrics, and risk mitigation strategies.`,
        bloomsLevel: 'K6',
        co: `CO${uNum}`,
        pi: `${uNum}.3.1`,
        difficulty: 'Hard',
        allowedFor: { internal1: false, internal2: true, endSem: true },
        usageHistory: { internal1: false, internal2: false, endSem: false, timesUsed: 0 },
        status: 'Approved',
        createdBy: authorName,
        createdDate: new Date().toISOString().split('T')[0],
      });
    }
  });

  return generated;
}
