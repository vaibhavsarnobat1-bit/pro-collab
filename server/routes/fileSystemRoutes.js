const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Root workspace directory (root of pro-collab project)
const WORKSPACE_ROOT = path.resolve(__dirname, '../../');

// Ignored folders/files for security & performance
const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '.gemini',
  '.vscode',
  'dist',
  'build',
  '.DS_Store',
  'package-lock.json'
]);

// Helper: Ensure safe path within workspace
const resolveSafePath = (relativePath = '') => {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.resolve(WORKSPACE_ROOT, normalized);
  if (!absolutePath.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Access denied: Path outside workspace');
  }
  return absolutePath;
};

// Helper: Determine file language by extension
const getLanguageFromFilename = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.html': 'html',
    '.css': 'css',
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
    '.env': 'shell'
  };
  return map[ext] || 'plaintext';
};

// Recursive directory tree builder
const buildDirectoryTree = async (currentDir, relativePath = '', depth = 0) => {
  if (depth > 6) return []; // safety limit
  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const tree = [];

    // Sort directories first, then files alphabetically
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() === b.isDirectory()) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory() ? -1 : 1;
    });

    for (const entry of sorted) {
      if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith('.')) continue;

      const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const entryAbsPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const children = await buildDirectoryTree(entryAbsPath, entryRelPath, depth + 1);
        tree.push({
          name: entry.name,
          path: entryRelPath,
          isDirectory: true,
          children
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
  } catch (err) {
    console.error(`Error reading directory ${currentDir}:`, err.message);
    return [];
  }
};

// GET /api/fs/tree - Get complete workspace directory tree
router.get('/tree', async (req, res) => {
  try {
    const tree = await buildDirectoryTree(WORKSPACE_ROOT);
    res.status(200).json({
      root: path.basename(WORKSPACE_ROOT),
      tree
    });
  } catch (error) {
    console.error('Failed to get directory tree:', error);
    res.status(500).json({ message: 'Failed to read workspace tree', error: error.message });
  }
});

// GET /api/fs/file - Read file content
router.get('/file', async (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ message: 'filePath query param is required' });
    }

    const safePath = resolveSafePath(filePath);
    const stat = await fs.stat(safePath);

    if (stat.isDirectory()) {
      return res.status(400).json({ message: 'Cannot read content of a directory' });
    }

    if (stat.size > 2 * 1024 * 1024) {
      return res.status(400).json({ message: 'File exceeds 2MB size limit' });
    }

    const content = await fs.readFile(safePath, 'utf8');
    const filename = path.basename(safePath);

    res.status(200).json({
      path: filePath.replace(/\\/g, '/'),
      name: filename,
      content,
      language: getLanguageFromFilename(filename),
      size: stat.size,
      lastModified: stat.mtime
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(404).json({ message: 'File not found or unreadable', error: error.message });
  }
});

// POST /api/fs/save - Save file content to disk (Sync with VS Code / Antigravity)
router.post('/save', async (req, res) => {
  try {
    const { filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ message: 'filePath and content are required' });
    }

    const safePath = resolveSafePath(filePath);
    // Ensure parent directories exist
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content, 'utf8');

    console.log(`[FS Bridge] File saved to disk: ${filePath}`);
    res.status(200).json({
      success: true,
      message: 'File saved successfully to local disk',
      path: filePath.replace(/\\/g, '/'),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ message: 'Failed to write file to disk', error: error.message });
  }
});

// POST /api/fs/create - Create new file or folder
router.post('/create', async (req, res) => {
  try {
    const { targetPath, isDirectory, initialContent = '' } = req.body;
    if (!targetPath) {
      return res.status(400).json({ message: 'targetPath is required' });
    }

    const safePath = resolveSafePath(targetPath);

    if (isDirectory) {
      await fs.mkdir(safePath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(safePath), { recursive: true });
      await fs.writeFile(safePath, initialContent, 'utf8');
    }

    res.status(201).json({
      success: true,
      message: `${isDirectory ? 'Directory' : 'File'} created successfully`,
      path: targetPath.replace(/\\/g, '/'),
      isDirectory: !!isDirectory
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Failed to create item', error: error.message });
  }
});

// POST /api/fs/rename - Rename file or folder
router.post('/rename', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ message: 'oldPath and newPath are required' });
    }

    const oldSafe = resolveSafePath(oldPath);
    const newSafe = resolveSafePath(newPath);

    await fs.rename(oldSafe, newSafe);

    res.status(200).json({
      success: true,
      message: 'Renamed successfully',
      oldPath: oldPath.replace(/\\/g, '/'),
      newPath: newPath.replace(/\\/g, '/')
    });
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(500).json({ message: 'Failed to rename item', error: error.message });
  }
});

// POST /api/fs/delete - Delete file or folder
router.post('/delete', async (req, res) => {
  try {
    const { targetPath } = req.body;
    if (!targetPath) {
      return res.status(400).json({ message: 'targetPath is required' });
    }

    const safePath = resolveSafePath(targetPath);
    const stat = await fs.stat(safePath);

    if (stat.isDirectory()) {
      await fs.rm(safePath, { recursive: true, force: true });
    } else {
      await fs.unlink(safePath);
    }

    res.status(200).json({
      success: true,
      message: 'Deleted successfully',
      path: targetPath.replace(/\\/g, '/')
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Failed to delete item', error: error.message });
  }
});

module.exports = router;
