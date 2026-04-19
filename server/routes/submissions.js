const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const Paper = require('../models/Paper');
const Submission = require('../models/Submission');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { aiLimiter } = require('../middleware/rateLimiter');

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
router.post('/evaluate', aiLimiter, upload.array('solvedPages', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ msg: 'No files uploaded' });

        const { userId, paperId } = req.body;
        const paper = await Paper.findById(paperId);
        if (!paper) return res.status(404).json({ msg: 'Paper not found' });

        const imageUrls = req.files.map(f => f.path);

        // Send as JSON body — matches EvaluationRequest Pydantic model in Python service
        // (URLSearchParams with List[str] Form caused FastAPI 500 errors)
        const aiPayload = {
            image_urls: imageUrls,
            paper_json: JSON.stringify(paper.questions)
        };

        if (!process.env.AI_SERVICE_URL) {
            throw new Error('AI_SERVICE_URL is not defined in environment variables');
        }

        const aiResponse = await axios.post(
            `${process.env.AI_SERVICE_URL}/evaluate-submission`,
            aiPayload,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000  // 2 minutes — image OCR + evaluation takes time
            }
        );

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

// @route   POST api/submissions/evaluate-raw
// @desc    Upload BOTH question paper and answer sheet — no saved paper needed in DB
//          AI reads the question paper, extracts questions, then evaluates the answers
router.post('/evaluate-raw', aiLimiter, upload.fields([
    { name: 'questionPaperPages', maxCount: 10 },   // question paper images
    { name: 'solvedPages', maxCount: 10 }            // answer sheet images
]), async (req, res) => {
    try {
        const qpFiles = req.files['questionPaperPages'];
        const ansFiles = req.files['solvedPages'];

        if (!qpFiles || qpFiles.length === 0)
            return res.status(400).json({ msg: 'No question paper images uploaded' });
        if (!ansFiles || ansFiles.length === 0)
            return res.status(400).json({ msg: 'No answer sheet images uploaded' });

        const { userId, totalMarks = 100 } = req.body;

        const questionPaperUrls = qpFiles.map(f => f.path);
        const answerSheetUrls = ansFiles.map(f => f.path);

        if (!process.env.AI_SERVICE_URL) {
            throw new Error('AI_SERVICE_URL is not defined in environment variables');
        }

        // AI service handles the full pipeline: OCR question paper → evaluate answers
        const aiResponse = await axios.post(
            `${process.env.AI_SERVICE_URL}/evaluate-raw`,
            {
                question_paper_urls: questionPaperUrls,
                answer_sheet_urls: answerSheetUrls,
                total_marks: parseInt(totalMarks)
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 180000  // 3 min — two AI Vision calls run sequentially
            }
        );

        const { extractedQuestions, evaluation, totalMaxMarks } = aiResponse.data;

        // Save as a submission (no paperId since no saved paper exists)
        const newSubmission = new Submission({
            userId,
            paperId: null,              // null for raw evaluation
            solvedImages: answerSheetUrls,
            evaluation: evaluation,
            status: 'completed'
        });

        await newSubmission.save();

        // Return everything the frontend needs
        res.json({
            submission: newSubmission,
            extractedQuestions,
            questionPaperImages: questionPaperUrls,
            totalMaxMarks
        });

    } catch (err) {
        console.error('Raw Evaluation Error:', err.response?.data || err.message);
        res.status(500).json({ msg: 'Raw evaluation failed', detail: err.response?.data?.detail || err.message });
    }
});

module.exports = router;
