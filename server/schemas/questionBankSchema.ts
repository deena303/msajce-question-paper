/**
 * Gemini Question Extraction Schema
 * Defines the exact JSON structure Gemini must return.
 * This is used as the responseSchema in the Gemini API call for structured output.
 */
export const EXTRACTION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    document: {
      type: 'object',
      properties: {
        subjectName: { type: 'string' },
        subjectCode: { type: 'string' },
        department: { type: 'string' },
        regulation: { type: 'string' },
        semester: { type: 'string' },
        totalUnitsDetected: { type: 'number' },
        totalPages: { type: 'number' },
        isScannedImageOnly: { type: 'boolean' }
      },
      required: ['subjectName', 'subjectCode', 'totalUnitsDetected', 'totalPages', 'isScannedImageOnly']
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionNumber: { type: 'string' },
          questionText: { type: 'string' },
          unit: { type: 'number' },
          unitTitle: { type: 'string' },
          part: { type: 'string', enum: ['A', 'B', 'C', 'Unknown'] },
          marks: { type: 'number' },
          markBreakdown: { type: 'string' },
          btl: { type: 'string' },
          co: { type: 'string' },
          pi: { type: 'string' },
          topic: { type: 'string' },
          difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
          isOrQuestion: { type: 'boolean' },
          orGroupId: { type: 'string' },
          orOption: { type: 'string', enum: ['A', 'B', 'C'] },
          subQuestions: { type: 'array', items: { type: 'string' } },
          ocrConfidence: { type: 'number' },
          sourcePage: { type: 'number' },
          sourcePageEnd: { type: 'number' }
        },
        required: ['questionText', 'unit', 'part', 'marks', 'ocrConfidence', 'sourcePage']
      }
    }
  },
  required: ['document', 'questions']
};

/**
 * The master extraction prompt sent to Gemini.
 * Instructs Gemini to act as an Anna University OBE academic document parser.
 */
export const EXTRACTION_PROMPT = `You are an expert academic document parser for Anna University / Autonomous College examination question banks following Outcome Based Education (OBE) standards.

Your task is to extract ALL questions from the provided PDF document into a structured JSON format.

EXTRACTION RULES:
1. Extract EVERY question verbatim — do not paraphrase, shorten, or omit any question.
2. Detect document metadata: subject name, subject code, department, regulation year, semester.
3. For each question, identify:
   - questionNumber: The numbering as shown (e.g. "1", "11.a", "11(b)", "16. a)")
   - questionText: The COMPLETE question text, including any sub-parts if not separately listed.
   - unit: Integer 1–5. Detect from "UNIT I", "UNIT 1", "Unit I", "Unit 1" headers.
   - unitTitle: The title of the detected unit (e.g. "Problem Solving & Search Strategies")
   - part: "A" (2 marks), "B" (13 marks), "C" (15 marks), or "Unknown"
   - marks: The mark value (2, 13, or 15 for standard format; detect from "(2)", "[13]", "(Marks: 13)" patterns)
   - markBreakdown: If a Part B or C question has sub-parts with mark splits, note as "5+8" or "7+6"
   - btl: Bloom's Taxonomy Level as written in document — "L1", "L2", "K1", "K2", or full words like "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"
   - co: Course Outcome — "CO1" through "CO6" (detect from "CO: CO2" or "CO2" patterns)
   - pi: Performance Indicator — e.g. "1.2.1" (detect from "PI: 1.2.1" patterns)
   - topic: The academic topic this question covers (short noun phrase, max 6 words)
   - difficulty: "Easy" for L1/L2/K1/K2, "Medium" for L3/L4/K3/K4, "Hard" for L5/L6/K5/K6
   - isOrQuestion: true if preceded by "OR" keyword
   - orGroupId: Group identifier for OR pairs (e.g. "Q11", "Q12") — both the question and its OR alternative get the same orGroupId
   - orOption: "A" for the first question in an OR group, "B" for the alternative
   - subQuestions: Array of sub-question texts if the main question has labeled parts (a), (b), (c)
   - ocrConfidence: Your confidence score 0–100 in the accuracy of this extraction
   - sourcePage: 1-indexed page number where the question appears
   - sourcePageEnd: Last page if question spans multiple pages (optional)

IMPORTANT PATTERNS TO DETECT:
- Part A = 2-mark short answer questions
- Part B = 13-mark or 16-mark long answer questions (may have OR alternatives)  
- Part C = 15-mark open-ended/case study questions (may have OR alternatives)
- OR questions: When you see "OR" between two questions, they form an OR group
- Inline tags like [BL: K2, CO: CO1, 1.2.1] or (K2)(CO1) must be parsed
- Marks in parentheses at end of question: "...(13)" or "[13 Marks]"

Return ALL questions found in the document without skipping any.`;
