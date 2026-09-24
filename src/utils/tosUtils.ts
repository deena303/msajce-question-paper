import { GeneratedPaper, PaperQuestionItem, TableOfSpecification, TosRow, BloomsLevel } from '../types';

export const BLOOMS_DIVISIONS: { level: BloomsLevel; division: string; shortCode: string }[] = [
  { level: 'K1', division: 'Remember (R)', shortCode: 'R' },
  { level: 'K2', division: 'Understand (U)', shortCode: 'U' },
  { level: 'K3', division: 'Apply (Ap)', shortCode: 'Ap' },
  { level: 'K4', division: 'Analyze (An)', shortCode: 'An' },
  { level: 'K5', division: 'Evaluate* (E)', shortCode: 'E' },
  { level: 'K6', division: 'Create* (C)', shortCode: 'C' }
];

/**
 * Normalizes any string representation of Blooms / RBT level into standard K1..K6
 */
export function normalizeBloomsLevel(level?: string | null): BloomsLevel {
  if (!level) return 'K2'; // Standard default
  const upper = level.trim().toUpperCase();
  if (upper.startsWith('K1') || upper.includes('REMEMBER') || upper === 'R') return 'K1';
  if (upper.startsWith('K2') || upper.includes('UNDERSTAND') || upper === 'U') return 'K2';
  if (upper.startsWith('K3') || upper.includes('APPLY') || upper === 'AP') return 'K3';
  if (upper.startsWith('K4') || upper.includes('ANALYZE') || upper === 'AN') return 'K4';
  if (upper.startsWith('K5') || upper.includes('EVALUATE') || upper === 'E') return 'K5';
  if (upper.startsWith('K6') || upper.includes('CREATE') || upper === 'C') return 'K6';
  return 'K2';
}

/**
 * Computes the official Table of Specification (TOS) matching EE3251 exam.docx
 * Dynamically aggregates actual question marks by RBT level across Part A, Part B, Part C.
 */
export function computeTableOfSpecification(paper: GeneratedPaper): TableOfSpecification {
  const partA = paper.partAQuestions || [];
  const partB = paper.partBQuestions || [];
  const partC = paper.partCQuestions || [];

  // Map to hold totals per BloomsLevel
  const marksPartA: Record<BloomsLevel, number> = { K1: 0, K2: 0, K3: 0, K4: 0, K5: 0, K6: 0 };
  const marksPartB: Record<BloomsLevel, number> = { K1: 0, K2: 0, K3: 0, K4: 0, K5: 0, K6: 0 };
  const marksPartC: Record<BloomsLevel, number> = { K1: 0, K2: 0, K3: 0, K4: 0, K5: 0, K6: 0 };

  // 1. Part A (Each question carries 2 marks)
  for (const item of partA) {
    const bl = normalizeBloomsLevel(item.question.bloomsLevel);
    marksPartA[bl] += (item.question.marks || 2);
  }

  // 2. Part B (Attempted questions: pick the primary option 'a' or first of each choiceGroup)
  // Each main question carries 13 marks
  const handledGroups = new Set<string>();
  for (const item of partB) {
    const groupKey = item.choiceGroup || item.questionNumber.replace(/[a-zA-Z\.\s\)]+/g, '');
    if (!handledGroups.has(groupKey)) {
      handledGroups.add(groupKey);
      const bl = normalizeBloomsLevel(item.question.bloomsLevel);
      marksPartB[bl] += (item.question.marks || 13);
    }
  }

  // 3. Part C (Attempted question: pick primary option 'a')
  // Carries 15 marks
  const handledPartCGroups = new Set<string>();
  for (const item of partC) {
    const groupKey = item.choiceGroup || 'Q16';
    if (!handledPartCGroups.has(groupKey)) {
      handledPartCGroups.add(groupKey);
      const bl = normalizeBloomsLevel(item.question.bloomsLevel);
      marksPartC[bl] += (item.question.marks || 15);
    }
  }

  let totalPartA = 0;
  let totalPartB = 0;
  let totalPartC = 0;

  (Object.keys(marksPartA) as BloomsLevel[]).forEach(k => { totalPartA += marksPartA[k]; });
  (Object.keys(marksPartB) as BloomsLevel[]).forEach(k => { totalPartB += marksPartB[k]; });
  (Object.keys(marksPartC) as BloomsLevel[]).forEach(k => { totalPartC += marksPartC[k]; });

  const grandTotal = totalPartA + totalPartB + totalPartC;

  const rows: TosRow[] = BLOOMS_DIVISIONS.map(div => {
    const pA = marksPartA[div.level];
    const pB = marksPartB[div.level];
    const pC = marksPartC[div.level];
    const tot = pA + pB + pC;
    const pct = grandTotal > 0 ? Math.round((tot / grandTotal) * 100) : 0;
    return {
      division: div.division,
      level: div.level,
      partA: pA,
      partB: pB,
      partC: pC,
      total: tot,
      percentage: pct
    };
  });

  return {
    rows,
    totalPartA,
    totalPartB,
    totalPartC,
    grandTotal
  };
}

/**
 * Generate HTML markup for the Table of Specification matching EE3251 reference document.
 */
export function generateTosHtml(tos: TableOfSpecification): string {
  return `
    <div class="tos-container" style="margin-top: 24px; page-break-inside: avoid;">
      <div style="font-weight: bold; font-size: 11pt; text-align: center; margin-bottom: 6px; text-transform: uppercase;">
        Table of Specification
      </div>
      <table class="tos-table" style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 5px 8px; text-align: left; width: 40%;">Blooms Taxonomy (BT) Divisions</th>
            <th style="border: 1px solid #000; padding: 5px 8px; text-align: center; width: 15%;">Part - A</th>
            <th style="border: 1px solid #000; padding: 5px 8px; text-align: center; width: 15%;">Part - B</th>
            <th style="border: 1px solid #000; padding: 5px 8px; text-align: center; width: 15%;">Part - C</th>
            <th style="border: 1px solid #000; padding: 5px 8px; text-align: center; width: 15%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${tos.rows.map(r => `
            <tr>
              <td style="border: 1px solid #000; padding: 4px 8px; font-weight: 500;">${r.division}</td>
              <td style="border: 1px solid #000; padding: 4px 8px; text-align: center;">${r.partA > 0 ? r.partA : ''}</td>
              <td style="border: 1px solid #000; padding: 4px 8px; text-align: center;">${r.partB > 0 ? r.partB : ''}</td>
              <td style="border: 1px solid #000; padding: 4px 8px; text-align: center;">${r.partC > 0 ? r.partC : ''}</td>
              <td style="border: 1px solid #000; padding: 4px 8px; text-align: center; font-weight: bold;">${r.total > 0 ? r.total : ''}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; background-color: #f8fafc;">
            <td style="border: 1px solid #000; padding: 5px 8px; text-align: left;">Total</td>
            <td style="border: 1px solid #000; padding: 5px 8px; text-align: center;">${tos.totalPartA}</td>
            <td style="border: 1px solid #000; padding: 5px 8px; text-align: center;">${tos.totalPartB}</td>
            <td style="border: 1px solid #000; padding: 5px 8px; text-align: center;">${tos.totalPartC}</td>
            <td style="border: 1px solid #000; padding: 5px 8px; text-align: center;">${tos.grandTotal}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size: 8pt; line-height: 1.35; color: #334155; margin-top: 4px;">
        <strong>Note:</strong> All the data entered in tabulation must be in terms of % of Revised Bloom’s Taxonomy level expected:<br>
        &bull; <strong>R/U:</strong> 30 to 45% of marks<br>
        &bull; <strong>U/Ap:</strong> 50 to 60% of marks<br>
        &bull; <strong>An / E / C:</strong> 16 to 20 % of marks. Depending upon the course, E / C can be incorporated. Normally except design course subject, it will contain only the first 4 levels of RBT.
      </div>
    </div>
  `;
}
