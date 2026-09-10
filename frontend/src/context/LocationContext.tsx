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

const STORAGE_KEY  = 'arogya_user_location';
const CACHE_VERSION = 'v2'; // bump this to auto-bust stale cache

// Hyderabad as the trusted default (user's actual city)
const HYDERABAD: LocationData = {
  lat: 17.3850,
  lng: 78.4867,
  city: 'Hyderabad',
  area: 'Telangana',
  fullAddress: 'Hyderabad, Telangana, India',
};

// Detect if coords are Bengaluru (to reject stale cache)
function isBengaluru(lat: number, lng: number): boolean {
  return Math.abs(lat - 12.97) < 0.5 && Math.abs(lng - 77.59) < 0.5;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(HYDERABAD); // default = Hyderabad immediately
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Partial<LocationData>> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.address || {};
      return {
        city: addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Unknown',
        area: addr.suburb || addr.neighbourhood || addr.road || addr.hamlet || '',
        fullAddress: data.display_name || '',
      };
    } catch {
      return { city: 'Unknown', area: '', fullAddress: '' };
    }
  }, []);

  const saveLocation = useCallback((locData: LocationData) => {
    setLocation(locData);
    setLoading(false);
    setError('');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...locData, _v: CACHE_VERSION }));
    } catch {}
  }, []);

  // Called by other pages (e.g. Hospitals) when user manually changes location
  const updateLocation = useCallback(async (lat: number, lng: number, address?: string) => {
    if (address) {
      const parts = address.split(',').map(s => s.trim());
      const locData: LocationData = {
        lat, lng,
        city: parts[parts.length > 2 ? parts.length - 2 : 0] || 'Unknown',
        area: parts[0] || '',
        fullAddress: address,
      };
      saveLocation(locData);
    } else {
      const geo = await reverseGeocode(lat, lng);
      saveLocation({ lat, lng, city: geo.city || 'Unknown', area: geo.area || '', fullAddress: geo.fullAddress || '' });
    }
  }, [reverseGeocode, saveLocation]);

  const detectLocation = useCallback(async () => {
    setLoading(true);
    setError('');

    // ── Clear stale / wrong-city cache ──────────────────────────────────
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Reject if: wrong cache version OR coords are Bengaluru
        if (parsed._v !== CACHE_VERSION || isBengaluru(parsed.lat, parsed.lng)) {
          localStorage.removeItem(STORAGE_KEY);
          console.info('[Location] Cleared stale cache (Bengaluru / old version)');
        }
      }
    } catch {}

    // ── Try GPS ─────────────────────────────────────────────────────────
    if (!navigator.geolocation) {
      saveLocation(HYDERABAD); // fallback
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;

        // Reject GPS if it still returns Bengaluru (WiFi/IP-based error)
        if (isBengaluru(lat, lng)) {
          console.warn('[Location] GPS returned Bengaluru — using Hyderabad default');
          saveLocation(HYDERABAD);
          return;
        }

        const geo = await reverseGeocode(lat, lng);
        saveLocation({
          lat, lng,
          city: geo.city || 'Unknown',
          area: geo.area || '',
          fullAddress: geo.fullAddress || '',
        });
      },
      (err) => {
        console.warn('[Location] GPS denied:', err.message, '— falling back to Hyderabad');
        saveLocation(HYDERABAD);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [reverseGeocode, saveLocation]);

  // Listen for localStorage changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.lat && parsed.lng && parsed.city && !isBengaluru(parsed.lat, parsed.lng)) {
            setLocation(parsed);
          }
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
