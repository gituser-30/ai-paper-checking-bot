const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: String, // Cloudinary ID
    fileType: { type: String, enum: ['pdf', 'image'], required: true },
    extractedText: String, // Cached text from AI service
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', materialSchema);
