const supabase = require('../supabaseClient');

const TABLE = 'blood_donors';

const BloodDonor = {
  async create({ userId, bloodGroup, phone, city, state, location }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        blood_group: bloodGroup,
        phone,
        city,
        state,
        location: location || {},
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findByUser(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateByUser(userId, updates) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async search(filters = {}, limit = 50) {
    let query = supabase.from(TABLE).select('*').eq('available', true);
    if (filters.bloodGroup) query = query.eq('blood_group', filters.bloodGroup);
    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    const { data, error } = await query.limit(limit);
    if (error) throw error;
    return data || [];
  },
};

module.exports = BloodDonor;
