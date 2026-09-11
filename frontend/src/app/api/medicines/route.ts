import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stats = searchParams.get('stats');
  const letter = searchParams.get('letter');
  const q = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '24', 10);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // 1. Stats Request
  if (stats === 'true') {
    try {
      const statsMod = await import('@/data/medicines/medicine-stats.json');
      return NextResponse.json(statsMod.default || statsMod);
    } catch {
      return NextResponse.json({ totalMedicines: 246068, types: { allopathy: 246068 } });
    }
  }

  // 2. Letter Browsing Request (e.g., letter=A)
  if (letter && !q.trim()) {
    try {
      const cleanLetter = letter.trim().charAt(0).toUpperCase();
      let rawMeds: any[] = [];
      try {
        const mod = await import(`@/data/medicines/meds_${cleanLetter}.json`);
        rawMeds = mod.default || mod;
      } catch (err) {
        console.warn(`[API/medicines] Letter file meds_${cleanLetter}.json not loaded:`, err);
      }

      const total = rawMeds.length;
      const startIndex = (page - 1) * limit;
      const paged = rawMeds.slice(startIndex, startIndex + limit).map((m, idx) => formatMedicine(m, startIndex + idx));

      return NextResponse.json({
        success: true,
        total,
        count: paged.length,
        page,
        limit,
        medicines: paged,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message, medicines: [], total: 0 }, { status: 500 });
    }
  }

  // 3. Search Query Request (e.g., q=paracetamol)
  if (q.trim()) {
    const cleanQ = q.trim();

    // 3a. Try Render / backend search first
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
    } catch (err: any) {
      // Backend unavailable or timed out; seamlessly fall through to local dataset
    }

    // 3b. Fallback: Search in local letter JSON file
    try {
      const firstChar = cleanQ.charAt(0).toUpperCase();
      let localMeds: any[] = [];
      try {
        const mod = await import(`@/data/medicines/meds_${firstChar}.json`);
        localMeds = mod.default || mod;
      } catch {
        // First char might be a symbol or digit; fallback to 'A'
        try {
          const mod = await import('@/data/medicines/meds_A.json');
          localMeds = mod.default || mod;
        } catch {}
      }

      const qLower = cleanQ.toLowerCase();
      const matched = localMeds.filter((m: any) => {
        const name = (m.name || m.n || '').toLowerCase();
        const c1 = (m.composition1 || m.c1 || '').toLowerCase();
        const c2 = (m.composition2 || m.c2 || '').toLowerCase();
        const mfg = (m.manufacturer || m.m || '').toLowerCase();
        return name.includes(qLower) || c1.includes(qLower) || c2.includes(qLower) || mfg.includes(qLower);
      });

      const total = matched.length;
      const startIndex = (page - 1) * limit;
      const paged = matched.slice(startIndex, startIndex + limit).map((m, idx) => formatMedicine(m, startIndex + idx));

      return NextResponse.json({
        success: true,
        total,
        count: paged.length,
        page,
        limit,
        medicines: paged,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message, medicines: [], total: 0 }, { status: 500 });
    }
  }

  // 4. Fallback if no query or letter (default to letter 'A')
  try {
    const mod = await import('@/data/medicines/meds_A.json');
    const rawMeds = mod.default || mod;
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
  } catch (err: any) {
    return NextResponse.json({ success: false, total: 0, count: 0, medicines: [] });
  }
}
