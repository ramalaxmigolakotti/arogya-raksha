const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');

const TABLE = 'users';

const User = {
  async create({ name, email, password, role = 'patient', phone }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        phone,
      })
      .select()
      .single();
    if (error) throw error;
    return User.sanitize(data);
  },

  async findByEmail(email) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('email', email.toLowerCase())
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

  async update(id, updates) {
    const updateData = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from(TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return User.sanitize(data);
  },

  async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  sanitize(user) {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },
};

module.exports = User;
