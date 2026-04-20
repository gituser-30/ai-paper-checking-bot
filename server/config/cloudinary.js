// We check the environment variable BEFORE requiring the library 
// to prevent the library from crashing on a malformed URL.
if (process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.startsWith('cloudinary://')) {
  console.warn('Removing malformed CLOUDINARY_URL to prevent library crash.');
  delete process.env.CLOUDINARY_URL;
}

const cloudinary = require('cloudinary').v2;

// Always configure explicitly using individual keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Validate config at startup
const cfg = cloudinary.config();
if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
  console.error('❌ Cloudinary config INCOMPLETE:', {
    cloud_name: cfg.cloud_name || 'MISSING',
    api_key: cfg.api_key ? '✓ set' : 'MISSING',
    api_secret: cfg.api_secret ? '✓ set' : 'MISSING',
  });
} else {
  console.log('✅ Cloudinary configured:', { cloud_name: cfg.cloud_name });
}

module.exports = cloudinary;
