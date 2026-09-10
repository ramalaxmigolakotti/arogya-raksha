import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const limit = searchParams.get('limit') || '10';
  const page = searchParams.get('page') || '1';

  if (!q.trim()) {
    return NextResponse.json({ success: true, count: 0, total: 0, medicines: [] });
  }

  try {
    // 1. First try Express backend running on port 5000
    const backendRes = await fetch(
      `http://localhost:5000/api/medicines/search?q=${encodeURIComponent(q)}&limit=${limit}&page=${page}`,
      { cache: 'no-store' }
    );
    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch (err: any) {
    console.warn('[API/medicines] Backend fetch failed, falling back to local search:', err.message);
  }

  // 2. Fallback: Search local JSON files in frontend/src/data/medicines
  try {
    const firstLetter = q.trim().charAt(0).toUpperCase();
    let localMeds: any[] = [];
    try {
      const mod = await import(`@/data/medicines/meds_${firstLetter}.json`);
      localMeds = mod.default || mod;
    } catch {
      // letter file not found or special character
    }

    const cleanQ = q.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matches = localMeds.filter((m: any) => {
      const cleanName = (m.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanGeneric = (m.generic_name || m.composition || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanName.includes(cleanQ) || cleanGeneric.includes(cleanQ);
    }).slice(0, parseInt(limit, 10));

    return NextResponse.json({
      success: true,
      count: matches.length,
      total: matches.length,
      medicines: matches,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, medicines: [] }, { status: 500 });
  }
}
