// We check the environment variable BEFORE requiring the library 
// to prevent the library from crashing on a malformed URL.
if (process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.startsWith('cloudinary://')) {
  console.warn('Removing malformed CLOUDINARY_URL to prevent library crash.');
  delete process.env.CLOUDINARY_URL;
}

const cloudinary = require('cloudinary').v2;

// Configure using individual keys if URL is missing
if (!process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

module.exports = cloudinary;
