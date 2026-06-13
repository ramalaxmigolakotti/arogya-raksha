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

const STORAGE_KEY = 'arogya_user_location';

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locData));
    } catch {}
  }, []);

  // Called by other pages (e.g. Hospitals) when user manually changes location
  const updateLocation = useCallback(async (lat: number, lng: number, address?: string) => {
    if (address) {
      // Parse city from address string
      const parts = address.split(',').map(s => s.trim());
      const locData: LocationData = {
        lat,
        lng,
        city: parts[parts.length > 2 ? parts.length - 2 : 0] || 'Unknown',
        area: parts[0] || '',
        fullAddress: address,
      };
      saveLocation(locData);
    } else {
      // Reverse geocode to get proper city/area
      const geo = await reverseGeocode(lat, lng);
      const locData: LocationData = {
        lat,
        lng,
        city: geo.city || 'Unknown',
        area: geo.area || '',
        fullAddress: geo.fullAddress || '',
      };
      saveLocation(locData);
    }
  }, [reverseGeocode, saveLocation]);

  const detectLocation = useCallback(async () => {
    setLoading(true);
    setError('');

    // Try to load cached location first for instant display
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.lat && parsed.lng) {
          setLocation(parsed);
        }
      }
    } catch {}

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const geo = await reverseGeocode(lat, lng);
        saveLocation({
          lat,
          lng,
          city: geo.city || 'Unknown',
          area: geo.area || '',
          fullAddress: geo.fullAddress || '',
        });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        // Fallback to Hyderabad (user's actual city)
        const hyd = { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', area: 'Telangana', fullAddress: 'Hyderabad, Telangana, India' };
        saveLocation(hyd);
        setError('');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // maximumAge:0 = always fresh GPS
    );
  }, [reverseGeocode, saveLocation]);

  // Listen for localStorage changes from other components (e.g. Hospitals page)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.lat && parsed.lng && parsed.city) {
            setLocation(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
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
