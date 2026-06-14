# 🏥 Arogya Raksha — Complete Documentation

> **Part 4 of 5** | Feature #4: Hospital Discovery & Interactive Maps

---

## Feature 4: 🏥 Hospital Discovery & Interactive Map

### Overview

The Hospital Discovery system is Arogya Raksha's **largest dataset feature** — 249,756 health facilities across India displayed on an interactive Leaflet.js map with GPS-based proximity search, type filtering, and real-time directions.

---

### 4.1 What It Does

| Capability | Description |
|---|---|
| **Interactive Map** | Leaflet.js + OpenStreetMap with 249K+ hospital markers |
| **GPS Proximity Search** | Find hospitals within configurable radius (1-50 km) |
| **Type Filtering** | Government, Private, PHC, CHC, Sub-Centre, Clinic |
| **Real-time Directions** | Google Maps integration for turn-by-turn navigation |
| **Contact Information** | Phone, email, website for each facility |
| **Facility Details** | Departments, bed count, emergency availability, ambulance |

---

### 4.2 Database — 249,756 Facilities

**Table:** `hospitals` (Supabase PostgreSQL)

```sql
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  type TEXT DEFAULT 'private',  -- 'government' | 'private' | 'clinic'
  departments TEXT[] DEFAULT '{}',
  facilities TEXT[] DEFAULT '{}',
  emergency BOOLEAN DEFAULT false,
  ambulance BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  total_beds INTEGER,
  available_beds INTEGER,
  image TEXT,
  location JSONB DEFAULT '{}',  -- { lat: 17.385, lng: 78.486 }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Performance Indexes:**
```sql
-- Geolocation search (latitude/longitude)
CREATE INDEX idx_hospitals_location ON hospitals USING GIN(location);

-- Full-text search on hospital names
CREATE INDEX idx_hospitals_name_fts ON hospitals USING GIN(
  to_tsvector('english', coalesce(name, ''))
);
```

---

### 4.3 Data Sources — 3 Combined Datasets

**File:** `backend/scripts/seedHospitals.js` (17,746 bytes — largest seeder)

```
┌────────────────────────────────────────────────────────┐
│              Hospital Data Pipeline                     │
│                                                        │
│  Source 1: JSON Hospital Database                      │
│  ├── Major hospitals with full details                 │
│  ├── Departments, bed counts, ratings                  │
│  └── ~10,000 records                                   │
│                                                        │
│  Source 2: PMC Infrastructure Data                      │
│  ├── Public Medical College hospitals                   │
│  ├── Government facilities with geocoding              │
│  └── ~40,000 records                                   │
│                                                        │
│  Source 3: Geocoded Health Centres                      │
│  ├── Primary Health Centres (PHC)                      │
│  ├── Community Health Centres (CHC)                     │
│  ├── Sub-Centres, District Hospitals                   │
│  └── ~200,000 records                                  │
│                                                        │
│  Total: 249,756 unique facilities                      │
│                                                        │
│  Seeder Features:                                      │
│  • Batch processing: 500-1000 records/batch            │
│  • Duplicate detection: upsert on name+address         │
│  • Progress logging: "45% complete (112,000/249,756)"  │
│  • Error recovery: continues on individual failures    │
│  • Idempotent: safe to re-run                          │
└────────────────────────────────────────────────────────┘
```

---

### 4.4 Interactive Map Architecture

```
┌──────────────────────────────────────────────┐
│          Hospital Finder Page                 │
│          /dashboard/hospitals                 │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │        Leaflet.js Map                  │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │                                  │  │  │
│  │  │    🏥 Hospital Markers           │  │  │
│  │  │    📍 User Location (GPS)        │  │  │
│  │  │    🔵 Search Radius Circle       │  │  │
│  │  │                                  │  │  │
│  │  │    OpenStreetMap Tiles            │  │  │
│  │  │                                  │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐  │
│  │ Radius:  │ │ Type:     │ │ Emergency: │  │
│  │ [5 km ▾] │ │ [All ▾]   │ │ [✓] Only   │  │
│  └──────────┘ └───────────┘ └────────────┘  │
│                                              │
│  Hospital List (scrollable):                 │
│  ┌────────────────────────────────────────┐  │
│  │ 🏥 Apollo Hospital — 1.2 km           │  │
│  │    Type: Private | Emergency: ✅       │  │
│  │    [Directions] [Call] [Details]       │  │
│  ├────────────────────────────────────────┤  │
│  │ 🏥 Govt District Hospital — 2.5 km    │  │
│  │    Type: Government | Emergency: ✅    │  │
│  │    [Directions] [Call] [Details]       │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

### 4.5 API Endpoints

| Method | Endpoint | Description | Cache TTL |
|---|---|---|---|
| `GET` | `/api/hospitals` | List hospitals with pagination | 5 min |
| `GET` | `/api/hospitals?lat=17.385&lng=78.486&radius=5` | Nearby hospitals by GPS | 5 min |
| `GET` | `/api/hospitals?type=government` | Filter by hospital type | 5 min |
| `GET` | `/api/hospitals/stats` | Total count by type/state | 30 min |
| `GET` | `/api/hospitals/:id` | Single hospital details | 5 min |

**GPS Proximity Query (Supabase):**
```javascript
// Haversine formula for distance calculation
const { data } = await supabase
  .from('hospitals')
  .select('*')
  .gte('location->>lat', lat - radiusDeg)
  .lte('location->>lat', lat + radiusDeg)
  .gte('location->>lng', lng - radiusDeg)
  .lte('location->>lng', lng + radiusDeg);

// Client-side: exact distance filtering with Haversine
const filtered = data.filter(h => {
  const dist = haversine(lat, lng, h.location.lat, h.location.lng);
  return dist <= radiusKm;
});
```

---

### 4.6 Location Context Provider

**File:** `frontend/src/context/LocationContext.tsx`

Provides GPS location data throughout the application:

```typescript
interface LocationContextType {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}
```

- Uses `navigator.geolocation.getCurrentPosition()`
- Reverse geocoding to get city/state name
- Shared across: Hospital Finder, Healthcare Navigator, Emergency SOS
- Permission prompt handled gracefully with fallback

---

### 4.7 Google Maps Directions Integration

When user clicks "Directions" on a hospital card:

```
window.open(
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  '_blank'
);
```

- Opens Google Maps in a new tab
- Provides turn-by-turn navigation from user's current location
- Works on mobile and desktop

---

### 4.8 Hospital Type Breakdown

| Type | Count (approx.) | Description |
|---|---|---|
| **Government** | ~80,000 | District hospitals, civil hospitals |
| **PHC** | ~30,000 | Primary Health Centres |
| **CHC** | ~5,800 | Community Health Centres |
| **Sub-Centre** | ~155,000 | Rural sub-centres |
| **Private** | ~15,000 | Private hospitals and clinics |
| **Clinic** | ~4,000 | Small private clinics |

All 36 Indian states + 8 Union Territories covered.

---

### 4.9 Redis Caching for Performance

**File:** `backend/services/redisService.js`

Hospital queries are cached in Redis to handle the 249K+ dataset efficiently:

```javascript
// Cache middleware — intercepts GET requests
function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);
    if (cached) return res.json(JSON.parse(cached));

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      redis.set(key, JSON.stringify(body), 'EX', ttlSeconds);
      return originalJson(body);
    };
    next();
  };
}
```

Cache strategy:
- Hospital list: **5 minutes** TTL
- Hospital stats: **30 minutes** TTL
- Search results: **5 minutes** TTL
- Cache invalidation on data updates

---

### 4.10 Key Files

| File | Role |
|---|---|
| `frontend/src/app/dashboard/hospitals/page.tsx` | Hospital Finder map UI |
| `frontend/src/app/api/hospitals/route.ts` | Next.js API proxy |
| `frontend/src/context/LocationContext.tsx` | GPS location provider |
| `backend/routes/hospitals.js` | Hospital CRUD + geo-search API |
| `backend/models/Hospital.js` | Hospital data model (3,322 bytes) |
| `backend/scripts/seedHospitals.js` | 249K hospital seeder (17,746 bytes) |
| `backend/services/redisService.js` | Redis caching for performance |

---

> **Next:** Part 5 — Crisis Response & Emergency Management System
