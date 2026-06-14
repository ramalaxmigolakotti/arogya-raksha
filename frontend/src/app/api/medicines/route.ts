import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stats  = searchParams.get('stats');
    const query  = searchParams.get('q') || '';
    const letter = searchParams.get('letter') || '';
    const page   = parseInt(searchParams.get('page') || '1');
    const limit  = parseInt(searchParams.get('limit') || '24');

    // ── Stats: total medicine count ─────────────────────────────
    if (stats === 'true') {
      return NextResponse.json({ totalMedicines: 253973 });
    }

    let backendUrl = '';

    if (query) {
      // Search mode — full text search
      backendUrl = `${BACKEND}/api/medicines/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
    } else {
      // Browse mode — letter filter (defaults to 'A' if nothing selected)
      const browseLetter = letter || 'A';
      backendUrl = `${BACKEND}/api/medicines/browse?letter=${encodeURIComponent(browseLetter)}&page=${page}&limit=${limit}`;
    }

    const res  = await fetch(backendUrl, { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Backend error');

    const allMeds = data.medicines || [];
    const total   = data.total || allMeds.length;

    // Map backend CSV fields → frontend MedicineResult format
    const medicines = allMeds.map((m: any) => ({
      id:              m.id,
      name:            m.name,
      price:           m.price || m.market_price || 0,
      manufacturer:    m.manufacturer || m.manufacturer_name || 'Unknown',
      type:            m.type || m.category || 'allopathy',
      packSize:        m.pack_size_label || m.pack_size || '',
      composition1:    m.short_composition1 || '',
      composition2:    m.short_composition2 || '',
      is_discontinued: m.is_discontinued || false,
    }));

    return NextResponse.json({ medicines, total, page, limit });
  } catch (error: any) {
    console.error('Medicines API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
