const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');

/*
 * Server-side workspace bridge.
 *
 * This used to resolve against the repository root with no authentication at
 * all, which let any anonymous visitor overwrite or delete the project's own
 * source files. Every route now requires a valid JWT and is confined to a
 * per-user sandbox under server/data/workspaces, so one account can never read
 * or clobber another's files.
 *
 * Note this is separate from the browser File System Access flow in the
 * workspace UI ("Open Folder"), which touches the visitor's own disk directly
 * and never goes through this API.
 */
const WORKSPACE_ROOT = path.resolve(__dirname, '../data/workspaces');

const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '.DS_Store',
  'package-lock.json'
]);

const getLanguageFromFilename = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'css',
    '.json': 'json',
    '.md': 'markdown',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'cpp',
    '.java': 'java',
    '.rs': 'rust',
    '.go': 'go',
    '.sql': 'sql',
    '.sh': 'shell',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.xml': 'xml'
  };
  return map[ext] || 'plaintext';
};

// Per-user root, created on first use.
const userRoot = (userId) => path.join(WORKSPACE_ROOT, String(userId));

// Resolve a client-supplied relative path and prove it stays inside the sandbox
// after normalization, symlink resolution and case folding.
const resolveSafePath = async (userId, relativePath = '') => {
  const root = userRoot(userId);
  await fs.mkdir(root, { recursive: true });

  const requested = String(relativePath).replace(/\\/g, '/');

  if (path.isAbsolute(requested)) {
    throw Object.assign(new Error('Absolute paths are not allowed'), { status: 400 });
  }

  const segments = requested.split('/').filter((segment) => segment !== '' && segment !== '.');
  if (segments.some((segment) => segment === '..')) {
    throw Object.assign(new Error('Access denied: path escapes the workspace'), { status: 403 });
  }

  const absolutePath = path.resolve(root, ...segments);

  // lexical containment check
  if (absolutePath !== root && !absolutePath.startsWith(root + path.sep)) {
    throw Object.assign(new Error('Access denied: path escapes the workspace'), { status: 403 });
  }

  // containment check after following symlinks, for anything that already exists
  let probe = absolutePath;
  while (probe !== path.dirname(probe) && !fsSync.existsSync(probe)) {
    probe = path.dirname(probe);
  }
  const realProbe = await fs.realpath(probe);
  const realRoot = await fs.realpath(root);
  if (realProbe !== realRoot && !realProbe.startsWith(realRoot + path.sep)) {
    throw Object.assign(new Error('Access denied: path escapes the workspace'), { status: 403 });
  }

  return { root, absolutePath, relativePath: segments.join('/') };
};

const buildDirectoryTree = async (currentDir, relativePath = '', depth = 0) => {
  if (depth > 8) return [];
  let entries;
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const tree = [];
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
    return a.isDirectory() ? -1 : 1;
  });

  for (const entry of sorted) {
    if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith('.')) continue;

    const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const entryAbsPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      tree.push({
        name: entry.name,
        path: entryRelPath,
        isDirectory: true,
        children: await buildDirectoryTree(entryAbsPath, entryRelPath, depth + 1)
      });
    } else {
      tree.push({
        name: entry.name,
        path: entryRelPath,
        isDirectory: false,
        language: getLanguageFromFilename(entry.name)
      });
    }
  }

  return tree;
};

// A friendly starter project so a brand-new sandbox is not an empty tree.
const STARTER_FILES = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Pro-Collab sandbox</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="card">
      <h1 id="headline">Edit me</h1>
      <p>The preview panel re-renders as you type.</p>
      <button id="tap">Tap count: <span id="count">0</span></button>
    </main>
    <script src="app.js"></script>
  </body>
</html>
`,
  'styles.css': `* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0b1020;
  color: #e8ecf8;
  font-family: system-ui, sans-serif;
}
.card {
  padding: 32px 40px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
}
button {
  margin-top: 16px;
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: #5b6cff;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
`,
  'app.js': `const button = document.getElementById('tap');
const count = document.getElementById('count');

let taps = 0;
button.addEventListener('click', () => {
  taps += 1;
  count.textContent = taps;
  console.log('taps', taps);
});
`
};

const seedStarterFiles = async (root) => {
  const existing = await fs.readdir(root).catch(() => []);
  if (existing.length > 0) return;
  for (const [name, content] of Object.entries(STARTER_FILES)) {
    await fs.writeFile(path.join(root, name), content, 'utf8');
  }
};

const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) console.error('[fs] unexpected error:', error);
    res.status(status).json({ message: error.message || 'Filesystem request failed' });
  }
};

router.use(protect);

// GET /api/fs/tree
router.get('/tree', wrap(async (req, res) => {
  const root = userRoot(req.user.id);
  await fs.mkdir(root, { recursive: true });
  await seedStarterFiles(root);
  res.json({ root: 'workspace', tree: await buildDirectoryTree(root) });
}));

// GET /api/fs/file?filePath=
router.get('/file', wrap(async (req, res) => {
  const { filePath } = req.query;
  if (!filePath) return res.status(400).json({ message: 'filePath query param is required' });

  const { absolutePath } = await resolveSafePath(req.user.id, filePath);
  const stat = await fs.stat(absolutePath);
  if (stat.isDirectory()) return res.status(400).json({ message: 'Cannot read content of a directory' });
  if (stat.size > 2 * 1024 * 1024) return res.status(400).json({ message: 'File exceeds 2MB size limit' });

  const content = await fs.readFile(absolutePath, 'utf8');
  const name = path.basename(absolutePath);

  res.json({
    path: String(filePath).replace(/\\/g, '/'),
    name,
    content,
    language: getLanguageFromFilename(name),
    size: stat.size,
    lastModified: stat.mtime
  });
}));

// POST /api/fs/save  { filePath, content }
router.post('/save', wrap(async (req, res) => {
  const { filePath, content } = req.body || {};
  if (!filePath || content === undefined) {
    return res.status(400).json({ message: 'filePath and content are required' });
  }

  const { absolutePath, relativePath } = await resolveSafePath(req.user.id, filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, String(content), 'utf8');

  res.json({ success: true, message: 'Saved', path: relativePath, timestamp: new Date() });
}));

// POST /api/fs/create  { targetPath, isDirectory, initialContent }
router.post('/create', wrap(async (req, res) => {
  const { targetPath, isDirectory, initialContent = '' } = req.body || {};
  if (!targetPath) return res.status(400).json({ message: 'targetPath is required' });

  const { absolutePath, relativePath } = await resolveSafePath(req.user.id, targetPath);

  if (isDirectory) {
    await fs.mkdir(absolutePath, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    const handle = await fs.open(absolutePath, 'wx').catch((error) => {
      if (error.code === 'EEXIST') throw Object.assign(new Error('That name is already taken'), { status: 409 });
      throw error;
    });
    await handle.close();
    if (initialContent) await fs.writeFile(absolutePath, String(initialContent), 'utf8');
  }

  res.status(201).json({
    success: true,
    message: isDirectory ? 'Folder created' : 'File created',
    path: relativePath,
    isDirectory: !!isDirectory,
    language: isDirectory ? undefined : getLanguageFromFilename(path.basename(absolutePath))
  });
}));

// POST /api/fs/rename  { oldPath, newPath }
router.post('/rename', wrap(async (req, res) => {
  const { oldPath, newPath } = req.body || {};
  if (!oldPath || !newPath) return res.status(400).json({ message: 'oldPath and newPath are required' });

  const from = await resolveSafePath(req.user.id, oldPath);
  const to = await resolveSafePath(req.user.id, newPath);

  if (from.absolutePath === to.absolutePath) {
    return res.status(400).json({ message: 'New name matches the current name' });
  }

  await fs.rename(from.absolutePath, to.absolutePath);

  res.json({ success: true, message: 'Renamed', oldPath: from.relativePath, newPath: to.relativePath });
}));

// POST /api/fs/delete  { targetPath }
router.post('/delete', wrap(async (req, res) => {
  const { targetPath } = req.body || {};
  if (!targetPath) return res.status(400).json({ message: 'targetPath is required' });

  const { absolutePath, relativePath } = await resolveSafePath(req.user.id, targetPath);
  if (!relativePath) return res.status(400).json({ message: 'Cannot delete the workspace root' });

  await fs.rm(absolutePath, { recursive: true, force: true });

  res.json({ success: true, message: 'Deleted', path: relativePath });
}));

module.exports = router;
