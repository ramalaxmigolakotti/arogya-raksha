/**
 * predictorDatasets.js
 * Loads all 9 predictor CSVs into memory once on startup.
 * Provides real statistics (patient count, column info) to enrich AI prompts.
 */

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const DATA_DIR = path.join(__dirname, '../data');

// Dataset configs: file → predictor id
const DATASET_MAP = {
  'predict_heart.csv':        'diabetes-heart',
  'predict_dengue.csv':       'dengue',
  'predict_kidney.csv':       'kidney',
  'predict_liver.csv':        'liver',
  'predict_lung.csv':         'lung',
  'predict_cancer.csv':       'cancer',
  'predict_thyroid.csv':      'thyroid',
  'predict_asthma.csv':       'asthma',
  'predict_mental_health.csv':'mental-health',
};

// Also include existing diabetes.csv for diabetes-heart
const EXTRA = {
  'diabetes.csv': 'diabetes-heart',
};

const stats = {}; // { predictorId: { rows, columns, sample } }
let loaded  = false;

function countCSVRows(filePath) {
  return new Promise((resolve) => {
    let count = 0;
    let header = null;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    rl.on('line', (line) => {
      if (!header) { header = line; return; }
      if (line.trim()) count++;
    });
    rl.on('close', () => resolve({ rows: count, header }));
    rl.on('error', () => resolve({ rows: 0, header: '' }));
  });
}

async function loadAll() {
  if (loaded) return stats;

  const allFiles = { ...DATASET_MAP, ...EXTRA };

  const promises = Object.entries(allFiles).map(async ([filename, predictorId]) => {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return;

    const { rows, header } = await countCSVRows(filePath);
    const columns = header ? header.split(',').map(c => c.trim()) : [];

    // Merge with existing (diabetes-heart has two files)
    if (!stats[predictorId]) {
      stats[predictorId] = { rows: 0, columns: [], files: [] };
    }
    stats[predictorId].rows    += rows;
    stats[predictorId].columns  = [...new Set([...stats[predictorId].columns, ...columns])];
    stats[predictorId].files.push(filename);
  });

  await Promise.all(promises);
  loaded = true;

  const total = Object.values(stats).reduce((s, v) => s + v.rows, 0);
  console.log(`[PredictorDatasets] ✅ Loaded stats for ${Object.keys(stats).length} predictors — ${total.toLocaleString()} total patient records`);

  return stats;
}

// Start loading in background
loadAll().catch(err => console.error('[PredictorDatasets] Load error:', err.message));

module.exports = { loadAll, getStats: () => stats };
