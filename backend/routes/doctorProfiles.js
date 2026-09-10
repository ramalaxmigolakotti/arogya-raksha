const express = require('express');
const router = express.Router();
const { clerkAuth } = require('../middleware/clerkAuth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');
const supabase = require('../supabaseClient');

const TABLE = 'doctor_profiles';

// ── GET /api/doctor-profiles — Public: list all doctors ──
router.get('/', async (req, res) => {
  try {
    const { search, location, specialization } = req.query;
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('is_available', true)
      .order('created_at', { ascending: false });

    if (specialization) {
      query = query.ilike('specialization', `%${specialization}%`);
    }
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    const { data, error } = await query;
    if (error) {
      if (error.message?.includes('does not exist')) {
        return res.json({ success: true, doctors: [] });
      }
      throw error;
    }

    // Filter by name search (client-side for flexibility)
    let doctors = data || [];
    if (search) {
      const q = search.toLowerCase();
      doctors = doctors.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.location?.toLowerCase().includes(q) ||
        d.specialization?.toLowerCase().includes(q) ||
        d.hospital_name?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, doctors });
  } catch (error) {
    console.error('Get doctors error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/doctor-profiles/me — Auth: get my profile ──
router.get('/me', clerkAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', req.userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No profile found
      return res.json({ success: true, profile: null });
    }
    if (error) {
      if (error.message?.includes('does not exist')) {
        return res.json({ success: true, profile: null });
      }
      throw error;
    }

    res.json({ success: true, profile: data });
  } catch (error) {
    console.error('Get my profile error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/doctor-profiles/:id — Public: get single doctor ──
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }
    if (error) throw error;

    res.json({ success: true, doctor: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/doctor-profiles — Auth: create profile ──
router.post('/', clerkAuth, async (req, res) => {
  try {
    const { name, phone, location, specialization, qualification, experience,
            consultationFee, hospitalName, hospitalImage, profileImage,
            bio, languages } = req.body;

    if (!name || !phone || !location) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and location are required.',
      });
    }

    // Check if user already has a profile
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id')
      .eq('user_id', req.userId)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You already have a doctor profile. Please edit it instead.',
      });
    }

    // Upload hospital image if provided (base64)
    let hospitalImageUrl = '';
    console.log(`📸 Hospital image: ${hospitalImage ? `present (${hospitalImage.substring(0, 30)}..., ${Math.round(hospitalImage.length / 1024)}KB)` : 'not provided'}`);
    if (hospitalImage && hospitalImage.startsWith('data:')) {
      try {
        console.log('☁️  Uploading hospital image to Cloudinary...');
        const result = await uploadToCloudinary(hospitalImage, {
          folder: `arogya-raksha/doctors/${req.userId}/hospital`,
          resourceType: 'image',
        });
        hospitalImageUrl = result.url;
        console.log('✅ Hospital image uploaded:', hospitalImageUrl);
      } catch (e) {
        console.error('❌ Hospital image upload FAILED:', e.message);
      }
    }

    // Upload profile image if provided (base64)
    let profileImageUrl = '';
    console.log(`📸 Profile image: ${profileImage ? `present (${profileImage.substring(0, 30)}..., ${Math.round(profileImage.length / 1024)}KB)` : 'not provided'}`);
    if (profileImage && profileImage.startsWith('data:')) {
      try {
        console.log('☁️  Uploading profile image to Cloudinary...');
        const result = await uploadToCloudinary(profileImage, {
          folder: `arogya-raksha/doctors/${req.userId}/profile`,
          resourceType: 'image',
        });
        profileImageUrl = result.url;
        console.log('✅ Profile image uploaded:', profileImageUrl);
      } catch (e) {
        console.error('❌ Profile image upload FAILED:', e.message);
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: req.userId,
        name,
        phone,
        location,
        specialization: specialization || '',
        qualification: qualification || '',
        experience: experience || 0,
        consultation_fee: consultationFee || 0,
        hospital_name: hospitalName || '',
        hospital_image: hospitalImageUrl,
        profile_image: profileImageUrl,
        bio: bio || '',
        languages: languages || [],
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Doctor profile created: ${name} (${req.userId})`);
    res.status(201).json({ success: true, profile: data });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/doctor-profiles — Auth: update my profile ──
router.put('/', clerkAuth, async (req, res) => {
  try {
    const { name, phone, location, specialization, qualification, experience,
            consultationFee, hospitalName, hospitalImage, profileImage,
            bio, languages, isAvailable } = req.body;

    // Check ownership
    const { data: existing, error: findErr } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', req.userId)
      .single();

    if (findErr && findErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, message: 'No profile found. Create one first.' });
    }
    if (findErr) throw findErr;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (location !== undefined) updates.location = location;
    if (specialization !== undefined) updates.specialization = specialization;
    if (qualification !== undefined) updates.qualification = qualification;
    if (experience !== undefined) updates.experience = experience;
    if (consultationFee !== undefined) updates.consultation_fee = consultationFee;
    if (hospitalName !== undefined) updates.hospital_name = hospitalName;
    if (bio !== undefined) updates.bio = bio;
    if (languages !== undefined) updates.languages = languages;
    if (isAvailable !== undefined) updates.is_available = isAvailable;

    // Upload new hospital image if provided as base64
    console.log(`📸 Hospital image update: ${hospitalImage ? `present (${Math.round((hospitalImage?.length || 0) / 1024)}KB)` : 'not provided'}`);
    if (hospitalImage && hospitalImage.startsWith('data:')) {
      try {
        if (existing.hospital_image) {
          const oldPublicId = existing.hospital_image.split('/upload/')[1]?.split('.')[0];
          if (oldPublicId) await deleteFromCloudinary(oldPublicId).catch(() => {});
        }
        console.log('☁️  Uploading hospital image to Cloudinary...');
        const result = await uploadToCloudinary(hospitalImage, {
          folder: `arogya-raksha/doctors/${req.userId}/hospital`,
          resourceType: 'image',
        });
        updates.hospital_image = result.url;
        console.log('✅ Hospital image uploaded:', result.url);
      } catch (e) {
        console.error('❌ Hospital image update FAILED:', e.message);
      }
    }

    // Upload new profile image if provided as base64
    console.log(`📸 Profile image update: ${profileImage ? `present (${Math.round((profileImage?.length || 0) / 1024)}KB)` : 'not provided'}`);
    if (profileImage && profileImage.startsWith('data:')) {
      try {
        if (existing.profile_image) {
          const oldPublicId = existing.profile_image.split('/upload/')[1]?.split('.')[0];
          if (oldPublicId) await deleteFromCloudinary(oldPublicId).catch(() => {});
        }
        console.log('☁️  Uploading profile image to Cloudinary...');
        const result = await uploadToCloudinary(profileImage, {
          folder: `arogya-raksha/doctors/${req.userId}/profile`,
          resourceType: 'image',
        });
        updates.profile_image = result.url;
        console.log('✅ Profile image uploaded:', result.url);
      } catch (e) {
        console.error('❌ Profile image update FAILED:', e.message);
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✏️  Doctor profile updated: ${data.name}`);
    res.json({ success: true, profile: data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/doctor-profiles — Auth: delete my profile ──
router.delete('/', clerkAuth, async (req, res) => {
  try {
    // Check ownership
    const { data: existing, error: findErr } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', req.userId)
      .single();

    if (findErr && findErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, message: 'No profile found.' });
    }
    if (findErr) throw findErr;

    // Delete images from Cloudinary
    if (existing.hospital_image) {
      const publicId = existing.hospital_image.split('/upload/')[1]?.replace(/\.[^.]+$/, '');
      if (publicId) await deleteFromCloudinary(publicId).catch(() => {});
    }
    if (existing.profile_image) {
      const publicId = existing.profile_image.split('/upload/')[1]?.replace(/\.[^.]+$/, '');
      if (publicId) await deleteFromCloudinary(publicId).catch(() => {});
    }

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', req.userId);

    if (error) throw error;

    console.log(`🗑️  Doctor profile deleted: ${existing.name}`);
    res.json({ success: true, message: 'Profile deleted successfully.' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
