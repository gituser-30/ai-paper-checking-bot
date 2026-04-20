const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const Material = require('../models/Material');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Setup Multer with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'study_materials',
    resource_type: 'auto',
  },
});

const upload = multer({ storage: storage });

// @route   POST api/materials/upload
// @desc    Upload study material and extract text
router.post('/upload', (req, res, next) => {
  // Wrap multer in manual handler so Cloudinary upload errors are caught
  upload.single('file')(req, res, (multerErr) => {
    if (multerErr) {
      console.error('Multer/Cloudinary upload error:', multerErr.message || multerErr);
      return res.status(500).json({ msg: 'File upload failed', error: multerErr.message || 'Unknown upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const { userId, title } = req.body;

    console.log('File uploaded to Cloudinary:', req.file.path);

    // Call AI Service to extract text (with retry for Groq rate limits)
    let extractedText = '';
    try {
      if (!process.env.AI_SERVICE_URL) {
        throw new Error('AI_SERVICE_URL is not defined in environment variables');
      }

      const MAX_RETRIES = 3;
      let lastErr = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/extract-text-url`, {
            file_url: req.file.path,
            file_type: req.file.mimetype.includes('pdf') ? 'pdf' : 'image'
          }, { timeout: 120000 });
          extractedText = aiResponse.data.text;
          lastErr = null;
          break; // Success — exit retry loop
        } catch (retryErr) {
          lastErr = retryErr;
          const status = retryErr.response?.status;
          if (status === 429 && attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 2000; // 4s, 8s
            console.warn(`AI extraction 429 rate-limited. Retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            throw retryErr; // Non-retryable or final attempt
          }
        }
      }
      if (lastErr) throw lastErr;
    } catch (aiErr) {
      console.error('AI Extraction Error:', aiErr.response?.data || aiErr.message);
      // We still save the material even if AI extraction fails, for manual viewing
    }

    const newMaterial = new Material({
      userId,
      title,
      fileUrl: req.file.path,
      publicId: req.file.filename,
      fileType: req.file.mimetype.includes('pdf') ? 'pdf' : 'image',
      extractedText
    });

    await newMaterial.save();
    res.json(newMaterial);
  } catch (err) {
    console.error('Material upload error:', err.message);
    console.error('Full error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/materials-user/:userId
router.get('/user/:userId', async (req, res) => {
    try {
        const materials = await Material.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(materials);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/materials/:id
// @desc    Delete material and its file from Cloudinary
router.delete('/:id', async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) return res.status(404).json({ msg: 'Material not found' });

        // Delete from Cloudinary if publicId exists
        if (material.publicId) {
            await cloudinary.uploader.destroy(material.publicId);
        }

        await material.deleteOne();
        res.json({ msg: 'Material removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
