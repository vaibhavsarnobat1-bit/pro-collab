const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    default: 'Untitled Project'
  },
  language: {
    type: String,
    default: 'javascript'
  },
  content: {
    type: String,
    default: '// Welcome to Pro-Collab Shared Editor\n// Start typing to collaborate in real-time...\n\nfunction helloWorld() {\n  console.log("Hello, Pro-Collab!");\n}\n\nhelloWorld();'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Room', roomSchema);
