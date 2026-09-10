const supabase = require('../supabaseClient');

const TABLE = 'orders';

const Order = {
  async create({ userId, userName, userEmail, userPhone, orderType, items, totalAmount, currency, shippingAddress, notes }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        user_phone: userPhone,
        order_type: orderType || 'medicine',
        items: items || [],
        total_amount: totalAmount,
        currency: currency || 'INR',
        shipping_address: shippingAddress || {},
        notes,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
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

  async findByUser(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async findAll(filters = {}) {
    let query = supabase.from(TABLE).select('*');
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.orderType) query = query.eq('order_type', filters.orderType);
    if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updatePayment(id, { paymentId, paymentOrderId, paymentSignature, paymentMethod }) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        payment_id: paymentId,
        payment_order_id: paymentOrderId,
        payment_signature: paymentSignature,
        payment_method: paymentMethod,
        payment_status: 'paid',
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

module.exports = Order;
