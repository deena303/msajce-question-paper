import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { GoogleGenAI } from '@google/genai';

async function test() {
  const key = process.env.GEMINI_API_KEY;
  console.log('Testing key presence:', Boolean(key), 'length:', key?.length);
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const res = await ai.models.get({ model: 'gemini-3.6-flash' });
    console.log('Direct get gemini-3.6-flash OK:', res.name);
  } catch (e: any) {
    console.error('get error:', e.status, e.message);
  }
}

test();
