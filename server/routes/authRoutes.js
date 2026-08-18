const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, protect } = require('../middleware/authMiddleware');
const { findUserByUsername, createUser } = require('../services/dataStore');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Role assignment: if username is explicitly admin, set role admin, else user
    const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';

    const newUser = await createUser({ username, password, role });
    
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and Password are required' });
    }

    const normUsername = username.trim().toLowerCase();

    // Special logic requirement check: Username === 'admin' && Password === 'admin123'
    if (normUsername === 'admin' && password === 'admin123') {
      const adminToken = jwt.sign(
        { id: 'admin_id_001', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        message: 'Admin login successful',
        token: adminToken,
        user: {
          id: 'admin_id_001',
          username: 'admin',
          role: 'admin'
        },
        redirect: '/admin-dashboard'
      });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    const token = jwt.sign(
      { id: user._id || user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const redirectPath = user.role === 'admin' ? '/admin-dashboard' : '/workspace';

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id || user.id,
        username: user.username,
        role: user.role
      },
      redirect: redirectPath
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    user: req.user
  });
});

module.exports = router;
