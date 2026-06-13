const supabase = require('../supabaseClient');

const TABLE = 'appointments';

const Appointment = {
  async create({ patientId, patientName, patientEmail, patientPhone, doctorId, hospitalId, date, timeSlot, department, reason }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        patient_id: patientId,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        doctor_id: doctorId,
        hospital_id: hospitalId || null,
        date,
        time_slot: timeSlot || {},
        department,
        reason,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findByPatient(patientId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: false });
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

  async updatePayment(id, paymentProof) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ payment_proof: paymentProof, payment_status: 'uploaded', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

module.exports = Appointment;
