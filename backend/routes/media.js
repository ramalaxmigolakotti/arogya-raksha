const express = require('express');
const router = express.Router();
const { clerkAuth } = require('../middleware/clerkAuth');
const { uploadToCloudinary, deleteFromCloudinary, generateUploadSignature } = require('../services/cloudinaryService');
const { cacheMiddleware, cacheDel } = require('../services/redisService');
const supabase = require('../supabaseClient');

const TABLE = 'media_uploads';

// ── Validate Cloudinary config at startup ──
const cloudConfigOk = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (!cloudConfigOk) {
  console.error('❌ Missing Cloudinary credentials — media uploads will fail!');
} else {
  console.log('☁️  Cloudinary configured for cloud:', process.env.CLOUDINARY_CLOUD_NAME);
}

// ── Ensure media_uploads table exists ──
(async () => {
  try {
    const { error } = await supabase.from(TABLE).select('id').limit(1);
    if (error) {
      console.error(`❌ media_uploads table check failed: ${error.message}`);
      console.error('   Run media_uploads.sql in Supabase SQL Editor to create the table.');
    }
  } catch (e) {
    console.error('❌ media_uploads table check error:', e.message);
  }
})();

// Upload photo/video (base64)
router.post('/upload', clerkAuth, async (req, res) => {
  try {
    // Pre-check Cloudinary config
    if (!cloudConfigOk) {
      return res.status(503).json({
        success: false,
        message: 'Media uploads are not configured. Missing Cloudinary credentials.',
      });
    }

    const { fileData, mediaType, title, description } = req.body;
    const user = req.user;

    if (!fileData) {
      return res.status(400).json({ success: false, message: 'No file data provided.' });
    }

    // Validate base64 data URI format
    if (!fileData.startsWith('data:')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file data format. Expected a base64 data URI (data:image/... or data:video/...).',
      });
    }

    const resourceType = mediaType === 'video' ? 'video' : 'image';
    const folder = `arogya-raksha/${user.role}s/${user.id}`;

    console.log(`📤 Uploading ${resourceType} for user ${user.id} (${user.name || 'unknown'})...`);

    let cloudResult;
    try {
      cloudResult = await uploadToCloudinary(fileData, {
        folder,
        resourceType,
      });
    } catch (cloudErr) {
      console.error('☁️  Cloudinary upload failed:', cloudErr.message || cloudErr);
      const msg = cloudErr.message || 'Unknown Cloudinary error';
      // Surface common Cloudinary errors
      if (msg.includes('Invalid API key') || msg.includes('unknown api key') || msg.includes('401')) {
        return res.status(500).json({
          success: false,
          message: 'Cloudinary authentication failed. Please check your CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.',
        });
      }
      if (msg.includes('File size too large')) {
        return res.status(413).json({ success: false, message: 'File too large for Cloudinary. Max 10MB for free tier.' });
      }
      return res.status(500).json({ success: false, message: `Upload to cloud storage failed: ${msg}` });
    }

    // Store metadata in Supabase
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: user.id,
        user_name: user.name || 'Unknown',
        user_role: user.role || 'patient',
        media_type: resourceType,
        url: cloudResult.url,
        thumbnail_url: cloudResult.thumbnailUrl,
        public_id: cloudResult.publicId,
        title: title || '',
        description: description || '',
        format: cloudResult.format,
        width: cloudResult.width,
        height: cloudResult.height,
        bytes: cloudResult.bytes,
        duration: cloudResult.duration,
      })
      .select()
      .single();

    if (error) {
      console.error('💾 Supabase insert error:', error.message, error.details || '');
      // If table doesn't exist, give a helpful message
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return res.status(500).json({
          success: false,
          message: 'media_uploads table does not exist. Run media_uploads.sql in Supabase SQL Editor.',
        });
      }
      throw error;
    }

    console.log(`✅ Upload complete: ${cloudResult.publicId}`);

    // Bust gallery cache on new upload
    await cacheDel('cache:/api/media/doctors/*');
    res.status(201).json({ success: true, media: data });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed. Check server logs.' });
  }
});

// Update user avatar
router.post('/avatar', clerkAuth, async (req, res) => {
  try {
    if (!cloudConfigOk) {
      return res.status(503).json({ success: false, message: 'Cloudinary not configured.' });
    }

    const { fileData } = req.body;
    const user = req.user;

    if (!fileData) {
      return res.status(400).json({ success: false, message: 'No file data provided.' });
    }

    let cloudResult;
    try {
      cloudResult = await uploadToCloudinary(fileData, {
        folder: `arogya-raksha/avatars`,
        resourceType: 'image',
        publicId: `avatar-${user.id}`,
      });
    } catch (cloudErr) {
      console.error('☁️  Avatar upload failed:', cloudErr.message);
      return res.status(500).json({ success: false, message: `Avatar upload failed: ${cloudErr.message}` });
    }

    // Update user avatar in DB
    const { data, error } = await supabase
      .from('users')
      .update({ avatar: cloudResult.url, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    const { password, ...safeUser } = data;
    res.json({ success: true, user: safeUser, avatarUrl: cloudResult.url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my uploads
router.get('/my', clerkAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Graceful fallback if table doesn't exist
      if (error.message?.includes('does not exist')) {
        return res.json({ success: true, media: [] });
      }
      throw error;
    }
    res.json({ success: true, media: data || [] });
  } catch (error) {
    console.error('Get my media error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all doctor media (public — for the gallery) — cached 60s
router.get('/doctors/gallery', cacheMiddleware(60), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_role', 'doctor')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (error.message?.includes('does not exist')) {
        return res.json({ success: true, media: [] });
      }
      throw error;
    }
    res.json({ success: true, media: data || [] });
  } catch (error) {
    console.error('Get doctor gallery error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get media by specific doctor (user_id)
router.get('/doctors/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', req.params.userId)
      .eq('user_role', 'doctor')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('does not exist')) {
        return res.json({ success: true, media: [] });
      }
      throw error;
    }
    res.json({ success: true, media: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a media upload
router.delete('/:id', clerkAuth, async (req, res) => {
  try {
    // First get the record to verify ownership
    const { data: media, error: fetchErr } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !media) {
      return res.status(404).json({ success: false, message: 'Media not found.' });
    }

    if (media.user_id !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(media.public_id, media.media_type);
    } catch (cloudErr) {
      console.warn('☁️  Cloudinary delete warning:', cloudErr.message);
      // Don't block DB delete if Cloudinary fails
    }

    // Delete from DB
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    // Bust gallery cache on delete
    await cacheDel('cache:/api/media/doctors/*');
    res.json({ success: true, message: 'Media deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get upload signature for direct browser uploads
router.get('/sign', clerkAuth, (req, res) => {
  try {
    const folder = `arogya-raksha/${req.user.role}s/${req.userId}`;
    const signData = generateUploadSignature(folder);
    res.json({ success: true, ...signData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
