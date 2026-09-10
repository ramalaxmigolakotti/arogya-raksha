import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface HospitalRaw {
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  type?: string;
  operator?: string;
  operatorType?: string;
  phone?: string;
  email?: string;
  website?: string;
  emergency?: boolean | string;
  specialty?: string;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
  beds?: number;
  source?: string;
}

let cachedHospitals: HospitalRaw[] | null = null;

function loadHospitals(): HospitalRaw[] {
  if (cachedHospitals && cachedHospitals.length > 0) return cachedHospitals;
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'hospitals', 'all-hospitals.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      cachedHospitals = JSON.parse(content);
      return cachedHospitals || [];
    }
  } catch (err) {
    console.error('Failed to load hospitals dataset:', err);
  }
  return [];
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius');
    const type = (searchParams.get('type') || '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 250);

    const all = loadHospitals();
    if (!all || all.length === 0) {
      return NextResponse.json({ success: true, count: 0, hospitals: [] });
    }

    const lat = latStr ? parseFloat(latStr) : null;
    const lng = lngStr ? parseFloat(lngStr) : null;
    const requestedRadius = radiusStr ? parseFloat(radiusStr) : 15; // default 15km

    let results: (HospitalRaw & { distance?: number })[] = [];

    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      const withDistance: { hospital: HospitalRaw; distance: number }[] = [];
      for (let i = 0; i < all.length; i++) {
        const h = all[i];
        if (!h.lat || !h.lng) continue;

        // Type filter if requested
        if (type && type !== 'all') {
          const hType = (h.type || '').toLowerCase();
          const matchesType =
            type === 'hospital'
              ? (hType.includes('hosp') || hType.includes('general') || hType.includes('government') || hType.includes('private') || !hType)
              : type === 'clinic'
              ? (hType.includes('clinic') || hType.includes('centre') || hType.includes('dispensary') || hType.includes('phc'))
              : type === 'pharmacy'
              ? (hType.includes('pharmacy') || hType.includes('chemist'))
              : hType.includes(type);
          if (!matchesType) continue;
        }

        // Text query if provided
        if (q) {
          const name = (h.name || '').toLowerCase();
          const addr = (h.address || '').toLowerCase();
          const dist = (h.district || '').toLowerCase();
          const state = (h.state || '').toLowerCase();
          const spec = (h.specialty || '').toLowerCase();
          if (!name.includes(q) && !addr.includes(q) && !dist.includes(q) && !state.includes(q) && !spec.includes(q)) {
            continue;
          }
        }

        const d = haversineDistance(lat, lng, h.lat, h.lng);
        withDistance.push({ hospital: h, distance: d });
      }

      // Sort by distance
      withDistance.sort((a, b) => a.distance - b.distance);

      // Filter within radius, expanding dynamically if too few
      let filtered = withDistance.filter(item => item.distance <= requestedRadius);
      if (filtered.length < 12 && withDistance.length > 0) {
        filtered = withDistance.slice(0, Math.max(15, filtered.length));
      }

      results = filtered.slice(0, limit).map(item => ({
        ...item.hospital,
        distance: Math.round(item.distance * 10) / 10,
      }));
    } else {
      let filtered = all;
      if (type && type !== 'all') {
        filtered = filtered.filter(h => {
          const hType = (h.type || '').toLowerCase();
          return type === 'hospital'
            ? (hType.includes('hosp') || hType.includes('general') || hType.includes('government') || hType.includes('private') || !hType)
            : type === 'clinic'
            ? (hType.includes('clinic') || hType.includes('centre') || hType.includes('dispensary'))
            : type === 'pharmacy'
            ? (hType.includes('pharmacy') || hType.includes('chemist'))
            : hType.includes(type);
        });
      }
      if (q) {
        filtered = filtered.filter(h => {
          const name = (h.name || '').toLowerCase();
          const addr = (h.address || '').toLowerCase();
          const dist = (h.district || '').toLowerCase();
          const state = (h.state || '').toLowerCase();
          const spec = (h.specialty || '').toLowerCase();
          return name.includes(q) || addr.includes(q) || dist.includes(q) || state.includes(q) || spec.includes(q);
        });
      }
      results = filtered.slice(0, limit);
    }

    return NextResponse.json(
      {
        success: true,
        count: results.length,
        hospitals: results,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, hospitals: [] }, { status: 500 });
  }
}
