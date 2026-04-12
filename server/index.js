require('dotenv').config();

// Validate Environment Variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'AI_SERVICE_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('CRITICAL ERROR: Missing environment variables:', missingVars.join(', '));
  console.error('Please check your .env file or Render dashboard settings.');
  // We don't exit(1) to allow the server to potentially run for other features, 
  // but specific routes will fail gracefully.
} else {
  console.log('Environment variables loaded successfully.');
}

const path = require('path');


const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/submissions', require('./routes/submissions'));

app.get('/api', (req, res) => res.send('API Running'));

// Serve static assets (JS, CSS, etc.)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Fix for React Router (Catch-all)
// Using app.use() without a path avoids path-to-regexp entirely, fixing Express 5 crashes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
