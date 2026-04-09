const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route   POST api/auth/google
// @desc    Verify Google Token and Login/Register User
router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, name: displayName, email, picture: profilePicture } = ticket.getPayload();

    let user = await User.findOne({ googleId });

    if (!user) {
      user = new User({
        googleId,
        displayName,
        email,
        profilePicture,
      });
      await user.save();
    }

    // Create JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ msg: 'Token verification failed' });
  }
});

// @route   GET api/auth/me
router.get('/me', async (req, res) => {
    // Basic me route (middleware would be better, but implementing direct for now)
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user.id);
        res.json(user);
    } catch (err) {
        res.status(401).json({ msg: 'Invalid token' });
    }
});

module.exports = router;
