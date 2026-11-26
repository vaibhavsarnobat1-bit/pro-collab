import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/editor.css';
import {
  AlertCircle,
  ExternalLink,
  FileCode,
  Monitor,
  Play,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  Terminal,
  X
} from 'lucide-react';

const MAX_LOGS = 200;
const MAX_LOG_LENGTH = 4000;
const AUTO_RUN_DELAY_MS = 600;
const LOG_LEVELS = ['log', 'info', 'warn', 'error', 'debug', 'table', 'system'];
const SCRIPT_EXTENSIONS = ['js', 'mjs', 'cjs'];
const COMPILED_EXTENSIONS = ['jsx', 'ts', 'tsx', 'vue', 'svelte'];
const BABEL_EXTENSIONS = ['jsx', 'ts', 'tsx'];
const STYLE_EXTENSIONS = ['css'];
const BABEL_RUNTIME_SCRIPT = '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>';

/* ------------------------------------------------------------------ *
 * Sandbox capture runtime.
 * Serialised into the preview document with Function.prototype.toString,
 * so it must stay fully self-contained (no closure references).
 * ------------------------------------------------------------------ */
function previewCaptureRuntime(parentOrigin, maxMessageLength) {
  var TARGET = parentOrigin || '*';
  var LIMIT = maxMessageLength || 4000;

  function send(level, message, source) {
    var text = message === null || message === undefined ? '' : String(message);
    if (text.length > LIMIT) text = text.slice(0, LIMIT) + ' ... truncated';
    try {
      parent.postMessage(
        { __proCollabPreview: 1, level: level, message: text, source: source || '' },
        TARGET
      );
    } catch (err) {
      /* the frame can be detached mid-post; nothing useful to do */
    }
  }

  function sendClear() {
    try {
      parent.postMessage({ __proCollabPreview: 1, action: 'clear' }, TARGET);
    } catch (err) {
      /* ignore */
    }
  }

  function sourceOf(name) {
    if (!name || typeof name !== 'string') return '';
    var cleaned = name.replace(/^[a-z][a-z\d+\-.]*:\/\/[^/]*/i, '').replace(/^about:/i, '');
    if (!cleaned || cleaned === 'srcdoc' || cleaned === 'blank') return '';
    return cleaned;
  }

  function formatValue(value, depth, seen) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    var type = typeof value;
    if (type === 'string') return depth === 0 ? value : JSON.stringify(value);
    if (type === 'number' || type === 'boolean' || type === 'bigint') return String(value);
    if (type === 'function') return '[Function: ' + (value.name || 'anonymous') + ']';
    if (type === 'symbol') return String(value);
    if (type === 'object') {
      if (seen.indexOf(value) !== -1) return '[Circular]';
      if (value instanceof Error) return value.name + ': ' + value.message;
      if (depth >= 3) return Array.isArray(value) ? '[Array]' : '[Object]';
      var next = seen.concat([value]);
      if (Array.isArray(value)) {
        var head = value.slice(0, 40).map(function (item) {
          return formatValue(item, depth + 1, next);
        });
        if (value.length > 40) head.push('... ' + (value.length - 40) + ' more items');
        return '[' + head.join(', ') + ']';
      }
      if (typeof Node !== 'undefined' && value instanceof Node) {
        return value.nodeName === '#text' ? '#text "' + value.nodeValue + '"' : '<' + value.nodeName.toLowerCase() + '>';
      }
      var serialized;
      try {
        serialized = JSON.stringify(value, function (key, val) {
          if (typeof val === 'function') return '[Function]';
          if (val instanceof Error) return val.name + ': ' + val.message;
          return val;
        });
      } catch (err) {
        serialized = undefined;
      }
      if (typeof serialized === 'string') return serialized;
      var keys = Object.keys(value);
      var shown = keys.slice(0, 24).map(function (key) {
        return key + ': ' + formatValue(value[key], depth + 1, next);
      });
      if (keys.length > 24) shown.push('... ' + (keys.length - 24) + ' more');
      return '{ ' + shown.join(', ') + ' }';
    }
    return String(value);
  }

  function applyFormatters(first, rest) {
    if (typeof first !== 'string' || first.indexOf('%') === -1) return null;
    var index = 0;
    var rendered = first.replace(/%[sdifoOc%]/g, function (token) {
      if (token === '%%') return '%';
      if (token === '%c') {
        index += 1;
        return '';
      }
      if (index >= rest.length) return token;
      var arg = rest[index++];
      if (token === '%d' || token === '%i') {
        var whole = Number(arg);
        return Number.isNaN(whole) ? 'NaN' : String(Math.trunc(whole));
      }
      if (token === '%f') return String(Number(arg));
      return typeof arg === 'string' ? arg : formatValue(arg, 0, []);
    });
    var trailing = rest.slice(index);
    if (trailing.length) {
      rendered += ' ' + trailing.map(function (arg) {
        return formatValue(arg, 0, []);
      }).join(' ');
    }
    return rendered;
  }

  function formatArgs(args) {
    var list = Array.prototype.slice.call(args);
    if (list.length && typeof list[0] === 'string') {
      var formatted = applyFormatters(list[0], list.slice(1));
      if (formatted !== null) return formatted;
    }
    return list.map(function (arg) {
      return formatValue(arg, 0, []);
    }).join(' ');
  }

  function formatTable(data) {
    if (data === null || data === undefined) return String(data);
    var rows = Array.isArray(data) ? data.slice() : Object.keys(data).map(function (key) {
      return data[key];
    });
    var columns = [];
    rows.forEach(function (row) {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        Object.keys(row).forEach(function (key) {
          if (columns.indexOf(key) === -1) columns.push(key);
        });
      }
    });
    if (!columns.length) return formatValue(data, 0, []);
    var lines = ['(index) | ' + columns.join(' | ')];
    rows.slice(0, 60).forEach(function (row, position) {
      var cells = columns.map(function (key) {
        var cell = row === null || row === undefined ? '' : row[key];
        return cell && typeof cell === 'object' ? formatValue(cell, 2, []) : String(cell);
      });
      lines.push(position + ' | ' + cells.join(' | '));
    });
    if (rows.length > 60) lines.push('... ' + (rows.length - 60) + ' more rows');
    return lines.join('\n');
  }

  function patchMethod(name) {
    var original = typeof console[name] === 'function' ? console[name].bind(console) : null;
    var reportLevel = name === 'trace' || name === 'dir' ? 'debug' : name;
    console[name] = function () {
      var args = arguments;
      if (original) original.apply(null, args);
      send(reportLevel, formatArgs(args));
    };
  }

  ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir'].forEach(patchMethod);

  var originalTable = typeof console.table === 'function' ? console.table.bind(console) : null;
  console.table = function (data, columns) {
    if (originalTable) originalTable.call(console, data, columns);
    send('table', formatTable(data));
  };

  var originalClear = typeof console.clear === 'function' ? console.clear.bind(console) : null;
  console.clear = function () {
    if (originalClear) originalClear.call(console);
    sendClear();
  };

  window.addEventListener('error', function (event) {
    var target = event && event.target;
    if (target && target !== window && target.tagName) {
      var failed = target.src || target.href || '';
      send('error', 'Resource failed to load: <' + target.tagName.toLowerCase() + '> ' + failed);
      return;
    }
    var message = (event && event.message) || 'Script error';
    var where = event && event.filename
      ? ' (' + sourceOf(event.filename) + ':' + event.lineno + ':' + event.colno + ')'
      : '';
    var stack = '';
    if (event && event.error && typeof event.error.stack === 'string') {
      stack = event.error.stack.split('\n').slice(1, 4).join('\n');
    }
    send('error', message + where + (stack ? '\n' + stack : ''), where ? sourceOf(event.filename) : '');
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    var detail = reason instanceof Error
      ? reason.name + ': ' + reason.message
      : formatValue(reason, 0, []);
    send('error', 'Unhandled promise rejection: ' + detail);
  });

  send('system', 'Preview document loaded');
}

function renderCaptureScript(parentOrigin) {
  return [
    '<script>',
    '(',
    previewCaptureRuntime.toString(),
    ')(' + JSON.stringify(parentOrigin || '') + ', ' + JSON.stringify(MAX_LOG_LENGTH) + ');',
    '</script>'
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 * Project file resolution
 * ------------------------------------------------------------------ */
const normalizePath = (value) =>
  String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+/, '');

const dirOf = (value) => {
  const path = normalizePath(value);
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
};

const baseNameOf = (value) => {
  const path = normalizePath(value);
  return path.split('/').pop() || path;
};

const extensionOf = (value) => {
  const match = /\.([a-z\d]+)$/i.exec(String(value || ''));
  return match ? match[1].toLowerCase() : '';
};

const isExternalRef = (ref) =>
  !ref ||
  ref.startsWith('#') ||
  /^(data|blob|javascript):/i.test(ref) ||
  /^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(ref);

function buildFileIndex(filesMap) {
  const index = new Map();
  Object.entries(filesMap || {}).forEach(([key, value]) => {
    const rawPath = typeof value === 'string' ? key : (value && (value.path || value.filePath)) || key;
    const path = normalizePath(rawPath);
    if (!path) return;
    const content = typeof value === 'string' ? value : (value && value.content) || '';
    index.set(path.toLowerCase(), { path, content });
  });
  return index;
}

function resolveRef(ref, files, activeFilePath) {
  const cleaned = normalizePath(decodeURIComponentSafe(ref).split('#')[0].split('?')[0]);
  if (!cleaned) return null;
  const activeDir = dirOf(activeFilePath);
  const candidates = activeDir ? [`${activeDir}/${cleaned}`, cleaned] : [cleaned];
  for (const candidate of candidates) {
    const hit = files.get(candidate.toLowerCase());
    if (hit) return hit;
  }
  if (cleaned.includes('/')) return null;
  let match = null;
  let hits = 0;
  files.forEach((entry) => {
    if (baseNameOf(entry.path).toLowerCase() === cleaned.toLowerCase()) {
      hits += 1;
      match = entry;
    }
  });
  return hits === 1 ? match : null;
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(String(value || ''));
  } catch (err) {
    return String(value || '');
  }
}

const escapeScriptBody = (code) => String(code || '').replace(/<\/(script)/gi, '<\\/$1');
const escapeStyleBody = (code) => String(code || '').replace(/<\/(style)/gi, '<\\/$1');
const escapeAttr = (value) => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escapeComment = (value) => String(value || '').replace(/-{2,}/g, '-');

function attrValue(tag, name) {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*(["'])([^"']*)\\1`, 'i').exec(tag);
  if (quoted) return quoted[2];
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s"'>]+)`, 'i').exec(tag);
  return bare ? bare[1] : '';
}

/**
 * Rewrites <link rel="stylesheet"> / <script src> inside a document so the
 * preview loads project files instead of network URLs, and tags every block
 * with a sourceURL comment so errors can be attributed back to a file.
 */
function inlineProjectReferences(html, context) {
  const { files, activeFilePath, activeFileContent, missing, notes, isHostDocument } = context;
  let injectedModule = false;

  let out = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = attrValue(tag, 'rel');
    if (!/stylesheet/i.test(rel)) return tag;
    const ref = attrValue(tag, 'href');
    if (!ref || isExternalRef(ref)) return tag;
    const hit = resolveRef(ref, files, activeFilePath);
    if (!hit) {
      missing.push({ kind: 'stylesheet', ref });
      return `<!-- ProCollab preview: stylesheet "${escapeComment(ref)}" is not in this project -->`;
    }
    return `<style data-preview-src="${escapeAttr(hit.path)}">\n${escapeStyleBody(hit.content)}\n</style>`;
  });

  out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (whole, rawAttrs, code) => {
    const attrs = rawAttrs || '';
    const inner = code || '';
    const src = attrValue(attrs, 'src');
    const isModule = /type\s*=\s*["']?module/i.test(attrs);

    if (!src) {
      if (!inner.trim()) return whole;
      if (isModule) injectedModule = true;
      const attribution = isHostDocument ? `//# sourceURL=${normalizePath(activeFilePath)}\n` : '';
      return `<script${attrs}>\n${escapeScriptBody(inner)}\n${attribution}</script>`;
    }

    if (isExternalRef(src)) return whole;
    const hit = resolveRef(src, files, activeFilePath);
    if (!hit) {
      missing.push({ kind: 'script', ref: src });
      return `<!-- ProCollab preview: script "${escapeComment(src)}" is not in this project -->`;
    }
    if (isModule) injectedModule = true;
    const strippedAttrs = attrs
      .replace(/\s*\bsrc\s*=\s*(["'])[^"']*\1/i, '')
      .replace(/\s*\bsrc\s*=\s*[^\s"'>]+/i, '');
    const isBabel = BABEL_EXTENSIONS.includes(extensionOf(hit.path));
    const typeAttr = isBabel ? ' type="text/babel" data-presets="react,typescript"' : '';
    const content = hit.path === normalizePath(activeFilePath) ? activeFileContent : hit.content;
    return [
      `<script${typeAttr}${strippedAttrs} data-preview-src="${escapeAttr(hit.path)}">`,
      escapeScriptBody(content),
      `//# sourceURL=${hit.path}`,
      '</script>'
    ].join('\n');
  });

  if (injectedModule) {
    notes.push('ES module imports are not resolved inside the sandbox; use script tags without type="module" or inline the bundle.');
  }
  return out;
}

function injectCaptureShim(html, shim) {
  const combined = `${BABEL_RUNTIME_SCRIPT}\n${shim}`;
  if (/<head[\s>]/i.test(html)) return html.replace(/<head\b[^>]*>/i, (tag) => `${tag}\n${combined}`);
  if (/<html[\s>]/i.test(html)) return html.replace(/<html\b[^>]*>/i, (tag) => `${tag}\n<head>${combined}</head>`);
  if (/<body[\s>]/i.test(html)) return html.replace(/<body\b[^>]*>/i, (tag) => `${tag}\n${combined}`);
  return `${combined}\n${html}`;
}

const BASE_PREVIEW_STYLES = `
  * { box-sizing: border-box; }
  html { background: #0b0b0b; }
  body {
    margin: 0;
    padding: 16px;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: #0b0b0b;
    color: #f5f5f5;
    min-height: 100vh;
  }
`;

function buildShellDocument({ title, styles, body, scripts, shim }) {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeComment(title)}</title>`,
    shim,
    BABEL_RUNTIME_SCRIPT,
    `<style>${BASE_PREVIEW_STYLES}</style>`,
    styles,
    '</head>',
    '<body>',
    body,
    scripts,
    '</body>',
    '</html>'
  ].join('\n');
}

function groupMissing(missing) {
  const grouped = new Map();
  missing.forEach(({ kind, ref }) => {
    const key = `${kind}|${ref}`;
    if (!grouped.has(key)) grouped.set(key, { kind, ref, count: 0 });
    grouped.get(key).count += 1;
  });
  return Array.from(grouped.values());
}

function collectFallbackFiles(files, activeFilePath, activeFileContent, extensions, notes) {
  const collected = [];
  let skipped = 0;
  files.forEach((entry) => {
    const ext = extensionOf(entry.path);
    if (!extensions.includes(ext)) {
      if (COMPILED_EXTENSIONS.includes(ext)) skipped += 1;
      return;
    }
    collected.push({
      path: entry.path,
      content: entry.path === normalizePath(activeFilePath) ? activeFileContent : entry.content
    });
  });
  collected.sort((a, b) => (a.path === normalizePath(activeFilePath) ? 1 : b.path === normalizePath(activeFilePath) ? -1 : a.path.localeCompare(b.path)));
  if (extensions.includes(extensionOf(activeFilePath))) {
    const hasActive = collected.some((file) => file.path === normalizePath(activeFilePath));
    if (!hasActive) collected.push({ path: normalizePath(activeFilePath), content: activeFileContent });
  }
  if (skipped > 0) {
    notes.push(`${skipped} TypeScript or JSX file${skipped === 1 ? '' : 's'} in this project ${skipped === 1 ? 'needs' : 'need'} a build step, so the sandbox skipped them.`);
  }
  return collected;
}

const renderStyleTag = (file) =>
  `<style data-preview-src="${escapeAttr(file.path)}">\n${escapeStyleBody(file.content)}\n</style>`;

const renderScriptTag = (file) => {
  const ext = extensionOf(file.path);
  const isBabel = BABEL_EXTENSIONS.includes(ext);
  const typeAttr = isBabel ? ' type="text/babel" data-presets="react,typescript"' : '';
  return `<script${typeAttr} data-preview-src="${escapeAttr(file.path)}">\n${escapeScriptBody(file.content)}\n//# sourceURL=${file.path}\n</script>`;
};

/* ------------------------------------------------------------------ *
 * Compile entry point
 * ------------------------------------------------------------------ */
function buildPreviewDocument({ activeFileContent, activeFilePath, filesMap, parentOrigin }) {
  const source = activeFileContent == null ? '' : String(activeFileContent);
  const safePath = normalizePath(activeFilePath) || 'index.html';
  const ext = extensionOf(safePath);
  const files = buildFileIndex(filesMap);
  const missing = [];
  const notes = [];
  const shim = renderCaptureScript(parentOrigin);
  const isStandaloneDocument =
    /^\s*<!doctype\s+html/i.test(source) || /<html[\s>]/i.test(source) || /<body[\s>]/i.test(source);

  const context = {
    files,
    activeFilePath: safePath,
    activeFileContent: source,
    missing,
    notes,
    isHostDocument: true
  };

  if (isStandaloneDocument) {
    const inlined = inlineProjectReferences(source, context);
    return {
      html: injectCaptureShim(inlined, shim),
      missing: groupMissing(missing),
      notes: Array.from(new Set(notes)),
      mode: 'document'
    };
  }

  if (ext === 'css') {
    const styleFiles = collectFallbackFiles(files, safePath, source, STYLE_EXTENSIONS, notes);
    const styles = styleFiles
      .map(renderStyleTag)
      .join('\n');
    const scaffold = [
      '<div style="padding:32px;text-align:center;">',
      '  <h2 style="margin:0 0 10px;font-size:20px;">CSS preview</h2>',
      `  <p style="margin:0 0 18px;color:#a3a3a3;font-size:13px;">Editing <code>${escapeAttr(safePath)}</code> against sample markup.</p>`,
      '  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">',
      '    <button class="btn" style="padding:10px 20px;border-radius:8px;cursor:pointer;font:inherit;">Sample Button</button>',
      '    <input class="input" placeholder="Sample input" style="padding:10px 14px;border-radius:8px;font:inherit;" />',
      '    <span class="badge" style="padding:6px 12px;border-radius:999px;background:#1f1f1f;color:#f5f5f5;font-size:12px;">Sample badge</span>',
      '  </div>',
      '  <p style="margin-top:18px;color:#8a8a8a;font-size:12px;">Styles from every stylesheet in the project are applied, with the open file last.</p>',
      '</div>'
    ].join('\n');
    return {
      html: buildShellDocument({ title: baseNameOf(safePath), styles, body: scaffold, scripts: '', shim }),
      missing: groupMissing(missing),
      notes: Array.from(new Set(notes)),
      mode: 'css'
    };
  }

  const hasOwnReferences = /<link\b/i.test(source) || /\bsrc\s*=/i.test(source);

  if ([...SCRIPT_EXTENSIONS, ...BABEL_EXTENSIONS].includes(ext) && !hasOwnReferences) {
    const styleFiles = collectFallbackFiles(files, safePath, source, STYLE_EXTENSIONS, notes);
    const scriptFiles = collectFallbackFiles(files, safePath, source, [...SCRIPT_EXTENSIONS, ...BABEL_EXTENSIONS], notes);
    notes.push(`No stylesheet or script references found in ${safePath}, so every JavaScript file in the project was injected.`);
    return {
      html: buildShellDocument({
        title: baseNameOf(safePath),
        styles: styleFiles
          .map(renderStyleTag)
          .join('\n'),
        body: '',
        scripts: scriptFiles
          .map(renderScriptTag)
          .join('\n'),
        shim
      }),
      missing: groupMissing(missing),
      notes: Array.from(new Set(notes)),
      mode: 'script'
    };
  }

  // HTML fragment (with or without its own references) or an unknown text type.
  const inlinedBody = hasOwnReferences
    ? inlineProjectReferences(source, context)
    : source;

  if (!hasOwnReferences) {
    const styleFiles = collectFallbackFiles(files, safePath, source, STYLE_EXTENSIONS, notes);
    const scriptFiles = collectFallbackFiles(files, safePath, source, [...SCRIPT_EXTENSIONS, ...BABEL_EXTENSIONS], notes);
    notes.push(`No stylesheet or script references found in ${safePath}, so every JavaScript and CSS file in the project was injected.`);
    return {
      html: buildShellDocument({
        title: baseNameOf(safePath),
        styles: styleFiles
          .map(renderStyleTag)
          .join('\n'),
        body: inlinedBody,
        scripts: scriptFiles
          .map(renderScriptTag)
          .join('\n'),
        shim
      }),
      missing: groupMissing(missing),
      notes: Array.from(new Set(notes)),
      mode: 'fragment-fallback'
    };
  }

  return {
    html: buildShellDocument({
      title: baseNameOf(safePath),
      styles: '',
      body: inlinedBody,
      scripts: '',
      shim
    }),
    missing: groupMissing(missing),
    notes: Array.from(new Set(notes)),
    mode: 'fragment'
  };
}

const LEVEL_STYLES = {
  log: 'text-slate-300',
  info: 'bg-sky-500/10 text-sky-300',
  warn: 'bg-amber-500/10 text-amber-300',
  error: 'bg-rose-500/10 text-rose-300',
  debug: 'bg-violet-500/10 text-violet-300',
  table: 'bg-slate-500/10 text-slate-200',
  system: 'text-slate-500'
};

const LivePreviewPanel = ({
  activeFileContent = '',
  activeFilePath = 'index.html',
  filesMap = {},
  onClose
}) => {
  const [viewport, setViewport] = useState('desktop');
  const [compiledHtml, setCompiledHtml] = useState('');
  const [logs, setLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(true);
  const [autoRun, setAutoRun] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [runToken, setRunToken] = useState(0);
  const [buildSeq, setBuildSeq] = useState(0);
  const iframeRef = useRef(null);
  const lastCompileRef = useRef(null);
  const lastCompileIssuesRef = useRef('');
  const logSeqRef = useRef(0);

  const parentOrigin = useMemo(() => {
    try {
      return window.location.origin === 'null' ? '' : window.location.origin || '';
    } catch (err) {
      return '';
    }
  }, []);

  const normalizedPath = useMemo(() => normalizePath(activeFilePath) || 'index.html', [activeFilePath]);
  const activeFileName = baseNameOf(normalizedPath);

  const appendLog = useCallback((entry) => {
    logSeqRef.current += 1;
    const record = {
      id: `log_${logSeqRef.current}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    };
    setLogs((prev) => {
      const next = prev.concat({ ...record, ...entry });
      return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
    });
  }, []);

  const publish = useCallback(
    ({ force }) => {
      const previous = lastCompileRef.current;
      const built = buildPreviewDocument({
        activeFileContent,
        activeFilePath: normalizedPath,
        filesMap,
        parentOrigin
      });
      if (previous && previous.path !== normalizedPath) {
        setLogs([]);
        lastCompileIssuesRef.current = '';
      }
      setCompiledHtml(built.html);
      setBuildSeq((value) => value + 1);
      lastCompileRef.current = { path: normalizedPath, content: activeFileContent, filesMap };
      if (force) {
        setRunToken((token) => token + 1);
        setIsReloading(true);
        setTimeout(() => setIsReloading(false), 400);
      }

      const issueSignature = built.missing
        .map((item) => `${item.kind}:${item.ref}:${item.count}`)
        .concat(built.notes)
        .join('|');
      if (issueSignature && issueSignature !== lastCompileIssuesRef.current) {
        lastCompileIssuesRef.current = issueSignature;
        built.missing.forEach((item) => {
          appendLog({
            level: 'warn',
            source: normalizedPath,
            message: `${item.kind === 'stylesheet' ? 'Stylesheet' : 'Script'} "${item.ref}" referenced by ${normalizedPath} is not in this project, so it was skipped in the preview.`
          });
        });
        built.notes.forEach((note) => appendLog({ level: 'system', message: note }));
      }
    },
    [activeFileContent, activeFilePath, normalizedPath, filesMap, parentOrigin, appendLog]
  );

  useEffect(() => {
    if (!autoRun) return undefined;
    const last = lastCompileRef.current;
    if (
      last &&
      last.path === normalizedPath &&
      last.content === activeFileContent &&
      last.filesMap === filesMap
    ) {
      return undefined;
    }
    const timer = setTimeout(() => publish({ force: false }), AUTO_RUN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoRun, activeFileContent, normalizedPath, filesMap, publish]);

  useEffect(() => {
    const handleMessage = (event) => {
      const frame = iframeRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      if (
        parentOrigin &&
        event.origin !== parentOrigin &&
        event.origin !== 'null' &&
        event.origin !== ''
      ) {
        return;
      }
      const data = event.data;
      if (!data || data.__proCollabPreview !== 1) return;
      if (data.action === 'clear') {
        setLogs([]);
        return;
      }
      if (typeof data.message !== 'string') return;
      appendLog({
        level: LOG_LEVELS.includes(data.level) ? data.level : 'log',
        message: data.message,
        source: typeof data.source === 'string' ? data.source : ''
      });
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [appendLog, parentOrigin]);

  // Recomputed each render; publish() bumps buildSeq so a rebuild always re-renders.
  const lastCompile = lastCompileRef.current;
  const isStale =
    !lastCompile ||
    lastCompile.path !== normalizedPath ||
    lastCompile.content !== activeFileContent ||
    lastCompile.filesMap !== filesMap;

  const handleRun = () => publish({ force: true });

  const handleOpenInNewWindow = () => {
    if (!compiledHtml) return;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(compiledHtml);
      newWindow.document.close();
    }
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

  const statusLabel = !compiledHtml
    ? 'NOT BUILT'
    : autoRun && isStale
    ? 'REBUILDING'
    : !autoRun && isStale
    ? 'CHANGES PENDING'
    : 'LIVE';

  const statusTone =
    statusLabel === 'LIVE'
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      : statusLabel === 'NOT BUILT'
      ? 'bg-white/[0.04] border-white/10 text-slate-400'
      : 'bg-amber-500/10 border-amber-500/20 text-amber-400';

  return (
    <div className="pc-editor-frame">

      {/* Preview toolbar */}
      <div className="bg-[#161616] px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2 flex-wrap">

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${statusTone}`}
            title={
              autoRun
                ? `Auto-run is on. ${buildSeq} build${buildSeq === 1 ? '' : 's'} since you opened this panel.`
                : `Auto-run is off. ${buildSeq} build${buildSeq === 1 ? '' : 's'} since you opened this panel.`
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusLabel === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
            <span>{statusLabel}</span>
          </div>

          <div className="flex items-center gap-0.5 bg-[#0b0b0b] p-1 rounded-lg border border-white/[0.08]">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1 rounded text-xs transition-colors ${
                viewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop width"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded text-xs transition-colors ${
                viewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet width, 768 pixels"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded text-xs transition-colors ${
                viewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile width, 375 pixels"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Truthful source descriptor */}
        <div
          className="flex-1 min-w-[160px] max-w-[340px] bg-[#0b0b0b] border border-white/[0.08] rounded-lg px-2.5 py-1 flex items-center gap-2 text-[11px] font-mono"
          title="Rendered in a sandboxed frame: storage, cookies and requests back to this app are blocked."
        >
          <FileCode className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="truncate text-slate-300">{activeFileName}</span>
          <span className="text-slate-600">/</span>
          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-slate-500 shrink-0">sandboxed preview</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setAutoRun((value) => !value)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              autoRun
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
            }`}
            title={autoRun ? 'Auto-run is on: the preview rebuilds after each pause in typing' : 'Auto-run is off: the preview only rebuilds when you press Run'}
          >
            <span className={`relative inline-block w-6 h-3.5 rounded-full transition-colors ${autoRun ? 'bg-emerald-500/60' : 'bg-white/15'}`}>
              <span
                className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                  autoRun ? 'translate-x-2.5' : 'translate-x-0'
                }`}
              />
            </span>
            <span>Auto-run</span>
          </button>

          {!autoRun && (
            <button
              onClick={handleRun}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                isStale
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isStale ? 'Run the current file in the preview' : 'Rebuild and reload the preview'}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run</span>
            </button>
          )}

          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              showConsole
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle captured console output"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Console</span>
            {logs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] leading-none">
                {logs.length}
              </span>
            )}
          </button>

          <button
            onClick={handleRun}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Rebuild and reload the preview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenInNewWindow}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Open the built preview in a browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* Preview screen */}
      <div className="flex-1 bg-[#080808] flex flex-col items-center justify-center p-2 overflow-hidden relative">
        <div
          className="h-full bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 flex flex-col border border-white/10"
          style={{ width: getViewportWidth(), maxWidth: '100%' }}
        >
          {compiledHtml ? (
            <iframe
              key={`preview-${runToken}`}
              ref={iframeRef}
              srcDoc={compiledHtml}
              title={`Sandboxed preview of ${activeFileName}`}
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              className="w-full h-full border-none bg-white"
            />
          ) : (
            <div className="w-full h-full bg-[#0d0d0d] flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-slate-600" />
              <p className="text-slate-400 text-sm max-w-xs">
                Nothing has been built yet. {autoRun ? 'The preview builds shortly after you stop typing.' : 'Press Run to build this file.'}
              </p>
              {!autoRun && (
                <button
                  onClick={handleRun}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run preview
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Captured console */}
      {showConsole && (
        <div className="h-40 bg-[#0d0d0d] border-t border-white/[0.08] flex flex-col overflow-hidden animate-slide-up">
          <div className="px-3.5 py-1.5 bg-[#141414] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Captured console output</span>
              <span className="text-slate-600">last {MAX_LOGS} entries</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-slate-500 hover:text-white transition-colors"
            >
              Clear logs
            </button>
          </div>

          <div className="flex-1 p-2 overflow-y-auto font-mono text-[11px] space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-600 text-center py-4">
                No console output captured yet. Calls to console.log, console.warn, console.error and thrown errors from the preview appear here.
              </div>
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-2 px-2 py-0.5 rounded ${LEVEL_STYLES[entry.level] || LEVEL_STYLES.log}`}
                >
                  <span className="text-slate-500 text-[10px] shrink-0">{entry.time}</span>
                  <span className="uppercase text-[9px] tracking-wide shrink-0 opacity-70 pt-px">{entry.level}</span>
                  <span className="whitespace-pre-wrap break-words">{entry.message}</span>
                  {entry.source ? <span className="text-slate-500 shrink-0">{entry.source}</span> : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default LivePreviewPanel;
