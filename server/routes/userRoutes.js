const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProfile, saveProfile, getUserStats,
  listSnippets, createSnippet, deleteSnippet
} = require('../services/dataStore');

router.get('/me', protect, async (req, res) => {
  const [profile, stats] = await Promise.all([
    getProfile(req.user.id, req.user.username),
    getUserStats(req.user.id, req.user.username)
  ]);
  res.json({ profile, stats });
});

router.patch('/me', protect, async (req, res) => {
  const profile = await saveProfile(req.user.id, req.user.username, req.body || {});
  res.json({ profile });
});

router.get('/me/snippets', protect, async (req, res) => {
  res.json({ snippets: await listSnippets(req.user.id) });
});

router.post('/me/snippets', protect, async (req, res) => {
  const { title, code } = req.body || {};
  if (!code || !String(code).trim()) {
    return res.status(400).json({ message: 'Snippet needs code content' });
  }
  const snippet = await createSnippet(req.user.id, {
    title,
    language: req.body.language || 'javascript',
    code,
    tags: req.body.tags || []
  });
  res.status(201).json({ snippet });
});

router.delete('/me/snippets/:snippetId', protect, async (req, res) => {
  const removed = await deleteSnippet(req.user.id, req.params.snippetId);
  if (!removed) return res.status(404).json({ message: 'Snippet not found' });
  res.json({ message: 'Snippet deleted' });
});

module.exports = router;
