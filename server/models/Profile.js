const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String },
  displayName: { type: String, default: '' },
  bio: { type: String, default: '' },
  roleLabel: { type: String, default: 'Developer' },
  location: { type: String, default: '' },
  github: { type: String, default: '' },
  accent: { type: String, default: '#6366f1' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Profile', profileSchema);
