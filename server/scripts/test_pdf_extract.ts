import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import fs from 'fs';
import { extractQuestionsWithGemini } from '../services/geminiQuestionBankService';

async function testExtract() {
  const pdfPath = 'C:\\Users\\deena\\Downloads\\24AM411 - AI QB 2026-27 (1).pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('File does not exist:', pdfPath);
    return;
  }

  const pdfBuf = fs.readFileSync(pdfPath);
  console.log('PDF loaded, size:', pdfBuf.length, 'bytes');

  try {
    const result = await extractQuestionsWithGemini(pdfBuf, '24AM411 - AI QB 2026-27 (1).pdf');
    console.log('Extraction success!');
    console.log('Document metadata:', result.document);
    console.log('Total questions extracted:', result.questions.length);
    if (result.questions.length > 0) {
      console.log('First question sample:', {
        qNum: result.questions[0].questionNumber,
        unit: result.questions[0].unit,
        part: result.questions[0].part,
        marks: result.questions[0].marks,
        btl: result.questions[0].btl,
        text: result.questions[0].questionText.slice(0, 100) + '...'
      });
    }
  } catch (err: any) {
    console.error('Extraction failed:', err?.message || err);
  }
}

testExtract();
