/*
 * Desktop-width screenshot pass without extra dependencies.
 * Drives a headless Chrome over the DevTools protocol so layouts can be seen at
 * real breakpoints instead of the narrow in-app preview pane.
 *
 *   node scripts/shot.js <url> <outPng> [width] [height]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const WebSocket = require(path.join(__dirname, '../server/node_modules/ws'));

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

const CHROME = CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) {
  console.error('no chrome/edge binary found');
  process.exit(2);
}

const [,, url, out, widthArg, heightArg] = process.argv;
if (!url || !out) {
  console.error('usage: node scripts/shot.js <url> <outPng> [width] [height]');
  process.exit(2);
}
const width = Number(widthArg) || 1440;
const height = Number(heightArg) || 900;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-shot-'));
const port = 9333;

const browser = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--hide-scrollbars',
  'about:blank'
], { stdio: 'ignore' });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function findWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const j = await res.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await wait(250);
  }
  throw new Error('devtools endpoint never came up');
}

let nextId = 1;
function makeClient(wsUrl) {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
  const pending = new Map();
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  const open = new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  return {
    ready: open,
    send(method, params = {}, sessionId) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    },
    close: () => ws.close()
  };
}

(async () => {
  const client = makeClient(await findWsUrl());
  await client.ready;

  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });

  await client.send('Page.enable', {}, sessionId);
  await client.send('Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);

  await client.send('Page.navigate', { url }, sessionId);
  await wait(6000);

  const interact = process.argv[6];
  if (interact) {
    const r = await client.send('Runtime.evaluate',
      { expression: interact, returnByValue: true, awaitPromise: true }, sessionId).catch((e) => ({ err: e.message }));
    if (r?.err) console.log('interact error:', r.err);
    else console.log('interact ->', JSON.stringify(r?.result?.value));
    // argv[7] = ms to settle, for flows that fire a request and need the reply.
    await wait(Number(process.argv[7]) || 1200);
  }

  // Console errors are the fastest signal that a page is actually broken.
  const runtime = await client.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      w: innerWidth, h: innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: (document.body.innerText || '').slice(0, 160).replace(/\\s+/g, ' '),
      root: document.querySelector('#root')?.children.length || 0
    })`,
    returnByValue: true
  }, sessionId).catch(() => null);
  if (runtime?.result?.value) console.log('page:', runtime.result.value);

  const shot = await client.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('wrote', out, `${width}x${height}`);

  client.close();
  browser.kill();
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* chrome still holds the profile */ }
  setTimeout(() => process.exit(0), 120);
})().catch((e) => {
  console.error('shot failed:', e.message);
  browser.kill();
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* ignore */ }
  setTimeout(() => process.exit(1), 120);
});
