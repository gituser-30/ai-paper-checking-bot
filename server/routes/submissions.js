const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const Paper = require('../models/Paper');
const Submission = require('../models/Submission');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const FormData = require('form-data');

// Setup Multer for multiple images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'solved_papers',
    resource_type: 'auto',
  },
});

const upload = multer({ storage: storage });

// @route   POST api/submissions/evaluate
// @desc    Upload solved paper images and get AI evaluation
router.post('/evaluate', upload.array('solvedPages', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ msg: 'No files uploaded' });

        const { userId, paperId } = req.body;
        const paper = await Paper.findById(paperId);
        if (!paper) return res.status(404).json({ msg: 'Paper not found' });

        const imageUrls = req.files.map(f => f.path);

        // Prepare data for FastAPI - Using FormData for multi-image support if needed, 
        // but here we just pass URLs as it's cleaner for Cloudinary
        const form = new URLSearchParams();
        imageUrls.forEach(url => form.append('image_urls', url));
        form.append('paper_json', JSON.stringify(paper.questions));

        const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/evaluate-submission`, form, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const evaluationData = typeof aiResponse.data === 'string' ? JSON.parse(aiResponse.data) : aiResponse.data;

        const newSubmission = new Submission({
            userId,
            paperId,
            solvedImages: imageUrls,
            evaluation: evaluationData,
            status: 'completed'
        });

        await newSubmission.save();
        res.json(newSubmission);
    } catch (err) {
        console.error('Evaluation Error:', err.response?.data || err.message);
        res.status(500).json({ msg: 'Evaluation failed' });
    }
});

// @route   GET api/submissions/user/:userId
router.get('/user/:userId', async (req, res) => {
    try {
        const submissions = await Submission.find({ userId: req.params.userId })
            .populate('paperId', 'title')
            .sort({ createdAt: -1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
