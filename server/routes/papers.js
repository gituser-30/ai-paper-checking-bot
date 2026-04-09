const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const axios = require('axios');

// @route   POST api/papers/generate
// @desc    Generate a new question paper from material
router.post('/generate', async (req, res) => {
    const { userId, materialIds, materialText, config } = req.body;
    
    try {
        const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/generate-paper`, {
            material_text: materialText,
            pattern: config.pattern,
            difficulty: config.difficulty,
            total_marks: config.totalMarks,
            mcq_count: config.mcqCount || 0,
            theory_count: config.theoryCount || 0
        }, {
            timeout: 60000 // 60s timeout for large generation
        });

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
router.post('/:id', async (req, res) => {
    try {
        const { questions } = req.body;
        const paper = await Paper.findByIdAndUpdate(
            req.params.id, 
            { $set: { questions } },
            { new: true }
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
