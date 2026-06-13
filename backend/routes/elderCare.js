const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const cloudinary = require('cloudinary').v2;
const { cacheGet, cacheSet, cacheDel } = require('../services/redisService');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Haversine distance (km) ──────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Smart matching score ────────────────────────────────────
function computeMatchScore(elder, caregiver) {
  let score = 0;

  const dist = haversine(
    elder.latitude || 0, elder.longitude || 0,
    caregiver.latitude || 0, caregiver.longitude || 0
  );
  if (dist <= 2) score += 40;
  else if (dist <= 5) score += 30;
  else if (dist <= 10) score += 15;
  else if (dist <= 20) score += 5;

  const elderConditions = (elder.conditions || []).map(c => c.toLowerCase());
  const caregiverSkills = (caregiver.skills || []).map(s => s.toLowerCase());
  const skillKeywords = {
    'diabetes': ['diabetic care', 'diabetes management', 'insulin', 'blood sugar'],
    'hypertension': ['blood pressure', 'bp monitoring', 'cardiac care'],
    'mobility': ['physiotherapy', 'mobility assistance', 'wheelchair'],
    'dementia': ['alzheimer', 'dementia care', 'memory care'],
    'post surgery': ['wound care', 'post-op care', 'nursing'],
  };
  let skillMatches = 0;
  for (const condition of elderConditions) {
    for (const [key, keywords] of Object.entries(skillKeywords)) {
      if (condition.includes(key)) {
        if (keywords.some(kw => caregiverSkills.some(s => s.includes(kw)))) skillMatches++;
      }
    }
  }
  if (caregiverSkills.includes('medicine management') || caregiverSkills.includes('medicines')) skillMatches += 0.5;
  if (caregiverSkills.includes('hospital visits') || caregiverSkills.includes('hospital accompany')) skillMatches += 0.5;
  score += Math.min(30, skillMatches * 10);

  const elderState = (elder.state || '').toLowerCase();
  const caregiverLangs = (caregiver.languages || []).map(l => l.toLowerCase());
  const stateLangMap = {
    'telangana': 'telugu', 'andhra pradesh': 'telugu',
    'maharashtra': 'marathi', 'tamil nadu': 'tamil',
    'karnataka': 'kannada', 'west bengal': 'bengali',
  };
  const expectedLang = stateLangMap[elderState];
  if (expectedLang && caregiverLangs.includes(expectedLang)) score += 20;
  else if (caregiverLangs.includes('hindi')) score += 10;
  else if (caregiverLangs.includes('english')) score += 5;

  if (elder.budget_per_month && caregiver.salary_expectation) {
    if (caregiver.salary_expectation <= elder.budget_per_month) score += 10;
    else if (caregiver.salary_expectation <= elder.budget_per_month * 1.2) score += 5;
  }

  return { score: Math.min(100, Math.round(score)), distanceKm: parseFloat(dist.toFixed(2)) };
}

// ════════════════════════════════════════════════════════════
//  ELDER ENDPOINTS
// ════════════════════════════════════════════════════════════

// POST /api/elder-care/elders — Register elder
router.post('/elders', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      full_name, age, gender, address, city, state, pincode,
      latitude, longitude, photo_url, conditions, mobility,
      medicine_schedule, emergency_contacts, budget_per_month, special_notes,
    } = req.body;

    if (!full_name || !age || !address) {
      return res.status(400).json({ success: false, message: 'full_name, age and address are required.' });
    }

    const { data, error } = await supabase
      .from('elder_profiles')
      .insert([{
        registered_by: userId,
        full_name, age, gender, address, city, state, pincode,
        latitude, longitude, photo_url,
        conditions: conditions || [],
        mobility: mobility || 'mobile',
        medicine_schedule: medicine_schedule || [],
        emergency_contacts: emergency_contacts || [],
        budget_per_month: budget_per_month || 0,
        special_notes,
      }])
      .select()
      .single();

    if (error) throw error;
    await cacheDel(`elder-care:elders:${userId}`);
    await cacheDel(`elder-care:stats:${userId}`);
    res.status(201).json({ success: true, elder: data });
  } catch (err) {
    console.error('[elder-care] create elder error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/elders — List elders by family member
router.get('/elders', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const cacheKey = `elder-care:elders:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, elders: cached, _cached: true });

    const { data, error } = await supabase
      .from('elder_profiles')
      .select('*')
      .eq('registered_by', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const elderIds = (data || []).map(e => e.id);
    const [matchesRes, alertsRes] = await Promise.all([
      elderIds.length > 0
        ? supabase.from('elder_caregiver_matches')
            .select('*, caregiver:caregiver_profiles(id, full_name, photo_url)')
            .in('elder_id', elderIds).eq('status', 'hired')
        : { data: [] },
      elderIds.length > 0
        ? supabase.from('elder_care_alerts')
            .select('elder_id').in('elder_id', elderIds).eq('is_read', false)
        : { data: [] },
    ]);

    const matchMap = {};
    (matchesRes.data || []).forEach(m => { matchMap[m.elder_id] = m; });
    const alertCountMap = {};
    (alertsRes.data || []).forEach(a => {
      alertCountMap[a.elder_id] = (alertCountMap[a.elder_id] || 0) + 1;
    });

    const enriched = (data || []).map(elder => ({
      ...elder,
      active_match: matchMap[elder.id] || null,
      unread_alerts: alertCountMap[elder.id] || 0,
    }));

    await cacheSet(cacheKey, enriched, 60);
    res.json({ success: true, elders: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/elders/public — All elders visible in directory (for caregivers to browse)
router.get('/elders/public', async (req, res) => {
  try {
    const cacheKey = 'elder-care:elders:public';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, elders: cached, _cached: true });

    const { data, error } = await supabase
      .from('elder_profiles')
      .select('id, full_name, age, gender, address, city, state, photo_url, conditions, mobility, budget_per_month, special_notes, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    await cacheSet(cacheKey, data || [], 60);
    res.json({ success: true, elders: data || [] });
  } catch (err) {
    console.error('[elder-care] elders/public error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/elders/:id
router.get('/elders/:id', async (req, res) => {
  try {
    const cacheKey = `elder-care:elder:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ ...cached, _cached: true });

    const [elderRes, matchRes, tasksRes, alertsRes] = await Promise.all([
      supabase.from('elder_profiles').select('*').eq('id', req.params.id).single(),
      supabase.from('elder_caregiver_matches').select('*, caregiver:caregiver_profiles(*)').eq('elder_id', req.params.id).eq('status', 'hired').maybeSingle(),
      supabase.from('caregiver_tasks').select('*').eq('elder_id', req.params.id).order('created_at', { ascending: false }),
      supabase.from('elder_care_alerts').select('*').eq('elder_id', req.params.id).order('created_at', { ascending: false }).limit(10),
    ]);

    if (elderRes.error) throw elderRes.error;
    if (!elderRes.data) return res.status(404).json({ success: false, message: 'Elder not found' });

    const payload = {
      success: true,
      elder: elderRes.data,
      active_match: matchRes.data || null,
      tasks: tasksRes.data || [],
      alerts: alertsRes.data || [],
    };
    await cacheSet(cacheKey, payload, 30);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/elder-care/elders/:id
router.put('/elders/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('elder_profiles')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('registered_by', userId)
      .select()
      .single();

    if (error) throw error;
    await cacheDel(`elder-care:elder:${req.params.id}`);
    await cacheDel(`elder-care:elders:${userId}`);
    res.json({ success: true, elder: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  CAREGIVER ENDPOINTS
// ════════════════════════════════════════════════════════════

// POST /api/elder-care/caregivers — Register caregiver
router.post('/caregivers', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || null;
    const {
      full_name, age, gender, phone, email,
      photo_url, village, city, state, pincode,
      latitude, longitude, skills, languages,
      experience_years, availability, salary_expectation, bio,
    } = req.body;

    if (!full_name || !phone || !village) {
      return res.status(400).json({ success: false, message: 'full_name, phone and village are required.' });
    }

    const { data, error } = await supabase
      .from('caregiver_profiles')
      .insert([{
        user_id: userId,
        full_name, age, gender, phone, email,
        photo_url, village, city, state, pincode,
        latitude, longitude,
        skills: skills || [],
        languages: languages || [],
        experience_years: experience_years || 0,
        availability: availability || {},
        salary_expectation: salary_expectation || 0,
        bio,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, caregiver: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/caregivers/me — Caregiver's own dashboard data
router.get('/caregivers/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data: caregiver, error } = await supabase
      .from('caregiver_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!caregiver) return res.json({ success: true, caregiver: null });

    const [matchesRes, tasksRes, doneCountRes] = await Promise.all([
      supabase.from('elder_caregiver_matches').select('*, elder:elder_profiles(*)').eq('caregiver_id', caregiver.id).eq('status', 'hired'),
      supabase.from('caregiver_tasks').select('*, elder:elder_profiles(full_name, address, phone)').eq('caregiver_id', caregiver.id).eq('status', 'pending').order('due_date', { ascending: true }).limit(10),
      supabase.from('caregiver_tasks').select('id', { count: 'exact', head: true }).eq('caregiver_id', caregiver.id).eq('status', 'done'),
    ]);

    res.json({
      success: true,
      caregiver,
      active_matches: matchesRes.data || [],
      active_tasks: tasksRes.data || [],
      tasks_completed: doneCountRes.count || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/caregivers — List available caregivers
router.get('/caregivers', async (req, res) => {
  try {
    const { city, skill, language, max_salary, limit = 50 } = req.query;
    const cacheKey = `elder-care:caregivers:${city || ''}:${skill || ''}:${language || ''}:${max_salary || ''}:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, caregivers: cached, _cached: true });

    let query = supabase
      .from('caregiver_profiles')
      .select('id,full_name,photo_url,village,city,state,skills,languages,experience_years,salary_expectation,rating,bio,availability,latitude,longitude,status')
      .eq('status', 'available')
      .order('rating', { ascending: false })
      .limit(parseInt(limit));

    if (city) query = query.ilike('city', `%${city}%`);
    if (skill) query = query.contains('skills', [skill]);
    if (language) query = query.contains('languages', [language]);
    if (max_salary) query = query.lte('salary_expectation', parseInt(max_salary));

    const { data, error } = await query;
    if (error) throw error;
    await cacheSet(cacheKey, data || [], 300);
    res.json({ success: true, caregivers: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/caregivers/:id
router.get('/caregivers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('caregiver_profiles').select('*').eq('id', req.params.id).single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Caregiver not found' });

    const { count: tasksDone } = await supabase
      .from('caregiver_tasks').select('id', { count: 'exact', head: true })
      .eq('caregiver_id', req.params.id).eq('status', 'done');

    res.json({ success: true, caregiver: data, tasks_completed: tasksDone || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/elder-care/caregivers/:id
router.put('/caregivers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('caregiver_profiles')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();

    if (error) throw error;
    res.json({ success: true, caregiver: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  SMART MATCHING
// ════════════════════════════════════════════════════════════

// POST /api/elder-care/matches — Run smart match for an elder
router.post('/matches', async (req, res) => {
  try {
    const { elder_id, radius_km = 20 } = req.body;
    if (!elder_id) return res.status(400).json({ success: false, message: 'elder_id required' });

    const { data: elder, error: elderErr } = await supabase
      .from('elder_profiles').select('*').eq('id', elder_id).single();
    if (elderErr || !elder) return res.status(404).json({ success: false, message: 'Elder not found' });

    const { data: caregivers, error: cgErr } = await supabase
      .from('caregiver_profiles').select('*').eq('status', 'available');
    if (cgErr) throw cgErr;

    const scored = (caregivers || [])
      .map(cg => {
        const { score, distanceKm } = computeMatchScore(elder, cg);
        return { ...cg, match_score: score, distance_km: distanceKm };
      })
      .filter(cg => cg.distance_km <= parseFloat(radius_km))
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10);

    if (scored.length > 0) {
      await supabase.from('elder_caregiver_matches').upsert(
        scored.map(cg => ({
          elder_id, caregiver_id: cg.id,
          match_score: cg.match_score, distance_km: cg.distance_km,
          status: 'suggested',
        })),
        { onConflict: 'elder_id,caregiver_id', ignoreDuplicates: false }
      );
    }

    res.json({ success: true, matches: scored, total: scored.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/matches/:elderId
router.get('/matches/:elderId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('elder_caregiver_matches')
      .select('*, caregiver:caregiver_profiles(*)')
      .eq('elder_id', req.params.elderId)
      .order('match_score', { ascending: false });

    if (error) throw error;
    res.json({ success: true, matches: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/elder-care/matches/:matchId/hire
router.put('/matches/:matchId/hire', async (req, res) => {
  try {
    const { data: match, error } = await supabase
      .from('elder_caregiver_matches')
      .update({ status: 'hired', hired_at: new Date().toISOString() })
      .eq('id', req.params.matchId).select().single();

    if (error) throw error;

    await Promise.all([
      supabase.from('elder_caregiver_matches').update({ status: 'rejected' })
        .eq('elder_id', match.elder_id).neq('id', req.params.matchId).eq('status', 'suggested'),
      supabase.from('caregiver_profiles').update({ status: 'engaged' }).eq('id', match.caregiver_id),
    ]);

    const tasks = [
      { task_type: 'health_check', title: 'Initial health assessment visit', description: 'Visit the elder, understand their routine and medical needs.' },
      { task_type: 'medicine_delivery', title: 'Set up medicine schedule', description: "Review and organize the elder's medicine schedule." },
    ];
    for (const task of tasks) {
      await supabase.from('caregiver_tasks').insert({
        match_id: req.params.matchId, elder_id: match.elder_id,
        caregiver_id: match.caregiver_id, ...task, status: 'pending',
      });
    }

    res.json({ success: true, match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/elder-care/matches/:matchId/status
router.put('/matches/:matchId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('elder_caregiver_matches')
      .update({ status }).eq('id', req.params.matchId).select().single();

    if (error) throw error;
    res.json({ success: true, match: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  TASKS
// ════════════════════════════════════════════════════════════

// POST /api/elder-care/tasks
router.post('/tasks', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { match_id, elder_id, caregiver_id, task_type, title, description, due_date, due_time } = req.body;

    const { data, error } = await supabase
      .from('caregiver_tasks')
      .insert([{
        match_id, elder_id, caregiver_id,
        task_type: task_type || 'other',
        title, description, due_date, due_time,
        created_by: userId,
      }])
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, task: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/tasks/caregiver/:caregiverId
router.get('/tasks/caregiver/:caregiverId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('caregiver_tasks')
      .select('*, elder:elder_profiles(full_name, photo_url, address)')
      .eq('caregiver_id', req.params.caregiverId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, tasks: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/tasks/elder/:elderId
router.get('/tasks/elder/:elderId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('caregiver_tasks').select('*')
      .eq('elder_id', req.params.elderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, tasks: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/elder-care/tasks/:taskId/done
router.put('/tasks/:taskId/done', async (req, res) => {
  try {
    const { done_notes } = req.body;
    const { data, error } = await supabase
      .from('caregiver_tasks')
      .update({ status: 'done', done_at: new Date().toISOString(), done_notes })
      .eq('id', req.params.taskId).select().single();

    if (error) throw error;
    res.json({ success: true, task: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  ALERTS
// ════════════════════════════════════════════════════════════

// POST /api/elder-care/alerts
router.post('/alerts', async (req, res) => {
  try {
    const { elder_id, alert_type, severity, message, source } = req.body;
    if (!elder_id || !message) {
      return res.status(400).json({ success: false, message: 'elder_id and message required' });
    }

    const { data, error } = await supabase
      .from('elder_care_alerts')
      .insert([{ elder_id, alert_type: alert_type || 'manual', severity: severity || 'medium', message, source }])
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, alert: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/elder-care/alerts/:elderId
router.get('/alerts/:elderId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('elder_care_alerts').select('*')
      .eq('elder_id', req.params.elderId)
      .order('created_at', { ascending: false }).limit(20);

    if (error) throw error;
    res.json({ success: true, alerts: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/elder-care/alerts/:alertId/read
router.put('/alerts/:alertId/read', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('elder_care_alerts')
      .update({ is_read: true }).eq('id', req.params.alertId).select().single();

    if (error) throw error;
    res.json({ success: true, alert: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Stats summary ────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const cacheKey = `elder-care:stats:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, stats: cached, _cached: true });

    const [eldersRes, caregiverRes, alertsRes] = await Promise.all([
      supabase.from('elder_profiles').select('id', { count: 'exact', head: true }).eq('registered_by', userId),
      supabase.from('caregiver_profiles').select('id', { count: 'exact', head: true }).eq('status', 'available'),
      supabase.from('elder_care_alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
    ]);

    const stats = {
      my_elders: eldersRes.count || 0,
      available_caregivers: caregiverRes.count || 0,
      unread_alerts: alertsRes.count || 0,
    };
    await cacheSet(cacheKey, stats, 30);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
