const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const pdfParse = require('pdf-parse');
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

// ---------------------------------------------------------------------------
// Helper: Extract text from a PDF buffer locally using pdf-parse (NO API call)
// Returns the extracted text, or empty string if the PDF is scanned/image-based.
// ---------------------------------------------------------------------------
async function extractTextLocally(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    // data.text contains all extracted text from the PDF
    return (data.text || '').trim();
  } catch (err) {
    console.error('Local PDF parse error:', err.message);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Helper: Fall back to AI service for OCR (scanned PDFs / images only)
// ---------------------------------------------------------------------------
async function extractTextViaAI(fileUrl, fileType) {
  if (!process.env.AI_SERVICE_URL) {
    throw new Error('AI_SERVICE_URL is not defined in environment variables');
  }

  const MAX_RETRIES = 3;
  let lastErr = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/extract-text-url`, {
        file_url: fileUrl,
        file_type: fileType
      }, { timeout: 120000 });
      return aiResponse.data.text || '';
    } catch (retryErr) {
      lastErr = retryErr;
      const status = retryErr.response?.status;
      if (status === 429 && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 2000; // 4s, 8s
        console.warn(`AI extraction 429 rate-limited. Retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw retryErr;
      }
    }
  }
  if (lastErr) throw lastErr;
  return '';
}

// @route   POST api/materials/upload
// @desc    Upload study material and extract text
// OPTIMIZATION: PDFs are parsed locally with pdf-parse (zero API calls).
//   AI service is ONLY called for scanned/image-based PDFs or image uploads.
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
    const isPdf = req.file.mimetype.includes('pdf');

    console.log('File uploaded to Cloudinary:', req.file.path);

    let extractedText = '';

    try {
      if (isPdf) {
        // ---------------------------------------------------------------
        // STEP 1: Download PDF from Cloudinary and parse locally (FREE)
        // ---------------------------------------------------------------
        console.log('Downloading PDF for local text extraction...');
        const pdfResponse = await axios.get(req.file.path, {
          responseType: 'arraybuffer',
          timeout: 60000
        });
        const pdfBuffer = Buffer.from(pdfResponse.data);

        extractedText = await extractTextLocally(pdfBuffer);
        console.log(`Local extraction result: ${extractedText.length} characters`);

        // Intelligent truncation for very large documents
        if (extractedText.length > 120000) {
          console.log(`Text too large (${extractedText.length} chars). Truncating intelligently...`);
          extractedText = extractedText.slice(0, 60000)
            + '\n\n[... content truncated for brevity ...]\n\n'
            + extractedText.slice(-40000);
        }

        // ---------------------------------------------------------------
        // STEP 2: If local extraction yields too little text, it's likely
        //         a scanned/image-based PDF → fall back to AI OCR
        // ---------------------------------------------------------------
        if (extractedText.length < 300) {
          console.log('Local extraction insufficient (<300 chars). Falling back to AI Vision OCR...');
          extractedText = await extractTextViaAI(req.file.path, 'pdf');
          console.log(`AI OCR result: ${extractedText.length} characters`);
        } else {
          console.log('✅ PDF text extracted locally — NO AI API call needed!');
        }

      } else {
        // ---------------------------------------------------------------
        // Image files always need AI Vision OCR (no local alternative)
        // ---------------------------------------------------------------
        console.log('Image file detected — using AI Vision OCR...');
        extractedText = await extractTextViaAI(req.file.path, 'image');
        console.log(`AI OCR result: ${extractedText.length} characters`);
      }
    } catch (extractErr) {
      console.error('Text Extraction Error:', extractErr.response?.data || extractErr.message);
      // We still save the material even if extraction fails, for manual viewing
    }

    const newMaterial = new Material({
      userId,
      title,
      fileUrl: req.file.path,
      publicId: req.file.filename,
      fileType: isPdf ? 'pdf' : 'image',
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
