const express = require('express');
const aiEngine = require('../services/aiEngine');
const { editProject } = require('../services/aiAgent');
const { listModels } = require('../services/aiProviders');

const router = express.Router();

// The assistant can call a paid model, so cap the chatter. One shared bucket per
// IP is enough to stop a script; a signed-in user gets a larger slice.
const WINDOW_MS = 60000;
const LIMIT_GUEST = 20;
const LIMIT_USER = 60;
const hits = new Map();

const rateLimit = (req, res, next) => {
  const key = `${req.ip}:${req.headers['x-forwarded-for'] || ''}`;
  const now = Date.now();
  const limit = req.user ? LIMIT_USER : LIMIT_GUEST;
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    return res.status(429).json({ message: `Slow down — ${limit} assistant requests per minute. The offline tools (explain, fix, optimize) stay free.` });
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return next();
};

router.get('/status', (req, res) => {
  const status = aiEngine.engineStatus();
  res.json({
    ...status,
    // Honest labelling: "model" means a real LLM answers, "local" means static
    // analysis and a snippet library do.
    label: status.kind === 'local' ? 'Offline engine' : `Model · ${status.model}`,
    templates: aiEngine.templates
  });
});

// Every model the server knows about, with whether its key is present. Keys are
// never returned — only the variable name the operator needs to set.
router.get('/models', (req, res) => {
  const models = listModels();
  res.json({
    models,
    configured: models.filter((model) => model.configured).map((model) => model.id),
    freeCount: models.filter((model) => model.free).length
  });
});

router.post('/chat', rateLimit, async (req, res) => {
  const {
    prompt = '', code = '', language = 'javascript', filePath = '',
    action = 'chat', history = [], modelId = ''
  } = req.body || {};

  if (!String(prompt).trim() && String(action) === 'chat') {
    return res.status(400).json({ message: 'Ask for something specific.' });
  }

  try {
    const result = await aiEngine.ask({
      prompt: String(prompt).slice(0, 6000),
      code: String(code).slice(0, 60000),
      language: String(language).slice(0, 32),
      filePath: String(filePath).slice(0, 240),
      action: String(action).slice(0, 24),
      modelId: String(modelId).slice(0, 64),
      history: Array.isArray(history) ? history.slice(-8) : []
    });
    return res.json(result);
  } catch (error) {
    console.error('ai/chat failed:', error.message);
    return res.status(500).json({ message: 'The assistant could not answer that. Try "explain", "fix" or "optimize".' });
  }
});

// The project agent: returns file operations the browser applies to the room.
router.post('/agent', rateLimit, async (req, res) => {
  const {
    prompt = '', files = {}, activeFilePath = '', modelId = '', history = []
  } = req.body || {};

  if (!String(prompt).trim()) {
    return res.status(400).json({ message: 'Describe the change you want.' });
  }

  try {
    const result = await editProject({
      prompt: String(prompt).slice(0, 6000),
      files,
      activeFilePath: String(activeFilePath).slice(0, 240),
      modelId: String(modelId).slice(0, 64),
      history: Array.isArray(history) ? history.slice(-4) : []
    });
    return res.json(result);
  } catch (error) {
    console.error('ai/agent failed:', error.message);
    return res.status(500).json({ message: 'The project agent could not finish that. Nothing was changed.' });
  }
});

// Used by the editor gutter / problems strip.
router.post('/analyze', (req, res) => {
  const { code = '', language = 'javascript' } = req.body || {};
  res.json({ issues: aiEngine.analyze(String(code).slice(0, 60000), String(language).slice(0, 32)) });
});

module.exports = router;
