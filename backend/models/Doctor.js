const supabase = require('../supabaseClient');

const TABLE = 'doctors';

const Doctor = {
  async create({ userId, licenseId, specialization, qualification, experience, hospitalId, consultationFee, languages, bio }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        license_id: licenseId,
        specialization,
        qualification,
        experience,
        hospital_id: hospitalId || null,
        consultation_fee: consultationFee,
        languages: languages || [],
        bio,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findByUserId(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
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

  async getAll(filters = {}) {
    let query = supabase.from(TABLE).select('*');
    if (filters.specialization) query = query.eq('specialization', filters.specialization);
    if (filters.verified !== undefined) query = query.eq('verified', filters.verified);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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
};

module.exports = Doctor;
