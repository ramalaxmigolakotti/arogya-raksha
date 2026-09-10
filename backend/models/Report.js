const supabase = require('../supabaseClient');

const TABLE = 'reports';

const Report = {
  async create({ userId, type, title, fileUrl, extractedText, analysis, aiInsights }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        type: type || 'other',
        title: title || 'Medical Report',
        file_url: fileUrl,
        extracted_text: extractedText,
        analysis: analysis || {},
        ai_insights: aiInsights,
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
      .order('created_at', { ascending: false });
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
};

module.exports = Report;
