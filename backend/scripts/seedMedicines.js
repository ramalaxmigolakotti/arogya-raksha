/**
 * Seed ALL medicines into Supabase from EXISTING frontend dataset (246K medicines)
 * The frontend already has 246,068 medicines in src/data/medicines/meds_*.json
 * This seeder syncs that data to Supabase so backend API also works.
 *
 * Run: node scripts/seedMedicines.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('../supabaseClient');

// ── Categorize medicine based on composition ──
function categorize(name, composition, type) {
  const text = `${name} ${composition}`.toLowerCase();

  if (text.includes('paracetamol') || text.includes('ibuprofen') || text.includes('diclofenac') || text.includes('aceclofenac')) return 'Pain Relief';
  if (text.includes('amoxycillin') || text.includes('azithromycin') || text.includes('ciprofloxacin') || text.includes('cefixime') || text.includes('ofloxacin') || text.includes('levofloxacin') || text.includes('doxycycline') || text.includes('metronidazole')) return 'Antibiotics';
  if (text.includes('omeprazole') || text.includes('pantoprazole') || text.includes('rabeprazole') || text.includes('ranitidine')) return 'Gastro / Antacid';
  if (text.includes('metformin') || text.includes('glimepiride') || text.includes('insulin') || text.includes('sitagliptin')) return 'Diabetes';
  if (text.includes('amlodipine') || text.includes('atenolol') || text.includes('losartan') || text.includes('telmisartan') || text.includes('ramipril')) return 'Blood Pressure';
  if (text.includes('cetirizine') || text.includes('levocetirizine') || text.includes('fexofenadine') || text.includes('loratadine')) return 'Allergy';
  if (text.includes('salbutamol') || text.includes('montelukast') || text.includes('ambroxol') || text.includes('budesonide')) return 'Respiratory';
  if (text.includes('atorvastatin') || text.includes('rosuvastatin')) return 'Cholesterol';
  if (text.includes('vitamin') || text.includes('calcium') || text.includes('iron') || text.includes('folic') || text.includes('zinc') || text.includes('biotin')) return 'Vitamins & Supplements';
  if (text.includes('domperidone') || text.includes('ondansetron')) return 'Anti-nausea';
  if (text.includes('fluconazole') || text.includes('clotrimazole') || text.includes('itraconazole')) return 'Antifungal';
  if (text.includes('prednisolone') || text.includes('dexamethasone')) return 'Steroids';
  if (text.includes('sertraline') || text.includes('fluoxetine') || text.includes('escitalopram')) return 'Antidepressants';
  if (text.includes('aspirin') || text.includes('clopidogrel') || text.includes('warfarin')) return 'Blood Thinners';
  if (text.includes('gabapentin') || text.includes('pregabalin') || text.includes('levetiracetam')) return 'Neurology';
  if (text.includes('levothyroxine') || text.includes('thyroid')) return 'Thyroid';
  if (text.includes('cream') || text.includes('ointment') || text.includes('lotion') || text.includes('gel')) return 'Skin / Topical';
  if (text.includes('syrup') || text.includes('cough')) return 'Cough & Cold';
  if (type === 'Tablet') return 'General Tablets';
  if (type === 'Capsule') return 'General Capsules';
  if (type === 'Injection') return 'Injections';
  return 'General';
}

async function main() {
  console.log('💊 ═══ MEDICINE SEEDER (FROM FRONTEND 246K DATASET) ═══\n');

  // Load from frontend JSON files
  const medsDir = path.join(__dirname, '..', '..', 'frontend', 'src', 'data', 'medicines');
  if (!fs.existsSync(medsDir)) {
    console.error('❌ Frontend medicines directory not found at:', medsDir);
    console.log('   Expected: frontend/src/data/medicines/meds_*.json');
    process.exit(1);
  }

  // Read stats first
  const statsPath = path.join(medsDir, 'medicine-stats.json');
  if (fs.existsSync(statsPath)) {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    console.log(`   📊 Frontend dataset: ${stats.totalMedicines?.toLocaleString() || '?'} medicines`);
  }

  // Find all meds_*.json files
  const medFiles = fs.readdirSync(medsDir)
    .filter(f => f.startsWith('meds_') && f.endsWith('.json'))
    .sort();

  console.log(`   📁 Found ${medFiles.length} medicine files (A-Z)\n`);

  let totalInserted = 0;
  let totalFailed = 0;
  let totalProcessed = 0;
  const grandStartTime = Date.now();

  for (const file of medFiles) {
    const letter = file.replace('meds_', '').replace('.json', '');
    const filePath = path.join(medsDir, file);

    let meds;
    try {
      meds = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`   ❌ Failed to parse ${file}: ${e.message}`);
      continue;
    }

    if (!Array.isArray(meds) || meds.length === 0) continue;

    // Transform to Supabase format
    // Frontend format: { id, n (name), p (price), m (manufacturer), t (type), pk (packSize), c1 (comp1), c2 (comp2) }
    const records = meds.map(m => {
      const comp1 = m.c1 || '';
      const comp2 = m.c2 || '';
      const genericName = [comp1, comp2].filter(Boolean).join(' + ') || null;
      const price = parseFloat(m.p);

      return {
        name: m.n || 'Unknown',
        generic_name: genericName,
        category: categorize(m.n || '', genericName || '', m.t || ''),
        dosage: m.pk || null,
        market_price: (!isNaN(price) && price > 0) ? price : null,
        manufacturer: m.m || null,
        prescription_required: true,
        description: [
          genericName ? `Composition: ${genericName}` : '',
          m.pk ? `Pack: ${m.pk}` : '',
          m.m ? `By: ${m.m}` : '',
        ].filter(Boolean).join('. ') || null,
      };
    });

    // Batch insert
    let inserted = 0;
    let failed = 0;
    const BATCH = 500;

    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { error } = await supabase.from('medicines').insert(batch);
      if (error) {
        failed += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    totalInserted += inserted;
    totalFailed += failed;
    totalProcessed += records.length;

    const elapsed = ((Date.now() - grandStartTime) / 1000).toFixed(0);
    process.stdout.write(`\r   ✅ [${letter}] ${inserted.toLocaleString()}/${records.length.toLocaleString()} | Total: ${totalInserted.toLocaleString()} inserted | ${elapsed}s     `);
  }

  const totalElapsed = ((Date.now() - grandStartTime) / 1000).toFixed(0);
  console.log(`\n\n${'═'.repeat(55)}`);
  console.log(`🎉 MEDICINE SEEDING COMPLETE in ${totalElapsed}s!`);
  console.log(`   📊 Processed:  ${totalProcessed.toLocaleString()} medicines`);
  console.log(`   ✅ Inserted:   ${totalInserted.toLocaleString()}`);
  if (totalFailed > 0) console.log(`   ⚠️  Failed:     ${totalFailed.toLocaleString()}`);
  console.log('═'.repeat(55));
}

main();
