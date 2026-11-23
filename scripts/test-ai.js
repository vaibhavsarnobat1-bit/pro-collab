const ai = require('../server/services/aiEngine');

const buggy = [
  'var total = 0;',
  'function add(a, b) {',
  '  if (a == b) { return 0; }',
  '  var x = items[i <= items.length];',
  '  try { doThing(); } catch (e) {}',
  '  el.innerHTML = `<b>${userInput}</b>`;',
  "  fetch('/api/x');",
  '  function add(q) { return q; }',
  '  return total;',
  '}',
  'password = "hunter2supersecret";'
].join('\n');

(async () => {
  console.log('engine status:', JSON.stringify(ai.engineStatus()));

  const fix = await ai.ask({ prompt: 'fix bugs', code: buggy, language: 'javascript', filePath: 'utils.js', action: 'fix' });
  console.log('\n=== FIX ===\n' + fix.reply);
  console.log('[snippet chars]', (fix.codeSnippet || '').length, '| engine', fix.engine);

  const explain = await ai.ask({ prompt: 'explain this', code: buggy, language: 'javascript', filePath: 'utils.js', action: 'explain' });
  console.log('\n=== EXPLAIN ===\n' + explain.reply);

  const opt = await ai.ask({ prompt: 'optimize', code: buggy, language: 'javascript', filePath: 'utils.js', action: 'optimize' });
  console.log('\n=== OPTIMIZE ===\n' + opt.reply);
  console.log('\n--- rewritten ---\n' + opt.codeSnippet);

  const gen = await ai.ask({ prompt: 'write me a debounce helper', code: '', language: 'javascript', filePath: '', action: 'chat' });
  console.log('\n=== GEN debounce ===\n' + gen.reply + '\n[file] ' + gen.suggestedFileName + ' [lang] ' + gen.suggestedLanguage + ' [chars] ' + gen.codeSnippet.length);

  const page = await ai.ask({ prompt: 'create a landing page', code: '', language: 'html', filePath: '', action: 'chat' });
  console.log('\n=== GEN page ===\n' + page.reply + '\n[file] ' + page.suggestedFileName + ' [chars] ' + page.codeSnippet.length);

  const unk = await ai.ask({ prompt: 'what is the meaning of life', code: '', language: 'javascript', filePath: '', action: 'chat' });
  console.log('\n=== UNKNOWN ===\n' + unk.reply);

  const clean = await ai.ask({ prompt: 'fix bugs', code: 'export const sum = (a, b) => a + b;\n', language: 'javascript', filePath: 'sum.js', action: 'fix' });
  console.log('\n=== CLEAN ===\n' + clean.reply);

  const py = await ai.ask({ prompt: 'fix', code: 'def f(items=[]):\n    except:\n        pass\n', language: 'python', filePath: 'a.py', action: 'fix' });
  console.log('\n=== PYTHON ===\n' + py.reply);
})();
