const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
    solvedImages: [String], // Array of Cloudinary URLs
    evaluation: {
        totalScore: Number,
        maxScore: Number,
        feedback: [{
            questionIndex: Number,
            obtainedMarks: Number,
            aiFeedback: String,
            isCorrect: Boolean,
            correctAnswer: String // Shown if wrong
        }],
        overallComment: String
    },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
