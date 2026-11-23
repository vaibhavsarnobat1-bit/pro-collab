/**
 * aiAgent — the part of the assistant that is allowed to change the project.
 *
 * Chat answers are read-only. This module does the other half: it hands the
 * whole room to a model and asks for a plan plus file operations, so "add a
 * pricing section" actually edits index.html instead of printing a snippet the
 * visitor has to copy by hand.
 *
 * The model only ever proposes operations. They are validated here and applied
 * by the browser through the same socket events a person would use, so every
 * collaborator sees the change and the room log records it.
 */

const { resolveProvider, callModel, listModels } = require('./aiProviders');

const MAX_FILES = 60;
const MAX_FILE_CHARS = 14000;
const MAX_TOTAL_CHARS = 90000;
const MAX_OPERATIONS = 24;
const MAX_FILE_PATH = 200;

const AGENT_SYSTEM = [
  'You are the project agent inside Pro-Collab, a collaborative browser IDE.',
  'You are given the complete text of the room project and one request.',
  'You must answer with JSON only, no prose before or after it, in this shape:',
  '{"reply":"one short paragraph describing what you changed","operations":[{"type":"write","path":"relative/path.ext","content":"full new file content"}]}',
  'Rules:',
  '- "write" replaces a whole file or creates it. Always send the complete file, never a diff or a fragment.',
  '- "delete" needs only {"type":"delete","path":"..."}.',
  '- Reuse the existing paths when editing. Only invent a new path when a new file is genuinely needed.',
  '- Keep the project runnable in a static preview: plain HTML, CSS and browser JavaScript. No build step, no imports of npm packages.',
  '- If the request is already satisfied or unsafe, return "operations": [] and explain why in "reply".',
  '- Never include secrets, keys or tokens in file content.'
].join('\n');

const normalizePath = (value) =>
  String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');

const isSafePath = (value) => {
  if (!value || value.length > MAX_FILE_PATH) return false;
  if (value.split('/').some((segment) => segment === '..' || segment === '')) return false;
  return /^[\w./@()[\] -]+$/.test(value);
};

/** Files may arrive as an object map or an array; normalise both. */
const normalizeFiles = (files) => {
  const entries = Array.isArray(files)
    ? files.map((file) => [file?.path || file?.name, file])
    : Object.entries(files || {});

  return entries
    .map(([key, value]) => {
      const path = normalizePath(typeof value === 'string' ? key : value?.path || key);
      const content = typeof value === 'string' ? value : value?.content;
      return { path, content: typeof content === 'string' ? content : '' };
    })
    .filter((file) => isSafePath(file.path));
};

const renderProject = (files, activeFilePath) => {
  let budget = MAX_TOTAL_CHARS;
  const chunks = [];

  const ordered = [...files].sort((a, b) => {
    if (a.path === activeFilePath) return -1;
    if (b.path === activeFilePath) return 1;
    return a.path.localeCompare(b.path);
  });

  for (const file of ordered.slice(0, MAX_FILES)) {
    if (budget <= 0) {
      chunks.push('… remaining files omitted to fit the context window');
      break;
    }
    const limit = Math.min(MAX_FILE_CHARS, budget);
    const body = file.content.length > limit
      ? `${file.content.slice(0, limit)}\n… truncated (${file.content.length} characters total)`
      : file.content;
    budget -= Math.min(file.content.length, limit);
    chunks.push(`--- ${file.path}${file.path === activeFilePath ? ' (open in the editor)' : ''} ---\n${body}`);
  }

  return chunks.join('\n\n');
};

const extractJson = (raw) => {
  const text = String(raw || '').trim();

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1].trim() : text;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1) {
    if (candidate.startsWith('[')) {
      const arrayEnd = candidate.lastIndexOf(']');
      if (arrayEnd !== -1) return JSON.parse(candidate.slice(0, arrayEnd + 1));
    }
    return null;
  }
  return JSON.parse(candidate.slice(start, end + 1));
};

const validateOperations = (raw) => {
  const list = Array.isArray(raw) ? raw : raw?.operations;
  if (!Array.isArray(list)) return [];

  const seen = new Set();
  const operations = [];

  for (const item of list.slice(0, MAX_OPERATIONS)) {
    const type = String(item?.type || '').toLowerCase();
    const path = normalizePath(item?.path);
    if (!isSafePath(path)) continue;
    if (type === 'delete') {
      if (seen.has(path)) continue;
      seen.add(path);
      operations.push({ type: 'delete', path });
      continue;
    }
    if (type !== 'write' && type !== 'create' && type !== 'update') continue;
    if (typeof item.content !== 'string') continue;
    if (seen.has(path)) continue;
    seen.add(path);
    operations.push({ type: 'write', path, content: item.content });
  }

  return operations;
};

const offlineNote = () => {
  const configured = listModels().filter((model) => model.configured).length;
  if (configured) {
    return 'The model did not answer, so nothing was changed. Check the model name and its key, then try again.';
  }
  return [
    'Project editing needs a model key on the server. Add one of these to server/.env and restart:',
    '  GROQ_API_KEY, GEMINI_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY,',
    '  MISTRAL_API_KEY, TOGETHER_API_KEY or GITHUB_MODELS_TOKEN.',
    'The free tiers are enough — no card needed. Until then the editor, chat and preview work normally.'
  ].join('\n');
};

/**
 * Ask a model to change the project.
 * @returns {Promise<{reply: string, operations: Array, engine: string, note?: string}>}
 */
async function editProject({ prompt = '', files = {}, activeFilePath = '', modelId = '', history = [] }) {
  const request = String(prompt || '').trim();
  if (!request) {
    return { reply: 'Describe the change you want, for example "add a pricing section to index.html".', operations: [], engine: 'local' };
  }

  const provider = resolveProvider(modelId);
  if (!provider) {
    return { reply: offlineNote(), operations: [], engine: 'local', note: 'no model key configured' };
  }

  const fileList = normalizeFiles(files);
  if (!fileList.length) {
    return {
      reply: 'This room has no files yet. Create or import a file first, then ask me to change it.',
      operations: [],
      engine: provider.id
    };
  }

  const recent = history
    .slice(-4)
    .map((message) => `${message.sender === 'user' ? 'User' : 'Assistant'}: ${String(message.text || '').slice(0, 600)}`)
    .join('\n\n');

  const payload = [
    `Open file: ${activeFilePath || 'none'}`,
    '',
    'Project files:',
    renderProject(fileList, normalizePath(activeFilePath)),
    recent ? `\nEarlier conversation:\n${recent}` : '',
    '',
    `Request: ${request.slice(0, 4000)}`
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const raw = await callModel({
      provider,
      system: AGENT_SYSTEM,
      prompt: payload,
      temperature: 0.15,
      maxTokens: 4000,
      signal: controller.signal
    });

    let parsed = null;
    try {
      parsed = extractJson(raw);
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return {
        reply: raw.slice(0, 4000) || 'The model returned nothing usable.',
        operations: [],
        engine: `model:${provider.model}`,
        note: 'The reply was not valid JSON, so nothing was applied.'
      };
    }

    const operations = validateOperations(parsed);
    const reply = typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim()
      : operations.length
        ? `Prepared ${operations.length} file change${operations.length === 1 ? '' : 's'}.`
        : 'No file changes were needed.';

    return {
      reply,
      operations,
      engine: `model:${provider.model}`,
      note: operations.length ? '' : 'The model decided no files needed to change.'
    };
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'the model timed out after 60s' : error.message;
    return {
      reply: offlineNote(),
      operations: [],
      engine: 'local',
      note: `Model call failed (${String(reason).slice(0, 200)}).`
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { editProject, AGENT_SYSTEM };
