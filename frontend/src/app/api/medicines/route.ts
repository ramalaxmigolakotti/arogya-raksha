import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to the medicines data directory (works on both local & Vercel)
const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'medicines');

function formatMedicine(m: any, index?: number) {
  return {
    id: m.id ?? index ?? Math.floor(Math.random() * 1000000),
    name: m.name || m.n || 'Medicine',
    price: m.price ? String(m.price) : (m.p ? String(m.p) : '99.00'),
    manufacturer: m.manufacturer || m.m || 'Standard Pharma',
    type: m.type || m.t || 'allopathy',
    packSize: m.packSize || m.pk || '1 Strip',
    composition1: m.composition1 || m.c1 || '',
    composition2: m.composition2 || m.c2 || '',
  };
}

function readJsonFile(filePath: string): any[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function readLetterFile(letter: string): any[] {
  const cleanLetter = (letter || 'A').trim().charAt(0).toUpperCase();
  const filePath = path.join(DATA_DIR, `meds_${cleanLetter}.json`);
  return readJsonFile(filePath);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stats = searchParams.get('stats');
  const letter = searchParams.get('letter');
  const q = searchParams.get('q') || '';
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // ── 1. Stats request ─────────────────────────────────────────────────────
  if (stats === 'true') {
    try {
      const statsPath = path.join(DATA_DIR, 'medicine-stats.json');
      const statsData = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
      return NextResponse.json(statsData);
    } catch {
      return NextResponse.json({ totalMedicines: 246068, types: { allopathy: 246068 } });
    }
  }

  // ── 2. Letter browsing (e.g. letter=A) ───────────────────────────────────
  if (letter && !q.trim()) {
    const rawMeds = readLetterFile(letter);
    const total = rawMeds.length;
    const startIndex = (page - 1) * limit;
    const paged = rawMeds
      .slice(startIndex, startIndex + limit)
      .map((m, idx) => formatMedicine(m, startIndex + idx));

    return NextResponse.json({
      success: true,
      total,
      count: paged.length,
      page,
      limit,
      medicines: paged,
    });
  }

  // ── 3. Search query ───────────────────────────────────────────────────────
  if (q.trim()) {
    const cleanQ = q.trim();

    // 3a. Try the Render backend first (has full-text search)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://arogya-raksha-n89v.onrender.com';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const backendRes = await fetch(
        `${backendUrl}/api/medicines/search?q=${encodeURIComponent(cleanQ)}&limit=${limit}&page=${page}`,
        { cache: 'no-store', signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const data = await backendRes.json();
        if (data.medicines && data.medicines.length > 0) {
          return NextResponse.json({
            success: true,
            total: data.total || data.medicines.length,
            count: data.medicines.length,
            medicines: data.medicines.map((m: any, idx: number) => formatMedicine(m, idx)),
          });
        }
      }
    } catch {
      // Backend unavailable or timed out — fall through to local dataset
    }

    // 3b. Local dataset fallback — search letter file for first character
    const firstChar = cleanQ.charAt(0).toUpperCase();
    let localMeds = readLetterFile(firstChar);

    // If nothing found via first char, also try searching other letters for cross-letter queries
    if (localMeds.length === 0) {
      localMeds = readLetterFile('A');
    }

    const qLower = cleanQ.toLowerCase();
    const matched = localMeds.filter((m: any) => {
      const name = (m.name || m.n || '').toLowerCase();
      const c1   = (m.composition1 || m.c1 || '').toLowerCase();
      const c2   = (m.composition2 || m.c2 || '').toLowerCase();
      const mfg  = (m.manufacturer || m.m || '').toLowerCase();
      return name.includes(qLower) || c1.includes(qLower) || c2.includes(qLower) || mfg.includes(qLower);
    });

    const total = matched.length;
    const startIndex = (page - 1) * limit;
    const paged = matched
      .slice(startIndex, startIndex + limit)
      .map((m, idx) => formatMedicine(m, startIndex + idx));

    return NextResponse.json({
      success: true,
      total,
      count: paged.length,
      page,
      limit,
      medicines: paged,
    });
  }

  // ── 4. No params — default to letter A ───────────────────────────────────
  const rawMeds = readLetterFile('A');
  const total = rawMeds.length;
  const paged = rawMeds.slice(0, limit).map((m: any, idx: number) => formatMedicine(m, idx));

  return NextResponse.json({
    success: true,
    total,
    count: paged.length,
    page: 1,
    limit,
    medicines: paged,
  });
}
