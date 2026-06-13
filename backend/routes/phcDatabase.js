const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET /api/phc-db/search — search local PHC database (Telangana)
router.get('/search', async (req, res) => {
  try {
    const { district, q, limit = 50 } = req.query;

    let query = supabase
      .from('phc_facilities')
      .select('*')
      .order('name', { ascending: true })
      .limit(parseInt(limit));

    if (district) query = query.eq('district', district);
    if (q) query = query.ilike('name', `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, facilities: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
