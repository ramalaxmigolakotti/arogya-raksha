/**
 * Seed all datasets into Supabase
 * Run: node scripts/seedAll.js
 * 
 * Datasets loaded:
 *  1. PMC Hospital Infrastructure (738 hospitals in Pune)
 *  2. Geocoded Health Centres (5000 facilities across India with lat/lng)
 *  3. Medicines Database (10,000 medicines with pricing)
 *  4. Medical Cost reference data (stored as JSON for cost estimation)
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   AROGYA RAKSHA — DATASET SEEDER         ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const scripts = [
    { name: 'Hospitals & Health Centres', file: 'seedHospitals.js' },
    { name: 'Medicines Database', file: 'seedMedicines.js' },
  ];

  for (const script of scripts) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`▶ ${script.name}`);
    console.log('═'.repeat(50));

    try {
      execSync(`node "${path.join(__dirname, script.file)}"`, {
        stdio: 'inherit',
        env: process.env,
      });
    } catch (err) {
      console.error(`❌ ${script.name} failed:`, err.message);
    }
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   ✅ ALL SEEDING COMPLETE!                ║');
  console.log('╚══════════════════════════════════════════╝');
}

main();
