const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// POST /api/healthshare/resources — Post a new shared resource
router.post('/resources', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { title, description, category, condition, type, price, location, city, state, contact_phone } = req.body;
    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'title and category are required' });
    }

    const { data, error } = await supabase
      .from('healthshare_resources')
      .insert([{
        posted_by: userId, title, description,
        category, condition: condition || 'good',
        type: type || 'donate', price: price || 0,
        location, city, state, contact_phone,
        status: 'available',
      }])
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, resource: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/healthshare/resources — List available resources
router.get('/resources', async (req, res) => {
  try {
    const { category, city, type, q } = req.query;

    let query = supabase.from('healthshare_resources')
      .select('*').eq('status', 'available')
      .order('created_at', { ascending: false }).limit(50);

    if (category) query = query.eq('category', category);
    if (city) query = query.ilike('city', `%${city}%`);
    if (type) query = query.eq('type', type);
    if (q) query = query.ilike('title', `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, resources: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/healthshare/stats — Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    const [myRes, allRes, volRes, reqRes] = await Promise.all([
      supabase.from('healthshare_resources').select('id', { count: 'exact', head: true })
        .eq('posted_by', userId || '').eq('status', 'available'),
      supabase.from('healthshare_resources').select('id', { count: 'exact', head: true })
        .eq('status', 'available'),
      supabase.from('healthshare_volunteers').select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase.from('healthshare_requests').select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    res.json({
      success: true,
      stats: {
        my_shared: myRes.count || 0,
        available_resources: allRes.count || 0,
        volunteers: volRes.count || 0,
        active_requests: reqRes.count || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/healthshare/volunteers — Register as volunteer
router.post('/volunteers', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { full_name, role, skills, city, state, phone, availability } = req.body;
    if (!full_name || !role) {
      return res.status(400).json({ success: false, message: 'full_name and role are required' });
    }

    const { data, error } = await supabase
      .from('healthshare_volunteers')
      .insert([{
        user_id: userId, full_name, role,
        skills: skills || [], city, state, phone,
        availability: availability || {}, status: 'active',
      }])
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, volunteer: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/healthshare/volunteers — List volunteers
router.get('/volunteers', async (req, res) => {
  try {
    const { city, role } = req.query;
    let query = supabase.from('healthshare_volunteers')
      .select('*').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(50);

    if (city) query = query.ilike('city', `%${city}%`);
    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, volunteers: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/healthshare/requests — Request a resource
router.post('/requests', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { resource_id, message, contact_phone } = req.body;
    if (!resource_id) return res.status(400).json({ success: false, message: 'resource_id required' });

    const { data, error } = await supabase
      .from('healthshare_requests')
      .insert([{ requested_by: userId, resource_id, message, contact_phone, status: 'pending' }])
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, request: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
