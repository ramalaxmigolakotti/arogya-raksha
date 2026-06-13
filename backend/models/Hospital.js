const supabase = require('../supabaseClient');

const TABLE = 'hospitals';

const Hospital = {
  async findAll(filters = {}, limit = 50) {
    let query = supabase.from(TABLE).select('*');
    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters.state) query = query.ilike('state', `%${filters.state}%`);
    if (filters.department) query = query.contains('departments', [filters.department]);
    if (filters.emergency) query = query.eq('emergency', true);
    if (filters.ambulance) query = query.eq('ambulance', true);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
    }
    if (filters.minBeds) query = query.gte('total_beds', parseInt(filters.minBeds));
    const { data, error } = await query.order('rating', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async findNearby(lat, lng, maxDistance = 10000, limit = 20) {
    // Fetch hospitals that have location coordinates
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    if (!data) return [];

    const toRad = (deg) => (deg * Math.PI) / 180;
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371000; // meters
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    return data
      .filter((h) => {
        const coords = h.location?.coordinates;
        if (!coords || coords.length < 2) return false;
        return haversine(lat, lng, coords[1], coords[0]) <= maxDistance;
      })
      .map((h) => {
        const coords = h.location?.coordinates;
        return {
          ...h,
          distance_meters: Math.round(haversine(lat, lng, coords[1], coords[0])),
          distance_km: (haversine(lat, lng, coords[1], coords[0]) / 1000).toFixed(1),
        };
      })
      .sort((a, b) => a.distance_meters - b.distance_meters)
      .slice(0, limit);
  },

  async getStats() {
    const { data, error } = await supabase.from(TABLE).select('type, city, emergency, ambulance');
    if (error) throw error;
    if (!data) return {};

    const stats = {
      total: data.length,
      by_type: {},
      by_city: {},
      with_emergency: data.filter(h => h.emergency).length,
      with_ambulance: data.filter(h => h.ambulance).length,
    };

    data.forEach(h => {
      stats.by_type[h.type] = (stats.by_type[h.type] || 0) + 1;
      if (h.city) stats.by_city[h.city] = (stats.by_city[h.city] || 0) + 1;
    });

    // Sort cities by count, keep top 20
    stats.top_cities = Object.entries(stats.by_city)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([city, count]) => ({ city, count }));

    delete stats.by_city;
    return stats;
  },
};

module.exports = Hospital;
