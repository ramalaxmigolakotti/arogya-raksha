import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const limit = searchParams.get('limit') || '20';

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const params = new URLSearchParams({ q, limit });
    if (lat) params.set('lat', lat);
    if (lng) params.set('lng', lng);

    const res = await fetch(`${backendUrl}/api/hospitals?${params}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
