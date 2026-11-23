const mongoose = require('mongoose');

const snippetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  language: { type: String, default: 'javascript' },
  code: { type: String, default: '' },
  tags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Snippet', snippetSchema);
