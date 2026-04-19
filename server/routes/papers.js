const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const Material = require('../models/Material');
const axios = require('axios');
const { aiLimiter } = require('../middleware/rateLimiter');

// @route   POST api/papers/generate
// @desc    Generate a new question paper from material
// OPTIMIZATION: Fetch extractedText from DB instead of trusting/receiving from client
//   - Saves bandwidth (no huge text in request body)
//   - More secure (client can't inject arbitrary text)
//   - Uses already-extracted text from upload step (no duplicate AI calls)
router.post('/generate', aiLimiter, async (req, res) => {
    const { userId, materialIds, config } = req.body;
    
    try {
        if (!process.env.AI_SERVICE_URL) {
            throw new Error('AI_SERVICE_URL is not defined in environment variables');
        }

        // Fetch extracted text directly from MongoDB — no need for client to send it
        const materialDocs = await Material.find({ _id: { $in: materialIds } });
        const combinedText = materialDocs
            .map(m => m.extractedText || '')
            .filter(t => t.trim().length > 0)
            .join('\n\n---\n\n');

        if (!combinedText.trim()) {
            return res.status(400).json({ msg: 'Selected materials have no extracted text. Please re-upload.' });
        }

        // Retry with exponential backoff for Groq 429 rate limits
        const MAX_RETRIES = 3;
        let lastErr = null;
        let aiResponse = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/generate-paper`, {
                    material_text: combinedText,
                    pattern: config.pattern,
                    difficulty: config.difficulty,
                    total_marks: config.totalMarks,
                    mcq_count: config.mcqCount || 0,
                    theory_count: config.theoryCount || 0
                }, {
                    timeout: 120000 // 2 min timeout
                });
                lastErr = null;
                break;
            } catch (retryErr) {
                lastErr = retryErr;
                const status = retryErr.response?.status;
                if (status === 429 && attempt < MAX_RETRIES) {
                    const delay = Math.pow(2, attempt) * 2000;
                    console.warn(`Generation 429 rate-limited. Retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw retryErr;
                }
            }
        }
        if (lastErr) throw lastErr;

        // AI returns a JSON string, extract questions
        const aiData = typeof aiResponse.data === 'string' ? JSON.parse(aiResponse.data) : aiResponse.data;
        
        const newPaper = new Paper({
            userId,
            materialIds,
            title: `Paper from ${materialIds.length} sources - ${new Date().toLocaleDateString()}`,
            config,
            questions: aiData.questions || aiData // Handle different JSON structures
        });

        await newPaper.save();
        res.json(newPaper);
    } catch (err) {
        console.error('Generation Error:', err.response?.data || err.message);
        res.status(500).json({ msg: 'Failed to generate paper' });
    }
});

// @route   GET api/papers/user/:userId
router.get('/user/:userId', async (req, res) => {
    try {
        const papers = await Paper.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(papers);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/papers/:id
// @desc    Get paper by ID
router.get('/:id', async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper) return res.status(404).json({ msg: 'Paper not found' });
        res.json(paper);
    } catch (err) {
        if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Paper not found' });
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/papers/:id
// @desc    Update marks for questions in a paper
router.patch('/:id', async (req, res) => {
    try {
        const { questions } = req.body;
        const paper = await Paper.findByIdAndUpdate(
            req.params.id, 
            { $set: { questions } },
            { returnDocument: 'after' }
        );
        res.json(paper);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/papers/:id
router.delete('/:id', async (req, res) => {
    try {
        await Paper.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Paper deleted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
