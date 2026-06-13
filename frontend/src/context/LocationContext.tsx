'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface LocationData {
  lat: number;
  lng: number;
  city: string;
  area: string;
  fullAddress: string;
}

interface LocationContextType {
  location: LocationData | null;
  loading: boolean;
  error: string;
  refreshLocation: () => void;
  updateLocation: (lat: number, lng: number, address?: string) => void;
}

const LocationContext = createContext<LocationContextType>({
  location: null,
  loading: true,
  error: '',
  refreshLocation: () => {},
  updateLocation: () => {},
});

export const useLocation = () => useContext(LocationContext);

const STORAGE_KEY   = 'arogya_user_location';
const CACHE_VERSION = 'v3';

// Hyderabad (Himayat Nagar / Kismatpur) as the trusted default
const HYDERABAD: LocationData = {
  lat: 17.3516,
  lng: 78.3965,
  city: 'Hyderabad',
  area: 'Himayat Nagar / Kismatpur',
  fullAddress: 'Himayat Nagar, Kismatpur, Hyderabad, Telangana',
};

// Detect if coords are Bengaluru (to reject stale cache)
function isBengaluru(lat: number, lng: number): boolean {
  return Math.abs(lat - 12.97) < 0.5 && Math.abs(lng - 77.59) < 0.5;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(HYDERABAD);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // ── Reverse geocode coords → city name ─────────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Partial<LocationData>> => {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.address || {};
      return {
        city:        addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Unknown',
        area:        addr.suburb || addr.neighbourhood || addr.road || addr.hamlet || '',
        fullAddress: data.display_name || '',
      };
    } catch {
      return { city: 'Unknown', area: '', fullAddress: '' };
    }
  }, []);

  // ── Save location to state + localStorage ──────────────────────────────
  const saveLocation = useCallback((locData: LocationData) => {
    setLocation(locData);
    setLoading(false);
    setError('');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...locData, _v: CACHE_VERSION }));
    } catch {}
  }, []);

  // ── IP-based geolocation (most reliable city for India) ────────────────
  const getIPLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      // ipapi.co — free, no API key needed, works in India
      const res  = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.latitude && data.longitude && data.city) {
        return {
          lat:         parseFloat(data.latitude),
          lng:         parseFloat(data.longitude),
          city:        data.city,
          area:        data.region || '',
          fullAddress: `${data.city}, ${data.region}, ${data.country_name}`,
        };
      }
    } catch {}

    try {
      // Fallback: ip-api.com — free alternative
      const res  = await fetch('http://ip-api.com/json/?fields=lat,lon,city,regionName,country', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.lat && data.lon && data.city) {
        return {
          lat:         data.lat,
          lng:         data.lon,
          city:        data.city,
          area:        data.regionName || '',
          fullAddress: `${data.city}, ${data.regionName}, ${data.country}`,
        };
      }
    } catch {}

    return null;
  }, []);

  // Called by other pages when user manually picks a location
  const updateLocation = useCallback(async (lat: number, lng: number, address?: string) => {
    if (address) {
      const parts = address.split(',').map(s => s.trim());
      saveLocation({
        lat, lng,
        city:        parts[parts.length > 2 ? parts.length - 2 : 0] || 'Unknown',
        area:        parts[0] || '',
        fullAddress: address,
      });
    } else {
      const geo = await reverseGeocode(lat, lng);
      saveLocation({ lat, lng, city: geo.city || 'Unknown', area: geo.area || '', fullAddress: geo.fullAddress || '' });
    }
  }, [reverseGeocode, saveLocation]);

  // ── Main location detection ─────────────────────────────────────────────
  const detectLocation = useCallback(async () => {
    setLoading(true);
    setError('');

    // 1️⃣ Check valid cache first (skip if old version)
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed._v === CACHE_VERSION && parsed.lat && parsed.lng && parsed.city) {
          setLocation(parsed);
          setLoading(false);
          // Still refresh in background silently
        } else {
          localStorage.removeItem(STORAGE_KEY); // bust old cache
        }
      }
    } catch {}

    // 2️⃣ Try HIGH ACCURACY GPS (device GPS chip — most precise)
    const gpsPromise = new Promise<LocationData | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          console.info(`[GPS] Accuracy: ${accuracy}m  Coords: ${lat}, ${lng}`);
          const geo = await reverseGeocode(lat, lng);
          resolve({
            lat, lng,
            city:        geo.city        || 'Unknown',
            area:        geo.area        || '',
            fullAddress: geo.fullAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          });
        },
        (err) => {
          console.warn('[GPS] Error:', err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

    // 3️⃣ IP location runs in parallel (much faster ~1s)
    const ipPromise = getIPLocation();

    // Race: use IP first (fast), then override with GPS when it arrives (accurate)
    const ipLoc = await ipPromise;
    if (ipLoc && !isBengaluru(ipLoc.lat, ipLoc.lng)) {
      console.info(`[IP Location] City: ${ipLoc.city}`);
      saveLocation(ipLoc); // show fast result immediately
    }

    // Then wait for GPS and override if it's better
    const gpsLoc = await gpsPromise;
    if (gpsLoc && !isBengaluru(gpsLoc.lat, gpsLoc.lng)) {
      console.info(`[GPS Location] City: ${gpsLoc.city}`);
      saveLocation(gpsLoc); // GPS overrides IP (more precise coordinates)
    } else if (!ipLoc && !gpsLoc) {
      // Both failed — keep default (Kismatpur)
      setLoading(false);
    }
  }, [reverseGeocode, saveLocation, getIPLocation]);

  // Listen for localStorage changes from other components (e.g. Hospitals page)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.lat && parsed.lng && parsed.city) setLocation(parsed);
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('location-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('location-updated', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  return (
    <LocationContext.Provider value={{ location, loading, error, refreshLocation: detectLocation, updateLocation }}>
      {children}
    </LocationContext.Provider>
  );
}
