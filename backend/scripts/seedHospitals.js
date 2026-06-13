/**
 * Seed Supabase hospitals from EXISTING frontend dataset (48K hospitals)
 * + SUPPLEMENT with PMC Pune Infrastructure data (738 hospitals with beds/doctors)
 * + SUPPLEMENT with Geocoded Health Centres (200K+ with lat/lng across India)
 *
 * The frontend already has 48,583 hospitals in all-hospitals.json.
 * This seeder pushes that data to Supabase so the backend API also works.
 *
 * Run: node scripts/seedHospitals.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('../supabaseClient');

// ── CSV Parser ──
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

function* parseCSVStream(text) {
  const lines = text.split('\n');
  if (lines.length === 0) return;
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    yield row;
  }
}

function safeInt(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function extractDepartments(typeField) {
  const t = (typeField || '').toLowerCase();
  const deps = [];
  if (t.includes('maternity') || t.includes('mat+')) deps.push('Maternity', 'Gynecology');
  if (t.includes('general') || t.includes('gen')) deps.push('General Medicine');
  if (t.includes('ortho')) deps.push('Orthopedics');
  if (t.includes('pediatric') || t.includes('children')) deps.push('Pediatrics');
  if (t.includes('ent')) deps.push('ENT');
  if (t.includes('opth') || t.includes('eye')) deps.push('Ophthalmology');
  if (t.includes('cardio') || t.includes('heart')) deps.push('Cardiology');
  if (t.includes('speciality') || t.includes('multi')) deps.push('Multi-Specialty');
  if (t.includes('ayurved')) deps.push('Ayurveda');
  if (t.includes('homeo')) deps.push('Homeopathy');
  if (t.includes('surgical') || t.includes('surgery')) deps.push('Surgery');
  if (t.includes('derma') || t.includes('skin')) deps.push('Dermatology');
  if (deps.length === 0) deps.push('General Medicine');
  return [...new Set(deps)];
}

// ═══════════════════════════════════════════════════════
// STEP 1: Seed from existing frontend JSON (48K hospitals)
// ═══════════════════════════════════════════════════════
async function seedFromFrontendJSON() {
  console.log('📥 STEP 1: Loading existing frontend hospital dataset...');
  const jsonPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'data', 'hospitals', 'all-hospitals.json');

  if (!fs.existsSync(jsonPath)) {
    console.log('   ⚠️  all-hospitals.json not found in frontend/src/data/hospitals/');
    console.log('   Skipping frontend dataset. Will use CSV datasets only.');
    return 0;
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const hospitals = JSON.parse(raw);
  console.log(`   Found ${hospitals.length.toLocaleString()} hospitals in frontend dataset`);

  const records = hospitals.map(h => ({
    name: h.name || 'Unknown Hospital',
    address: h.address || '',
    city: h.district || '',
    state: h.state || '',
    pincode: h.pincode || null,
    phone: (h.phone && h.phone !== '0') ? h.phone : null,
    email: (h.email && h.email !== '0') ? h.email : null,
    website: h.website || null,
    type: h.operatorType === 'government' ? 'government' :
          h.type === 'clinic' ? 'clinic' : 'private',
    departments: h.specialty && h.specialty !== '0'
      ? h.specialty.split(';').map(s => s.trim()).filter(Boolean)
      : ['General Medicine'],
    facilities: ['General OPD'],
    emergency: h.emergency === true,
    ambulance: false,
    rating: (3.5 + Math.random() * 1.5).toFixed(1),
    total_beds: null,
    available_beds: null,
    location: (h.lat && h.lng) ? { coordinates: [h.lng, h.lat], type: 'Point' } : {},
  }));

  console.log('📤 Inserting into Supabase (this will take several minutes for 48K records)...');
  let inserted = 0;
  let failed = 0;
  const BATCH = 500;
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from('hospitals').insert(batch);
    if (error) {
      failed += batch.length;
      if ((i / BATCH) % 50 === 0 && !error.message.includes('duplicate')) {
        console.error(`\n   ❌ Batch at ${i}: ${error.message.slice(0, 80)}`);
      }
    } else {
      inserted += batch.length;
    }
    if ((i / BATCH) % 20 === 0 || i + BATCH >= records.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const pct = ((i + BATCH) / records.length * 100).toFixed(1);
      process.stdout.write(`\r   ✅ ${inserted.toLocaleString()} inserted | ${pct}% | ${elapsed}s`);
    }
  }
  console.log(`\n   Done: ${inserted.toLocaleString()} hospitals from frontend JSON`);
  return inserted;
}

// ═══════════════════════════════════════════════════════
// STEP 2: Supplement with PMC Pune Infrastructure (beds, doctors, nurses)
// ═══════════════════════════════════════════════════════
async function seedPMCInfrastructure() {
  console.log('\n📥 STEP 2: Loading PMC Pune hospital infrastructure data...');
  const csvPath = path.join(__dirname, '..', 'data', 'hospitals.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('   ⚠️  hospitals.csv not found. Skipping PMC data.');
    return { count: 0, doctorData: [] };
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const doctorData = [];
  const records = [];

  for (const r of parseCSVStream(raw)) {
    const beds = safeInt(r['Number of Beds in facility type']);
    const emergencyBeds = safeInt(r['Number of Beds in Emergency Wards']);
    const hasAmbulance = (r['Ambulance Service Available'] || '').toLowerCase();
    const pharmacy = (r['Pharmacy Available : Yes/No'] || '').toLowerCase();
    const doctorCount = safeInt(r['Number of Doctors / Physicians']);
    const nurseCount = safeInt(r['Number of Nurses']);
    const footfall = safeInt(r['Average Monthly Patient Footfall']);
    const cls = (r['Class : (Public / Private)'] || '').toLowerCase();

    const facilities = [];
    if (pharmacy === 'yes') facilities.push('Pharmacy');
    if (hasAmbulance === 'yes') facilities.push('Ambulance');
    if (emergencyBeds && emergencyBeds > 0) facilities.push('Emergency Ward');
    if (doctorCount && doctorCount > 5) facilities.push('Multi-Doctor');
    if (footfall && footfall > 5000) facilities.push('High Footfall');

    const hospitalName = r['Facility Name'] || 'Unknown Hospital';

    records.push({
      name: hospitalName,
      address: [r['Ward Name'], r['Zone Name']].filter(Boolean).join(', ') || 'Pune',
      city: r['City Name'] || 'Pune',
      state: 'Maharashtra',
      type: cls.includes('public') ? 'government' : 'private',
      departments: extractDepartments(r['Type  (Hospital / Nursing Home / Lab)']),
      facilities,
      emergency: (emergencyBeds && emergencyBeds > 0) || hasAmbulance === 'yes',
      ambulance: hasAmbulance === 'yes',
      total_beds: beds,
      available_beds: beds ? Math.floor(beds * 0.3) : null,
      rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      location: {},
    });

    if (doctorCount && doctorCount > 0) {
      doctorData.push({
        hospital_name: hospitalName,
        doctor_count: doctorCount,
        nurse_count: nurseCount,
        departments: extractDepartments(r['Type  (Hospital / Nursing Home / Lab)']),
        type: cls.includes('public') ? 'government' : 'private',
        footfall,
      });
    }
  }

  console.log(`   Found ${records.length} PMC hospitals, ${doctorData.length} with doctor counts`);

  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from('hospitals').insert(batch);
    if (error) {
      if (!error.message.includes('duplicate'))
        console.error(`   ❌ Batch failed:`, error.message.slice(0, 80));
    } else {
      inserted += batch.length;
    }
  }
  console.log(`   ✅ Inserted ${inserted} PMC hospitals (with bed/doctor data)`);
  return { count: inserted, doctorData };
}

// ═══════════════════════════════════════════════════════
// STEP 3: Supplement with Geocoded Health Centres (200K+)
// ═══════════════════════════════════════════════════════
async function seedGeocodedCentres() {
  console.log('\n📥 STEP 3: Loading geocoded health centres (200K+ facilities)...');
  const csvPath = path.join(__dirname, '..', 'data', 'health_centres.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('   ⚠️  health_centres.csv not found. Skipping.');
    return 0;
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const records = [];
  let total = 0;
  let skipped = 0;

  for (const r of parseCSVStream(raw)) {
    total++;
    if (r['ActiveFlag_C'] !== 'Y') { skipped++; continue; }

    const lat = parseFloat(r['Latitude']);
    const lng = parseFloat(r['Longitude']);
    const facilityType = (r['Facility Type'] || '').toLowerCase();
    const typeOfFacility = (r['Type Of Facility'] || '').toLowerCase();

    let type = 'clinic';
    if (typeOfFacility.includes('public')) type = 'government';
    else if (typeOfFacility.includes('private')) type = 'private';

    const departments = ['General Medicine'];
    if (facilityType.includes('chc')) departments.push('Community Health');
    if (facilityType.includes('phc')) departments.push('Primary Health');
    if (facilityType.includes('dh') || facilityType.includes('hospital')) departments.push('Multi-Specialty');

    const hasLocation = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

    records.push({
      name: r['Facility Name'] || 'Health Centre',
      address: [r['Facility Address'], r['Subdistrict Name']].filter(x => x && x !== 'NA').join(', ') || '',
      city: r['District Name'] || '',
      state: r['State Name'] || '',
      type,
      departments,
      facilities: ['General OPD'],
      emergency: facilityType.includes('dh') || facilityType.includes('hospital'),
      ambulance: facilityType.includes('dh'),
      rating: parseFloat((3.0 + Math.random() * 1.5).toFixed(1)),
      location: hasLocation ? { coordinates: [lng, lat], type: 'Point' } : {},
    });

    if (total % 50000 === 0) process.stdout.write(`\r   📊 Parsed ${total.toLocaleString()} rows...`);
  }

  console.log(`\n   Total rows: ${total.toLocaleString()} | Active: ${records.length.toLocaleString()} | Inactive: ${skipped.toLocaleString()}`);

  let inserted = 0;
  let failed = 0;
  const BATCH = 500;
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from('hospitals').insert(batch);
    if (error) {
      failed += batch.length;
    } else {
      inserted += batch.length;
    }
    if ((i / BATCH) % 40 === 0 || i + BATCH >= records.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const pct = ((i + BATCH) / records.length * 100).toFixed(1);
      process.stdout.write(`\r   ✅ ${inserted.toLocaleString()} inserted | ${pct}% | ${elapsed}s`);
    }
  }
  console.log(`\n   Done: ${inserted.toLocaleString()} geocoded health centres`);
  return inserted;
}

// ═══════════════════════════════════════════════════════
// STEP 4: Generate Doctors from PMC Hospital Data
// ═══════════════════════════════════════════════════════
async function seedDoctors(doctorData) {
  if (!doctorData || doctorData.length === 0) {
    console.log('\n   ⚠️  No PMC doctor data to seed.');
    return 0;
  }

  console.log(`\n👨‍⚕️ STEP 4: Generating doctor profiles from ${doctorData.length} hospitals...`);

  const { data: existingUser } = await supabase
    .from('users').select('id').eq('role', 'admin').limit(1).single();

  let systemUserId;
  if (existingUser) {
    systemUserId = existingUser.id;
  } else {
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ name: 'System Admin', email: 'system@arogyaraksha.in', password: 'system-seeded', role: 'admin' })
      .select('id').single();
    if (error) { console.error('   ❌ Could not create system user:', error.message); return 0; }
    systemUserId = newUser.id;
  }

  const specMap = {
    'Maternity': ['Gynecologist', 'Obstetrician'], 'Gynecology': ['Gynecologist'],
    'General Medicine': ['General Physician', 'MBBS'], 'Orthopedics': ['Orthopedic Surgeon'],
    'Pediatrics': ['Pediatrician'], 'ENT': ['ENT Specialist'], 'Ophthalmology': ['Ophthalmologist'],
    'Cardiology': ['Cardiologist'], 'Surgery': ['General Surgeon'], 'Dermatology': ['Dermatologist'],
    'Ayurveda': ['Ayurvedic Doctor', 'BAMS'], 'Homeopathy': ['Homeopathic Doctor', 'BHMS'],
    'Multi-Specialty': ['General Physician', 'Surgeon'],
  };
  const quals = ['MBBS', 'MD', 'MS', 'MBBS, MD', 'MBBS, MS', 'BAMS', 'BHMS'];
  const langs = [['English', 'Hindi', 'Marathi'], ['English', 'Hindi'], ['English', 'Marathi']];

  const doctors = [];
  let licenseId = 100001;

  for (const hosp of doctorData) {
    const numDocs = Math.min(hosp.doctor_count, 5);
    for (let d = 0; d < numDocs; d++) {
      const dept = hosp.departments[d % hosp.departments.length] || 'General Medicine';
      const specOptions = specMap[dept] || ['General Physician'];
      const spec = specOptions[d % specOptions.length];
      const exp = 5 + Math.floor(Math.random() * 25);
      const fee = hosp.type === 'government' ? (100 + Math.floor(Math.random() * 200)) : (300 + Math.floor(Math.random() * 1200));

      doctors.push({
        user_id: systemUserId,
        license_id: `PMC-${licenseId++}`,
        specialization: spec,
        qualification: quals[Math.floor(Math.random() * quals.length)],
        experience: exp,
        verified: true,
        consultation_fee: fee,
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        total_reviews: Math.floor(Math.random() * 200),
        languages: langs[Math.floor(Math.random() * langs.length)],
        bio: `${spec} with ${exp} years of experience at ${hosp.hospital_name}.`,
      });
    }
  }

  console.log(`   Generated ${doctors.length} doctor profiles`);
  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < doctors.length; i += BATCH) {
    const batch = doctors.slice(i, i + BATCH);
    const { error } = await supabase.from('doctors').insert(batch);
    if (!error) inserted += batch.length;
    else if (!error.message.includes('duplicate'))
      console.error(`   ❌:`, error.message.slice(0, 60));
  }
  console.log(`   ✅ Inserted ${inserted} doctors`);
  return inserted;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  AROGYA RAKSHA — HOSPITAL & DOCTOR SEEDER (FULL DATA)   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('💡 This seeder syncs your existing frontend data to Supabase');
  console.log('   and supplements it with PMC infrastructure + geocoded data.\n');

  const startTime = Date.now();

  try {
    const frontendCount = await seedFromFrontendJSON();
    const { count: pmcCount, doctorData } = await seedPMCInfrastructure();
    const geoCount = await seedGeocodedCentres();
    const doctorCount = await seedDoctors(doctorData);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`🎉 SEEDING COMPLETE in ${elapsed}s!`);
    console.log(`   📋 Frontend JSON hospitals:  ${frontendCount.toLocaleString()}`);
    console.log(`   🏥 PMC Pune infrastructure:  ${pmcCount}`);
    console.log(`   🏣 Geocoded health centres:  ${geoCount.toLocaleString()}`);
    console.log(`   👨‍⚕️ Generated doctors:         ${doctorCount}`);
    console.log(`   📊 TOTAL FACILITIES:          ${(frontendCount + pmcCount + geoCount).toLocaleString()}`);
    console.log('═'.repeat(55));
  } catch (err) {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  }
}

main();
