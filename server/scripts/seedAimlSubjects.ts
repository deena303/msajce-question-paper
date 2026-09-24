/**
 * Seed Script: Configures the 6 official AIML 3rd Year subjects for 2024-2028 in Supabase.
 * Safe and idempotent — updates existing matching subjects, deactivates non-matching AIML subjects,
 * and leaves all other departments/years completely untouched.
 *
 * Run with: npx tsx server/scripts/seedAimlSubjects.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

const OFFICIAL_SUBJECTS = [
  { code: '24AM411', name: 'Artificial Intelligence', semester: 'IV', regulation: 'Regulation 2024' },
  { code: '24AM511', name: 'Machine Learning', semester: 'V', regulation: 'Regulation 2024' },
  { code: '24AD512', name: 'Data Exploration and Visualization', semester: 'V', regulation: 'Regulation 2024' },
  { code: '24CS514', name: 'Computer Networks', semester: 'V', regulation: 'Regulation 2024' },
  { code: '24CS411', name: 'Operating System', semester: 'IV', regulation: 'Regulation 2024' },
  { code: '24EC412', name: 'Microcontroller and Interface', semester: 'IV', regulation: 'Regulation 2024' },
];

async function seed() {
  console.log('\n🚀 Starting AIML 3rd Year Subject Configuration...');
  console.log('───────────────────────────────────────────────────────');

  // 1. Locate AIML Department
  const { data: depts, error: deptErr } = await client
    .from('departments')
    .select('id, department_code, department_name')
    .eq('department_code', 'AIML');

  if (deptErr || !depts || depts.length === 0) {
    throw new Error(`AIML department not found: ${deptErr?.message || 'Empty'}`);
  }
  const aimlDept = depts[0];
  console.log(`✅ Found Department: ${aimlDept.department_name} (${aimlDept.department_code}) [ID: ${aimlDept.id}]`);

  // 2. Locate 2024-2028 Academic Year
  const { data: years, error: yearErr } = await client
    .from('academic_years')
    .select('id, year_label')
    .eq('year_label', '2024-2028');

  if (yearErr || !years || years.length === 0) {
    throw new Error(`Academic year 2024-2028 not found: ${yearErr?.message || 'Empty'}`);
  }
  const acadYear = years[0];
  console.log(`✅ Found Academic Year: ${acadYear.year_label} [ID: ${acadYear.id}]`);

  // 3. Deactivate any existing subjects under AIML / 2024-2028 that are NOT in the 6 official subjects
  const officialCodes = OFFICIAL_SUBJECTS.map(s => s.code);
  const { data: existingAimlSubs, error: listErr } = await client
    .from('subjects')
    .select('id, subject_code, subject_name, status')
    .eq('department_id', aimlDept.id)
    .eq('academic_year_id', acadYear.id);

  if (listErr) {
    console.warn('⚠️ Could not list existing subjects:', listErr.message);
  } else if (existingAimlSubs && existingAimlSubs.length > 0) {
    const toDeactivate = existingAimlSubs.filter(s => !officialCodes.includes(s.subject_code));
    for (const sub of toDeactivate) {
      if (sub.status !== 'inactive') {
        const { error: deactErr } = await client
          .from('subjects')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('id', sub.id);
        if (deactErr) {
          console.warn(`⚠️ Failed to deactivate old subject ${sub.subject_code}:`, deactErr.message);
        } else {
          console.log(`🔒 Deactivated old subject: ${sub.subject_code} - ${sub.subject_name}`);
        }
      }
    }
  }

  // 4. Upsert the 6 official subjects
  console.log('\n📝 Upserting 6 Official AIML Subjects:');
  const configuredSubs = [];

  for (const item of OFFICIAL_SUBJECTS) {
    // Check if record exists
    const { data: existing } = await client
      .from('subjects')
      .select('id, subject_code, subject_name, status')
      .eq('department_id', aimlDept.id)
      .eq('academic_year_id', acadYear.id)
      .eq('subject_code', item.code)
      .maybeSingle();

    if (existing) {
      // Update
      const { data: updated, error: updateErr } = await client
        .from('subjects')
        .update({
          subject_name: item.name,
          semester: item.semester,
          regulation: item.regulation,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) {
        console.error(`❌ Failed to update ${item.code}:`, updateErr.message);
      } else {
        console.log(`  ✅ Updated: ${item.code} — ${item.name} (Active) [ID: ${updated.id}]`);
        configuredSubs.push(updated);
      }
    } else {
      // Insert
      const { data: inserted, error: insertErr } = await client
        .from('subjects')
        .insert({
          subject_code: item.code,
          subject_name: item.name,
          department_id: aimlDept.id,
          academic_year_id: acadYear.id,
          semester: item.semester,
          regulation: item.regulation,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertErr) {
        console.error(`❌ Failed to insert ${item.code}:`, insertErr.message);
      } else {
        console.log(`  ✨ Inserted: ${item.code} — ${item.name} (Active) [ID: ${inserted.id}]`);
        configuredSubs.push(inserted);
      }
    }
  }

  // 5. Final Verification Query
  console.log('\n🔍 Verifying Active AIML Subjects in Database:');
  const { data: verified, error: verifyErr } = await client
    .from('subjects')
    .select('id, subject_code, subject_name, semester, regulation, status')
    .eq('department_id', aimlDept.id)
    .eq('academic_year_id', acadYear.id)
    .eq('status', 'active')
    .order('subject_code');

  if (verifyErr) {
    console.error('❌ Verification failed:', verifyErr.message);
  } else {
    console.table(verified);
    console.log(`\n🎉 Total Active Subjects for AIML (2024-2028): ${verified?.length} / 6`);
    if (verified?.length === 6) {
      console.log('✅ Configuration successfully verified in Supabase!');
    } else {
      console.warn('⚠️ Warning: Expected 6 active subjects, but found', verified?.length);
    }
  }
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
