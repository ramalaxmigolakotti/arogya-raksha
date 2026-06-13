const express = require('express');
const router = express.Router();

// PHC finder — proxies to OpenStreetMap Overpass API for live hospital data near a GPS point
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const radiusMeters = parseFloat(radius) * 1000;

    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
        node["amenity"="health_post"](around:${radiusMeters},${lat},${lng});
        node["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
        node["healthcare"="centre"](around:${radiusMeters},${lat},${lng});
        node["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
        node["healthcare"="clinic"](around:${radiusMeters},${lat},${lng});
        way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        way["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
      );
      out center;
    `.trim();

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const facilities = (data.elements || [])
      .filter(el => el.tags?.name)
      .map(el => {
        const fLat = el.lat || el.center?.lat;
        const fLng = el.lon || el.center?.lon;
        const dist = fLat && fLng ? haversine(userLat, userLng, fLat, fLng) : null;

        return {
          id: String(el.id),
          name: el.tags.name,
          lat: fLat,
          lng: fLng,
          distance_km: dist ? parseFloat(dist.toFixed(2)) : null,
          address: [el.tags['addr:full'], el.tags['addr:street'], el.tags['addr:city']]
            .filter(Boolean).join(', ') || el.tags['addr:full'] || '',
          phone: el.tags.phone || el.tags['contact:phone'] || '',
          emergency: el.tags.emergency || 'unknown',
          type: el.tags.amenity || el.tags.healthcare || 'health_facility',
        };
      })
      .filter(f => f.distance_km !== null)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 30);

    res.json({ success: true, facilities, total: facilities.length });
  } catch (err) {
    console.error('[PHC] Overpass error:', err.message);
    res.status(500).json({ success: false, message: err.message, facilities: [] });
  }
});

module.exports = router;
