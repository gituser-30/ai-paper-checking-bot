const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    materialIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true }],
    title: String,
    config: {
        pattern: { type: String, enum: ['mcq', 'theory', 'mixed'], default: 'mixed' },
        difficulty: { type: String, enum: ['beginner', 'intermediate', 'advance'], default: 'intermediate' },
        totalMarks: Number
    },
    questions: [{
        questionText: String,
        questionType: { type: String, enum: ['mcq', 'theory'] },
        options: [String], // for MCQ
        correctAnswer: String,
        marks: Number
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Paper', paperSchema);
