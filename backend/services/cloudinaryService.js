const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64-encoded image or video to Cloudinary.
 * @param {string} fileData - base64 data URI (e.g. "data:image/png;base64,...")
 * @param {object} options
 * @param {string} options.folder - Cloudinary folder (e.g. "doctors/photos")
 * @param {'image'|'video'|'auto'} options.resourceType - Resource type
 * @param {string} [options.publicId] - Optional custom public ID
 * @returns {Promise<{url: string, publicId: string, format: string, width: number, height: number, bytes: number}>}
 */
async function uploadToCloudinary(fileData, { folder = 'arogya-raksha', resourceType = 'auto', publicId } = {}) {
  const uploadOptions = {
    folder,
    resource_type: resourceType,
    quality: 'auto',
    fetch_format: 'auto',
    timeout: 120000,        // 120 second timeout
    chunk_size: 6000000,    // 6MB chunks for large files
  };
  if (publicId) uploadOptions.public_id = publicId;

  // For videos, add eager transformations
  if (resourceType === 'video') {
    uploadOptions.eager = [
      { width: 640, crop: 'scale', format: 'mp4' },
    ];
    uploadOptions.eager_async = true;
  }

  // For images, compress before uploading to reduce transfer size
  if (resourceType === 'image') {
    uploadOptions.transformation = [
      { width: 1200, crop: 'limit' },
      { quality: 'auto' },
    ];
  }

  const result = await cloudinary.uploader.upload(fileData, uploadOptions);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    duration: result.duration || null,
    resourceType: result.resource_type,
    thumbnailUrl: result.resource_type === 'video'
      ? cloudinary.url(result.public_id, { resource_type: 'video', format: 'jpg', transformation: [{ width: 400, crop: 'fill' }] })
      : null,
  };
}

/**
 * Delete a file from Cloudinary by its public ID.
 */
async function deleteFromCloudinary(publicId, resourceType = 'image') {
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  return result;
}

/**
 * Generate a signed upload URL for direct browser uploads.
 */
function generateUploadSignature(folder = 'arogya-raksha') {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );
  return {
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
  };
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  generateUploadSignature,
};
