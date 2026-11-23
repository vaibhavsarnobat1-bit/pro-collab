/**
 * aiEngine — the coding assistant brain.
 *
 * Two modes, decided once at boot:
 *   remote  — an OpenAI-compatible or Anthropic key is present in the
 *             environment, so real model output is used.
 *   local   — no key. A genuine static analyser + outline builder + snippet
 *             library answers instead. Nothing is faked: the response carries
 *             `engine` so the UI can say which one replied.
 */

// ─────────────────────────────────────────────────── provider registry

const { resolveProvider, listModels, callModel } = require('./aiProviders');

// Boot-time default. Every request may still name its own model.
const provider = resolveProvider(process.env.AI_MODEL_ID || process.env.AI_PROVIDER || '');

const SYSTEM_PROMPT = [
  'You are the coding assistant embedded in Pro-Collab, a real-time collaborative editor.',
  'You are shown the visitor current file, its language and their request.',
  'Be concrete and brief. When you produce code, put it in exactly one fenced block and',
  'target the language of the current file unless asked otherwise. Never claim to have run,',
  'tested or deployed anything. Do not invent line numbers or pretend to know files you were',
  'not shown.'
].join(' ');

// ───────────────────────────────────────────── source scanner helpers

// Single pass that marks which characters sit inside strings or comments, so
// rule matches do not fire on text the interpreter never sees.
const maskSource = (code) => {
  const mask = new Array(code.length).fill(0);
  let line = 1;
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];
    if (ch === '\n') { line += 1; i += 1; continue; }
    if (ch === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') { mask[i] = 1; i += 1; }
      continue;
    }
    if (ch === '/' && next === '*') {
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) { mask[i] = 1; if (code[i] === '\n') line += 1; i += 1; }
      mask[i] = 1; mask[i + 1] = 1; i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      mask[i] = 2;
      i += 1;
      while (i < code.length) {
        if (code[i] === '\\') { mask[i] = 2; if (code[i + 1] === '\n') line += 1; mask[i + 1] = 2; i += 2; continue; }
        if (code[i] === '\n') { if (quote !== '`') break; line += 1; }
        if (code[i] === quote) { mask[i] = 2; i += 1; break; }
        mask[i] = 2;
        i += 1;
      }
      continue;
    }
    i += 1;
  }
  return mask;
};

const lineOffsets = (code) => {
  const offsets = [0];
  for (let i = 0; i < code.length; i += 1) if (code[i] === '\n') offsets.push(i + 1);
  return offsets;
};

const lineAt = (offsets, index) => {
  let low = 0;
  let high = offsets.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (offsets[mid] <= index) low = mid; else high = mid - 1;
  }
  return low + 1;
};

// Only matches that start on real code (not inside a string or comment) count.
const findCodeMatches = (code, regex) => {
  const mask = maskSource(code);
  const offsets = lineOffsets(code);
  const hits = [];
  let match;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  while ((match = re.exec(code)) !== null) {
    if (mask[match.index] === 0) hits.push({ index: match.index, line: lineAt(offsets, match.index), match });
    if (match[0].length === 0) re.lastIndex += 1;
  }
  return hits;
};

const push = (issues, issue) => issues.push(issue);

// ───────────────────────────────────────────────────── static analysis

const analyzeJavaScript = (code, issues) => {
  findCodeMatches(code, /\bvar\s+[A-Za-z_$][\w$]*\s*[=;]/g).forEach(({ line }) => {
    push(issues, { line, rule: 'var-declaration', severity: 'minor', message: 'Function-scoped `var` — leaks outside its block.', fix: 'Use `let` (or `const` if it is never reassigned).' });
  });

  findCodeMatches(code, /(?<![=!<>])==(?!=)/g).forEach(({ line }) => {
    push(issues, { line, rule: 'loose-equality', severity: 'major', message: 'Loose `==` coerces types before comparing.', fix: 'Prefer `===` so 0, "" and null cannot compare equal by accident.' });
  });

  findCodeMatches(code, /(?<![=!<>])!=(?!=)/g).forEach(({ line }) => {
    push(issues, { line, rule: 'loose-inequality', severity: 'major', message: 'Loose `!=` coerces before comparing.', fix: 'Use `!==`.' });
  });

  findCodeMatches(code, /\bdebugger\b/g).forEach(({ line }) => {
    push(issues, { line, rule: 'debugger', severity: 'major', message: 'A `debugger` statement ships to every visitor.', fix: 'Delete it before sharing the room.' });
  });

  findCodeMatches(code, /\bcatch\s*(\([^)]*\))?\s*\{\s*\}/g).forEach(({ line }) => {
    push(issues, { line, rule: 'empty-catch', severity: 'major', message: 'Empty catch swallows the error, so a failure looks like success.', fix: 'Log it, or rethrow after cleanup.' });
  });

  findCodeMatches(code, /\.innerHTML\s*=\s*[^;]*\$\{/g).forEach(({ line }) => {
    push(issues, { line, rule: 'xss-innerhtml', severity: 'major', message: 'Interpolating values into `innerHTML` is an injection sink.', fix: 'Use textContent, or escape values before building markup.' });
  });

  findCodeMatches(code, /\b(eval|new Function|document\.write)\s*\(/g).forEach(({ line, match }) => {
    push(issues, { line, rule: 'dynamic-exec', severity: 'major', message: `${match[1]} executes arbitrary strings — it defeats the sandbox and is slow.`, fix: 'Parse the data explicitly instead.' });
  });

  findCodeMatches(code, /\b(?:password|secret|api[_-]?key|token|authorization)\s*[:=]\s*['"][^'"]{8,}['"]/gi)
    .forEach(({ line }) => {
      push(issues, { line, rule: 'hardcoded-secret', severity: 'major', message: 'A credential is written into the file. Everyone in this room can read it.', fix: 'Move it to an environment variable and never commit it.' });
    });

  findCodeMatches(code, /\bi\s*<=\s*[A-Za-z_$][\w$.]*\.length\b/g).forEach(({ line }) => {
    push(issues, { line, rule: 'off-by-one', severity: 'major', message: '`i <= array.length` reads one past the end and yields undefined.', fix: 'Use `i < array.length`, or `i <= array.length - 1`.' });
  });

  findCodeMatches(code, /\baddEventListener\s*\(/g).length > 0
    && findCodeMatches(code, /\bremoveEventListener\s*\(/g).length === 0
    && push(issues, { line: 1, rule: 'listener-cleanup', severity: 'minor', message: 'Listeners are attached but never removed, so they stack up across re-renders.', fix: 'Return a cleanup that calls removeEventListener with the same function reference.' });

  findCodeMatches(code, /\bfetch\s*\(/g).forEach(({ index, line }) => {
    const window = code.slice(index, Math.min(code.length, index + 400));
    if (!/\btry\b/.test(window) && !/\.catch\s*\(/.test(window) && !/\.ok\b/.test(window)) {
      push(issues, { line, rule: 'unchecked-fetch', severity: 'minor', message: 'fetch() resolves for 404 and 500 too — only network failures reject.', fix: 'Check `response.ok` before parsing the body.' });
    }
  });

  const namedFunctions = new Map();
  findCodeMatches(code, /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g).forEach(({ match }) => {
    namedFunctions.set(match[1], (namedFunctions.get(match[1]) || 0) + 1);
  });
  [...namedFunctions].filter(([, count]) => count > 1).forEach(([name, count]) => {
    push(issues, { line: 0, rule: 'duplicate-function', severity: 'major', message: `\`${name}\` is declared ${count} times — the last definition wins silently.`, fix: 'Rename one, or merge them.' });
  });

  const opens = (code.match(/[({[]/g) || []).length;
  const closes = (code.match(/[)}\]]/g) || []).length;
  if (opens !== closes) {
    push(issues, { line: 0, rule: 'unbalanced-brackets', severity: 'major', message: `${opens} opening brackets against ${closes} closing ones — this will not parse.`, fix: 'Balance them; a formatter shows the mismatch instantly.' });
  }

  const longFunction = /function[\s\S]{2600,}?\}/.exec(code);
  if (longFunction) {
    push(issues, { line: lineAt(lineOffsets(code), longFunction.index), rule: 'long-function', severity: 'info', message: 'A function here runs well past 100 lines.', fix: 'Split it at the points where comments start explaining sub-steps.' });
  }

  findCodeMatches(code, /\bTODO:\s*(.+)/g).slice(0, 3).forEach(({ line, match }) => {
    push(issues, { line, rule: 'todo', severity: 'info', message: `Open TODO: ${match[1].trim().slice(0, 80)}`, fix: '' });
  });
};

const analyzePython = (code, issues) => {
  const bare = findCodeMatches(code, /except\s*:/g);
  bare.forEach(({ line }) => push(issues, { line, rule: 'bare-except', severity: 'major', message: '`except:` also swallows KeyboardInterrupt and typos.', fix: 'Catch the specific exception, or `except Exception:`.' }));

  findCodeMatches(code, /\bdef\s+\w+\s*\([^)]*=\s*(\[\]|\{\})/g).forEach(({ line }) => {
    push(issues, { line, rule: 'mutable-default', severity: 'major', message: 'A mutable default argument is shared across every call.', fix: 'Default to None and create the list/dict inside the body.' });
  });

  const dupes = new Map();
  findCodeMatches(code, /^\s*def\s+([A-Za-z_]\w*)/gm).forEach(({ match }) => dupes.set(match[1], (dupes.get(match[1]) || 0) + 1));
  [...dupes].filter(([, n]) => n > 1).forEach(([name, n]) => push(issues, { line: 0, rule: 'duplicate-function', severity: 'major', message: `\`${name}\` is defined ${n} times — the earlier body is unreachable.`, fix: 'Rename or delete one.' }));
};

const analyzeCss = (code, issues) => {
  findCodeMatches(code, /!important/g).slice(0, 3).forEach(({ line }) => {
    push(issues, { line, rule: 'important', severity: 'minor', message: '`!important` has to be out-boosted by every later rule.', fix: 'Raise specificity deliberately, or reorder.' });
  });
  const decls = (code.match(/\{/g) || []).length;
  const blocks = (code.match(/\}/g) || []).length;
  if (decls !== blocks) push(issues, { line: 0, rule: 'unbalanced-braces', severity: 'major', message: `${decls} opening braces against ${blocks} closing ones.`, fix: 'Balance them.' });
};

const analyzeHtml = (code, issues) => {
  const imgs = findCodeMatches(code, /<img\b[^>]*>/gi).filter(({ match }) => !/\balt=/.test(match[0]));
  imgs.forEach(({ line }) => push(issues, { line, rule: 'img-alt', severity: 'minor', message: 'An <img> has no alt text, so screen readers announce nothing.', fix: 'Add alt="…" (empty alt is fine for decoration).' }));

  findCodeMatches(code, /<a\b[^>]*href\s*=\s*["']?["']/gi).forEach(({ line }) => {
    push(issues, { line, rule: 'empty-link', severity: 'minor', message: 'A link with an empty href jumps to the top of the page.', fix: 'Point it somewhere or use a button.' });
  });

  findCodeMatches(code, /onclick\s*=/gi).slice(0, 2).forEach(({ line }) => {
    push(issues, { line, rule: 'inline-handler', severity: 'info', message: 'Inline on* handlers are hard to remove and CSP-hostile.', fix: 'Attach the listener in script.' });
  });
};

const analyze = (code, language) => {
  const issues = [];
  const text = String(code || '');
  if (!text.trim()) return issues;
  if (/^(javascript|typescript|jsx|tsx)$/.test(language)) analyzeJavaScript(text, issues);
  else if (language === 'python') analyzePython(text, issues);
  else if (/^(css|scss)$/.test(language)) analyzeCss(text, issues);
  else if (language === 'html') analyzeHtml(text, issues);
  return issues.sort((a, b) => rank(a.severity) - rank(b.severity) || a.line - b.line).slice(0, 14);
};

const rank = (severity) => ({ major: 0, minor: 1, info: 2 }[severity] ?? 3);

// ───────────────────────────────────────────────────── code outline

const outline = (code, language) => {
  const text = String(code || '');
  const offsets = lineOffsets(text);
  const symbols = [];
  const note = (index, kind, name) => symbols.push({ line: lineAt(offsets, index), kind, name });

  findCodeMatches(text, /\bfunction\s+([A-Za-z_$][\w$]*)/g).forEach(({ index, match }) => note(index, 'function', match[1]));
  findCodeMatches(text, /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g).forEach(({ index, match }) => note(index, 'function', match[1]));
  findCodeMatches(text, /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(?:React\.)?(?:memo|forwardRef|createContext)\b|(?:[A-Za-z_$][\w$]*)\s*=>)/g).forEach(({ index, match }) => note(index, 'binding', match[1]));
  findCodeMatches(text, /\bclass\s+([A-Za-z_$][\w$]*)/g).forEach(({ index, match }) => note(index, 'class', match[1]));
  findCodeMatches(text, /^\s*def\s+([A-Za-z_]\w*)/gm).forEach(({ index, match }) => note(index, 'function', match[1]));
  findCodeMatches(text, /^\s*class\s+([A-Za-z_]\w*)/gm).forEach(({ index, match }) => note(index, 'class', match[1]));

  const imports = findCodeMatches(text, /^\s*(?:import\b[^\n]*|from\s+\S+\s+import[^\n]*|const\s+\w+\s*=\s*require\([^\n]*)/gm).map(({ match }) => match[0].trim());
  const exports = findCodeMatches(text, /^\s*export\b[^\n]*/gm).map(({ match }) => match[0].trim());
  const asyncCalls = findCodeMatches(text, /\bfetch\s*\(|\baxios\.\w+\(|\bawait\b/g).length;
  const loops = findCodeMatches(text, /\bfor\b|\bwhile\b|\.map\(|\.forEach\(|\.reduce\(/g).length;
  const conditionals = findCodeMatches(text, /\bif\s*\(|\bswitch\s*\(|\?\s*[^:]+\:/g).length;
  const hooks = [...new Set(findCodeMatches(text, /\buse[A-Z]\w*\b/g).map(({ match }) => match[0]))];

  return { symbols, imports, exports, asyncCalls, loops, conditionals, hooks, lines: offsets.length };
};

const describe = (facts, filePath, language) => {
  const sentences = [];
  const name = filePath ? filePath.split('/').pop() : 'this file';
  sentences.push(`${name} is ${facts.lines} lines of ${language}.`);

  if (facts.imports.length) sentences.push(`It pulls in ${facts.imports.length} ${facts.imports.length === 1 ? 'import' : 'imports'} at the top.`);
  if (facts.symbols.length) {
    const named = facts.symbols.slice(0, 6).map((s) => `${s.name} (${s.kind}, line ${s.line})`).join(', ');
    sentences.push(`Declared here: ${named}${facts.symbols.length > 6 ? `, and ${facts.symbols.length - 6} more` : ''}.`);
  } else {
    sentences.push('No named functions or classes were found, so it likely runs top to bottom.');
  }
  if (facts.exports.length) sentences.push(`It exports ${facts.exports.length} ${facts.exports.length === 1 ? 'binding' : 'bindings'}.`);
  if (facts.asyncCalls) sentences.push(`${facts.asyncCalls} ${facts.asyncCalls === 1 ? 'call crosses' : 'calls cross'} the network or awaits a promise, so ordering matters here.`);
  if (facts.loops) sentences.push(`${facts.loops} ${facts.loops === 1 ? 'iteration site' : 'iteration sites'} walk data.`);
  if (facts.hooks.length) sentences.push(`React state is driven by ${facts.hooks.join(', ')}.`);
  return sentences.join(' ');
};

// ────────────────────────────────────────────────── safe optimization

const optimize = (code, language) => {
  const changes = [];
  let out = String(code || '');

  if (/^(javascript|typescript|jsx|tsx)$/.test(language)) {
    const vars = findCodeMatches(out, /\bvar\b/g);
    if (vars.length) {
      out = out.replace(/\bvar\b/g, 'let');
      changes.push(`${vars.length} × \`var\` → \`let\` (block-scoped, no more hoisting surprises)`);
    }
    const loose = findCodeMatches(out, /(?<![=!<>])==(?!=)/g);
    if (loose.length) {
      out = out.replace(/(?<![=!<>])==(?!=)/g, '===');
      changes.push(`${loose.length} × \`==\` → \`===\` (no coercion)`);
    }
    const looseNe = findCodeMatches(out, /(?<![=!<>])!=(?!=)/g);
    if (looseNe.length) {
      out = out.replace(/(?<![=!<>])!=(?!=)/g, '!==');
      changes.push(`${looseNe.length} × \`!=\` → \`!==\``);
    }
    if (/\bconsole\.log\b/.test(out)) {
      changes.push('console.log calls left in place — strip them at the source, not by rewriting (they may be load-bearing)');
    }
    if (/=>\s*\{[\s\S]{0,80}?return\s+([^;\n]+);\s*\}/.test(out)) {
      changes.push('Some single-return arrow bodies could drop the braces and become expressions');
    }
    if (/\.then\(/.test(out) && !/await/.test(out)) {
      changes.push('Promise chains here would read more clearly as async/await');
    }
  }

  if (language === 'python') {
    const bare = findCodeMatches(out, /except\s*:/g);
    if (bare.length) {
      out = out.replace(/except\s*:/g, 'except Exception:');
      changes.push(`${bare.length} × bare \`except:\` → \`except Exception:\``);
    }
  }

  const trimmed = out.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
  if (trimmed !== out) {
    out = trimmed;
    changes.push('Trailing whitespace and repeated blank lines removed');
  }

  return { code: out, changes };
};

// ────────────────────────────────────────────────── snippet library

const TEMPLATES = [
  {
    id: 'page',
    match: /(landing|web ?page|homepage|portfolio|hero section|login form|web app)/i,
    language: 'html',
    fileName: 'index.html',
    title: 'a self-contained page',
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Untitled page</title>
    <style>
      :root { --ink: #0e1220; --muted: #5b6478; --accent: #4f46e5; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, sans-serif; color: var(--ink); }
      .hero { display: grid; gap: 18px; padding: 96px 24px; max-width: 860px; margin: 0 auto; }
      .hero h1 { font-size: clamp(34px, 6vw, 62px); line-height: 1.05; margin: 0; letter-spacing: -0.03em; }
      .hero p { color: var(--muted); font-size: 17px; line-height: 1.65; margin: 0; max-width: 54ch; }
      .cta { display: inline-flex; gap: 10px; flex-wrap: wrap; }
      .cta a { padding: 12px 20px; border-radius: 10px; background: var(--accent); color: #fff; text-decoration: none; font-weight: 650; }
      .cta a + a { background: transparent; border: 1px solid #d5d9e4; color: var(--ink); }
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; padding: 0 24px 72px; max-width: 860px; margin: 0 auto; }
      .card { border: 1px solid #e3e6ef; border-radius: 14px; padding: 18px; }
      .card h3 { margin: 0 0 6px; font-size: 15px; }
      .card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.55; }
    </style>
  </head>
  <body>
    <section class="hero">
      <h1>Say the one thing that matters</h1>
      <p>Two sentences of subtext. Specific beats clever — a reader decides in about four seconds.</p>
      <div class="cta">
        <a href="#start">Get started</a>
        <a href="#docs">Read the docs</a>
      </div>
    </section>
    <section class="cards" id="start">
      <article class="card"><h3>First benefit</h3><p>What it does for the reader, not what it is.</p></article>
      <article class="card"><h3>Second benefit</h3><p>Keep each card the same length so the grid stays honest.</p></article>
      <article class="card"><h3>Third benefit</h3><p>Three cards read better than five; cut the weakest.</p></article>
    </section>
  </body>
</html>`
  },
  {
    id: 'debounce',
    match: /debounc|throttl/i,
    language: 'javascript',
    fileName: 'debounce.js',
    title: 'debounce and throttle',
    code: `// Fire only after the caller stops for \`wait\` ms.
export function debounce(fn, wait = 250) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

// Fire at most once per \`wait\` ms, keeping the newest args for the tail call.
export function throttle(fn, wait = 250) {
  let last = 0;
  let timer = null;
  return (...args) => {
    const remaining = wait - (Date.now() - last);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      last = Date.now();
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}`
  },
  {
    id: 'fetch',
    match: /(fetch|http request|api call|axios|get json)/i,
    language: 'javascript',
    fileName: 'fetchJson.js',
    title: 'a fetch helper that actually reports failures',
    code: `export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    ...options
  });

  // fetch() resolves for 404 and 500 — only the network rejects.
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const label = response.status + ' ' + response.statusText;
    throw new Error(url + ' -> ' + label + (detail ? ': ' + detail.slice(0, 200) : ''));
  }

  if (response.status === 204) return null;
  return response.json();
}

// Usage
fetchJson('/api/rooms')
  .then((rooms) => console.log(rooms))
  .catch((error) => console.error(error.message));`
  },
  {
    id: 'react-counter',
    match: /(react|component|hook|useState|counter)/i,
    language: 'jsx',
    fileName: 'Counter.jsx',
    title: 'a small React component with state',
    code: `import { useState, useCallback } from 'react';

export default function Counter({ start = 0, step = 1 }) {
  const [count, setCount] = useState(start);

  const bump = useCallback((delta) => setCount((current) => current + delta), []);

  return (
    <div className="counter">
      <button type="button" onClick={() => bump(-step)}>−{step}</button>
      <output aria-live="polite">{count}</output>
      <button type="button" onClick={() => bump(step)}>+{step}</button>
      <button type="button" onClick={() => setCount(start)}>Reset</button>
    </div>
  );
}`
  },
  {
    id: 'express',
    match: /(express|rest api|backend route|server route|middleware)/i,
    language: 'javascript',
    fileName: 'routes.js',
    title: 'an Express route with validation',
    code: `const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const validate = (body) => {
  const errors = [];
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) errors.push('title is required');
  if (title.length > 120) errors.push('title must be 120 characters or fewer');

  const minutes = Number(body.minutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) errors.push('minutes must be a whole number from 1 to 240');

  return { errors, title, minutes };
};

router.post('/sessions', (req, res) => {
  const { errors, title, minutes } = validate(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors.join('; ') });

  const session = { id: crypto.randomUUID(), title, minutes, createdAt: new Date() };
  return res.status(201).json(session);
});

module.exports = router;`
  },
  {
    id: 'sort-search',
    match: /(binary search|sort|merge|quick ?sort|two sum|algorithm)/i,
    language: 'javascript',
    fileName: 'algorithms.js',
    title: 'binary search and merge sort',
    code: `// Smallest index whose value is >= target. Returns items.length if none is.
export function lowerBound(items, target, compare = (a, b) => a - b) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (compare(items[mid], target) < 0) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function binarySearch(items, target) {
  const index = lowerBound(items, target);
  return items[index] === target ? index : -1;
}

// Stable merge sort — O(n log n) worst case, unlike quicksort.
export function mergeSort(items, compare = (a, b) => a - b) {
  if (items.length < 2) return items;
  const middle = items.length >> 1;
  const left = mergeSort(items.slice(0, middle), compare);
  const right = mergeSort(items.slice(middle), compare);
  const merged = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    merged.push(compare(left[i], right[j]) <= 0 ? left[i++] : right[j++]);
  }
  return merged.concat(left.slice(i), right.slice(j));
}`
  },
  {
    id: 'python-cli',
    match: /(python|script|argparse|read csv|count words)/i,
    language: 'python',
    fileName: 'tool.py',
    title: 'a Python CLI that reads a file',
    code: `#!/usr/bin/env python3
"""Count lines, words and characters in the given files."""

import argparse
import sys
from pathlib import Path


def tally(path: Path) -> tuple[int, int, int]:
    text = path.read_text(encoding="utf-8", errors="replace")
    return text.count("\\n") + 1, len(text.split()), len(text)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path, help="files to inspect")
    parser.add_argument("--total", action="store_true", help="print one combined line")
    args = parser.parse_args(argv)

    lines = words = chars = 0
    for path in args.paths:
        if not path.is_file():
            print(f"skip: {path} is not a file", file=sys.stderr)
            continue
        n_lines, n_words, n_chars = tally(path)
        lines, words, chars = lines + n_lines, words + n_words, chars + n_chars
        if not args.total:
            print(f"{n_lines:>7} {n_words:>7} {n_chars:>7}  {path}")

    print(f"{lines:>7} {words:>7} {chars:>7}  total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())`
  },
  {
    id: 'sql',
    match: /(sql|query|join|group by)/i,
    language: 'sql',
    fileName: 'report.sql',
    title: 'a grouped report query',
    code: `-- Weekly activity per room, newest first.
SELECT
  r.room_id,
  r.title,
  DATE_TRUNC('week', a.created_at) AS week,
  COUNT(DISTINCT a.username)      AS active_authors,
  COUNT(*)                        AS edits
FROM rooms r
JOIN activity_logs a ON a.room_id = r.room_id
WHERE a.created_at >= NOW() - INTERVAL '8 weeks'
GROUP BY r.room_id, r.title, week
HAVING COUNT(*) > 0
ORDER BY week DESC, edits DESC;`
  }
];

// ─────────────────────────────────────────────────── local responder

const localReply = ({ prompt, code, language, filePath, action }) => {
  const text = String(prompt || '');
  const source = String(code || '');
  const issues = analyze(source, language);
  const facts = outline(source, language);

  // Explicit actions from the UI buttons.
  if (action === 'fix' || /^(fix|debug|error|why.*(fail|broken))/i.test(text)) {
    if (!source.trim()) {
      return { reply: 'Nothing to inspect yet — open a file and ask again, and I will read it line by line.', engine: 'local' };
    }
    if (!issues.length) {
      return {
        reply: `I scanned ${filePath || 'the file'} and found nothing I would flag as wrong. That is not the same as "correct": the checks cover equality coercion, unbalanced brackets, swallowed errors, injection sinks, hardcoded secrets, duplicate declarations and off-by-one bounds. Behaviour bugs still need a test.`,
        engine: 'local'
      };
    }
    const list = issues.map((issue) => `${issue.line ? `line ${issue.line}` : 'file'} · ${issue.severity} · ${issue.message}${issue.fix ? `\n        → ${issue.fix}` : ''}`);
    const { code: suggested, changes } = optimize(source, language);
    const safeToApply = changes.length > 0 && suggested !== source;
    return {
      reply: [
        `${issues.length} finding${issues.length === 1 ? '' : 's'} in ${filePath || 'the file'}:`,
        '',
        ...list.map((l, i) => `${i + 1}. ${l}`),
        '',
        safeToApply ? 'The block below applies only the mechanical fixes (it never rewrites your logic):' : 'The findings above need judgement, so I did not rewrite the file.'
      ].join('\n'),
      codeSnippet: safeToApply ? suggested : '',
      suggestedLanguage: language,
      explanation: safeToApply ? changes.join(' · ') : issues.map((i) => i.rule).join(', '),
      engine: 'local'
    };
  }

  if (action === 'explain' || /(explain|what does|walk me|summar)/i.test(text)) {
    if (!source.trim()) {
      return { reply: 'Open a file first — explanation needs code to read.', engine: 'local' };
    }
    const symbolLines = facts.symbols.slice(0, 8).map((s) => `  ${String(s.line).padStart(4)}  ${s.kind.padEnd(9)} ${s.name}`);
    return {
      reply: [
        describe(facts, filePath, language),
        '',
        symbolLines.length ? 'Symbols:' : 'No symbols found.',
        ...symbolLines,
        '',
        'This is a structural read of the file, not a claim about intent. Ask a specific question — "why does this return undefined here" — and the analysis narrows.'
      ].join('\n'),
      explanation: `${facts.symbols.length} symbols · ${facts.loops} iterations · ${facts.conditionals} branches · ${facts.asyncCalls} await/network sites`,
      engine: 'local'
    };
  }

  if (action === 'optimize' || /(optimi[sz]|refactor|clean|performance|faster)/i.test(text)) {
    if (!source.trim()) return { reply: 'There is no code in the editor to refactor.', engine: 'local' };
    const { code: suggested, changes } = optimize(source, language);
    if (suggested === source && !changes.length) {
      return { reply: 'Nothing mechanical to change here. The remaining wins are structural: name the function you would split and why.', engine: 'local' };
    }
    return {
      reply: [`Changes I can make safely:\n`, ...changes.map((c, i) => `${i + 1}. ${c}`)].join('\n'),
      codeSnippet: suggested !== source ? suggested : '',
      suggestedLanguage: language,
      explanation: changes.join(' · '),
      engine: 'local'
    };
  }

  // Free-form generation request → template library.
  const template = TEMPLATES.find((t) => t.match.test(text));
  if (template) {
    return {
      reply: `Here is ${template.title}. Written to be dropped in and run — adjust the copy and it is yours.`,
      codeSnippet: template.code,
      suggestedFileName: template.fileName,
      suggestedLanguage: template.language,
      explanation: 'Local template — set OPENAI_API_KEY or ANTHROPIC_API_KEY on the server for model-written code.',
      engine: 'local'
    };
  }

  // Anything else: say what I can actually do rather than pretending.
  const hints = issues.length
    ? `\nMeanwhile, ${source.trim() ? `${filePath || 'your file'} has ${issues.length} thing${issues.length === 1 ? '' : 's'} I would flag: ${issues.slice(0, 3).map((i) => i.message).join(' ')}` : ''}`
    : '';
  return {
    reply: [
      'I could not map that to something I do well offline. Pick one and I will go deep:',
      '  · "explain this file" — a real outline with line numbers',
      '  · "fix bugs" — static checks over what is open',
      '  · "optimize" — safe rewrites plus what they cost',
      '  · name a shape: a page, a debounce, a fetch helper, a React component, an Express route, a Python CLI, a SQL report',
      hints
    ].join('\n'),
    explanation: '',
    engine: 'local'
  };
};

// ────────────────────────────────────────────────── remote provider

const extractCode = (markdown) => {
  const blocks = [...String(markdown || '').matchAll(/```[a-zA-Z]*\n([\s\S]*?)```/g)];
  if (!blocks.length) return '';
  const longest = blocks.map((b) => b[1]).sort((a, b) => b.length - a.length)[0];
  return longest.replace(/\n$/, '');
};

const detectFenceLanguage = (markdown = '') => {
  const m = /```([a-zA-Z+]+)\n/.exec(markdown);
  const raw = (m?.[1] || '').toLowerCase();
  const map = { js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx', py: 'python', python: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell' };
  return map[raw] || raw || 'plaintext';
};

async function askRemote({ prompt, code, language, filePath, action, history = [], modelId = '' }) {
  const active = resolveProvider(modelId) || provider;
  if (!active) {
    const error = new Error('no API key configured');
    error.code = 'no_key';
    throw error;
  }

  const context = [
    `Current file: ${filePath || 'untitled'} (${language || 'plaintext'})`,
    code ? 'Buffer contents:\n' + code.slice(0, 12000) : 'The file is empty.',
    action !== 'chat' ? `Requested action: ${action}` : '',
    '',
    'User request:',
    String(prompt).slice(0, 4000)
  ].filter(Boolean).join('\n');

  const earlier = history
    .slice(-6)
    .map((message) => `${message.sender === 'user' ? 'User' : 'Assistant'}: ${String(message.text || '').slice(0, 1200)}`)
    .join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const markdown = await callModel({
      provider: active,
      system: SYSTEM_PROMPT,
      prompt: earlier ? `${earlier}\n\n${context}` : context,
      temperature: 0.2,
      maxTokens: 1800,
      signal: controller.signal
    });
    return {
      reply: markdown.replace(/^assistant:\s*/i, ''),
      codeSnippet: extractCode(markdown),
      suggestedLanguage: detectFenceLanguage(markdown),
      engine: `model:${active.model}`
    };
  } finally {
    clearTimeout(timer);
  }
}

// ───────────────────────────────────────────────────────── public API

const ask = async (request) => {
  const active = resolveProvider(request.modelId) || provider;
  if (!active) return localReply(request);

  try {
    return await askRemote({ ...request, modelId: active.id });
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'the model timed out after 45s' : error.message;
    const local = localReply(request);
    return {
      ...local,
      fallbackNote: `Model call failed (${String(reason).slice(0, 160)}), so the offline engine answered.`,
      engine: 'local'
    };
  }
};

const engineStatus = () => {
  const configured = listModels().filter((model) => model.configured);
  if (!configured.length) {
    return { kind: 'local', label: 'Offline engine', configured: [], models: listModels() };
  }
  const active = provider || resolveProvider('');
  return {
    kind: 'model',
    model: active.model,
    provider: active.id,
    label: `Model · ${active.label}`,
    configured: configured.map((model) => model.id),
    models: listModels()
  };
};

module.exports = {
  ask,
  askRemote,
  localReply,
  analyze,
  outline,
  optimize,
  templates: TEMPLATES.map(({ id, title, language, fileName }) => ({ id, title, language, fileName })),
  engineStatus,
  models: listModels
};
