/**
 * nearbyHospitals.js
 * Fetches real hospitals from OpenStreetMap Overpass API.
 * No API key required — completely free and open.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Fetch real hospitals near a GPS coordinate.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Search radius in km (default 10)
 * @returns {Promise<Array<{name, lat, lng, distance_km, address, phone, emergency, type}>>}
 */
async function fetchNearbyHospitals(lat, lng, radiusKm = 10) {
  const radiusM = radiusKm * 1000;

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radiusM},${lat},${lng});
      way["amenity"="hospital"](around:${radiusM},${lat},${lng});
      node["amenity"="clinic"](around:${radiusM},${lat},${lng});
    );
    out center body;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
    const data = await response.json();

    const hospitals = (data.elements || [])
      .filter(el => el.tags && el.tags.name)
      .map(el => {
        const elLat = el.lat || el.center?.lat;
        const elLng = el.lon || el.center?.lon;
        if (!elLat || !elLng) return null;

        const dist = haversineDistance(lat, lng, elLat, elLng);

        return {
          id: `osm_${el.id}`,
          name: el.tags.name,
          lat: elLat,
          lng: elLng,
          distance_km: Math.round(dist * 10) / 10,
          address: el.tags['addr:full'] || el.tags['addr:street'] || '',
          phone: el.tags.phone || el.tags['contact:phone'] || '',
          emergency: el.tags.emergency === 'yes' || el.tags.amenity === 'hospital' ? 'yes' : 'no',
          type: el.tags.amenity === 'hospital' ? 'Hospital' : 'Clinic',
          dept: el.tags.healthcare || 'General',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 15); // Top 15 nearest

    return hospitals;
  } catch (error) {
    console.error('Overpass API error:', error.message);
    // Fallback: return empty array, frontend handles gracefully
    return [];
  }
}

/**
 * Haversine formula — distance between two GPS points in km.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) { return deg * (Math.PI / 180); }

module.exports = { fetchNearbyHospitals, haversineDistance };
