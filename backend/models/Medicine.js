/**
 * Medicine.js — CSV-based medicine search (no Supabase)
 * 
 * Loads the A_Z_medicines_dataset_of_India.csv into memory once on startup.
 * Provides fast in-memory search across 250k+ medicines.
 *
 * CSV columns:
 *   id, name, price(₹), Is_discontinued, manufacturer_name,
 *   type, pack_size_label, short_composition1, short_composition2
 */

const fs   = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_PATH = path.join(__dirname, '../data/medicines.csv');

// In-memory store
let medicines = [];
let loaded    = false;
let loading   = false;
let loadError = null;

// ── Parse a CSV line respecting quoted fields ────────────────
function parseCSVLine(line) {
  const fields = [];
  let current  = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ── Load CSV into memory ─────────────────────────────────────
function loadCSV() {
  return new Promise((resolve, reject) => {
    if (loaded)  return resolve(medicines);
    if (loading) {
      // Wait for existing load to finish
      const wait = () => {
        if (loaded)    return resolve(medicines);
        if (loadError) return reject(loadError);
        setTimeout(wait, 100);
      };
      return wait();
    }

    loading = true;
    console.log('[Medicine] Loading CSV from disk…');

    const rl = readline.createInterface({
      input:     fs.createReadStream(CSV_PATH, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    let header  = null;
    let rowCount = 0;

    rl.on('line', (line) => {
      if (!line.trim()) return;

      const fields = parseCSVLine(line);

      if (!header) {
        // First line is header — normalise column names
        header = fields.map(h =>
          h.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
        );
        return;
      }

      const raw = {};
      header.forEach((col, i) => { raw[col] = fields[i] || ''; });

      // Map to a clean object
      const med = {
        id:               parseInt(raw.id) || rowCount,
        name:             raw.name || '',
        price:            parseFloat(raw.price) || 0,
        market_price:     parseFloat(raw.price) || 0,
        is_discontinued:  (raw.is_discontinued || '').toLowerCase() === 'true',
        manufacturer:     raw.manufacturer_name || '',
        manufacturer_name:raw.manufacturer_name || '',
        type:             raw.type || 'allopathy',
        category:         raw.type || 'allopathy',
        pack_size:        raw.pack_size_label || '',
        pack_size_label:  raw.pack_size_label || '',
        // Combine both compositions as generic_name
        generic_name: [raw.short_composition1, raw.short_composition2]
          .filter(Boolean).join(' + ').trim(),
        short_composition1: raw.short_composition1 || '',
        short_composition2: raw.short_composition2 || '',
      };

      if (med.name) {
        medicines.push(med);
        rowCount++;
      }
    });

    rl.on('close', () => {
      loaded  = true;
      loading = false;
      console.log(`[Medicine] ✅ Loaded ${medicines.length.toLocaleString()} medicines from CSV`);
      resolve(medicines);
    });

    rl.on('error', (err) => {
      loadError = err;
      loading   = false;
      console.error('[Medicine] ❌ CSV load error:', err.message);
      reject(err);
    });
  });
}

// ── Start loading in background when module is required ──────
loadCSV().catch(err => console.error('[Medicine] Background load failed:', err.message));

// ── Helpers ──────────────────────────────────────────────────
function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function compact(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesQuery(med, q) {
  const lq = normalize(q);
  const cq = compact(q);
  const cn = compact(med.name);
  const cg = compact(med.generic_name);
  return (
    normalize(med.name).includes(lq) ||
    normalize(med.generic_name).includes(lq) ||
    (cq.length >= 2 && (cn.includes(cq) || cg.includes(cq))) ||
    normalize(med.manufacturer).includes(lq) ||
    normalize(med.category).includes(lq) ||
    normalize(med.short_composition1).includes(lq) ||
    normalize(med.short_composition2).includes(lq)
  );
}

// ── Public API (mirrors old Supabase model) ──────────────────
const Medicine = {

  async search(query, limit = 30) {
    await loadCSV();
    const lq = normalize(query);

    // Prioritise name-starts-with matches, then contains
    const startsWith = [];
    const contains   = [];

    for (const med of medicines) {
      if (!med.name) continue;
      const nameLower = normalize(med.name);

      if (nameLower.startsWith(lq)) {
        startsWith.push(med);
      } else if (matchesQuery(med, lq)) {
        contains.push(med);
      }

      if (startsWith.length + contains.length >= limit * 3) break;
    }

    return [...startsWith, ...contains].slice(0, limit);
  },

  // Paginated search — returns { total, medicines }
  async searchPaginated(query, page = 1, limit = 24) {
    await loadCSV();
    const lq = normalize(query);
    const startsWith = [];
    const contains   = [];

    for (const med of medicines) {
      if (!med.name) continue;
      const nameLower = normalize(med.name);
      if (nameLower.startsWith(lq))    startsWith.push(med);
      else if (matchesQuery(med, lq))  contains.push(med);
    }

    const all    = [...startsWith, ...contains];
    const total  = all.length;
    const offset = (page - 1) * limit;
    return { total, medicines: all.slice(offset, offset + limit) };
  },

  // Browse all medicines by first letter, sorted A-Z, paginated
  async browse(letter = 'A', page = 1, limit = 24) {
    await loadCSV();
    const ltr = (letter || 'A').toUpperCase();

    const filtered = medicines
      .filter(m => m.name && m.name.toUpperCase().startsWith(ltr))
      .sort((a, b) => a.name.localeCompare(b.name));

    const total  = filtered.length;
    const offset = (page - 1) * limit;
    return { total, medicines: filtered.slice(offset, offset + limit) };
  },

  async findByName(name) {
    await loadCSV();
    const lq = normalize(name);
    return medicines.find(m => normalize(m.name) === lq)
        || medicines.find(m => normalize(m.name).includes(lq))
        || null;
  },

  async findByCategory(category, limit = 50) {
    await loadCSV();
    const lq = normalize(category);
    return medicines
      .filter(m => normalize(m.category).includes(lq))
      .slice(0, limit);
  },

  async findAlternatives(medicineName, limit = 10) {
    await loadCSV();
    const original = await Medicine.findByName(medicineName);
    if (!original || !original.generic_name) return [];

    const mainGeneric = normalize(original.generic_name.split('+')[0].split('(')[0]);

    return medicines
      .filter(m => m.id !== original.id && normalize(m.generic_name).includes(mainGeneric))
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);
  },

  async getCategories() {
    await loadCSV();
    const counts = {};
    for (const m of medicines) {
      const cat = m.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  },

  async count() {
    await loadCSV();
    return medicines.length;
  },

  // Expose raw for diagnostics
  isLoaded() { return loaded; },
};

module.exports = Medicine;
