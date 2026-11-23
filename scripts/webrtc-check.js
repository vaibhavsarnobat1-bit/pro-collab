/*
 * Two-peer WebRTC check: one headless Chrome, two tabs, fake camera/microphone.
 * Both join the same room's call and we report whether a *remote* video track
 * actually decoded in each tab (that is the part a unit test cannot prove).
 *
 *   node scripts/webrtc-check.js [url] [seconds]
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

const url = process.argv[2] || 'http://localhost:3000/pro-collab/demo';
const settle = Number(process.argv[3]) || 12;
const shotDir = process.env.SHOT_DIR || os.tmpdir();
const port = 9334;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-webrtc-'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--hide-scrollbars',
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--auto-select-desktop-capture-source=Entire screen',
  '--autoplay-policy=no-user-gesture-required',
  'about:blank'
], { stdio: 'ignore' });

let nextId = 1;
const pending = new Map();
let ws;
function send(method, params = {}, sessionId) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

async function findWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await wait(250);
  }
  throw new Error('devtools endpoint never came up');
}

async function openTab(label) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride',
    { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  return { label, sessionId };
}

const evalIn = async (sessionId, expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
    .catch((e) => ({ error: e.message }));
  if (r.error) return { error: r.error };
  return r.result?.value;
};

const CLICK_CALL = `(() => {
  const t = [...document.querySelectorAll('.ws-segmented button')].find(b => /Call/.test(b.textContent));
  if (!t) return 'no Call tab';
  t.click();
  return 'ok';
})()`;

const CLICK_JOIN = `(() => {
  const b = [...document.querySelectorAll('.vc-join-btn')][0];
  if (!b) return 'no join button';
  b.click();
  return 'ok';
})()`;

const REPORT = `(() => {
  const tiles = [...document.querySelectorAll('.vc-tile')].map(t => ({
    self: t.classList.contains('vc-self'),
    label: t.querySelector('.vc-namebar')?.innerText.replace(/\\s+/g, ' ').trim() || '',
    status: t.querySelector('.vc-status')?.innerText.trim() || '',
    off: !!t.querySelector('.vc-off'),
    w: t.querySelector('video')?.videoWidth || 0,
    h: t.querySelector('video')?.videoHeight || 0,
    ready: t.querySelector('video')?.readyState ?? 0,
  }));
  return {
    joined: !document.querySelector('.vc-join'),
    error: document.querySelector('.vc-join-error')?.innerText.trim() || '',
    net: document.querySelector('.vc-net')?.innerText.trim() || '',
    count: document.querySelector('.vc-count')?.innerText.trim() || '',
    tiles,
  };
})()`;

(async () => {
  ws = new WebSocket(await findWsUrl(), { perMessageDeflate: false });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });

  const a = await openTab('peer-a');
  const b = await openTab('peer-b');
  await wait(7000);

  for (const t of [a, b]) {
    console.log(t.label, 'call tab ->', await evalIn(t.sessionId, CLICK_CALL));
  }
  await wait(1500);
  for (const t of [a, b]) {
    console.log(t.label, 'join ->', await evalIn(t.sessionId, CLICK_JOIN));
  }

  await wait(settle * 1000);

  let pass = 0;
  let fail = 0;
  for (const t of [a, b]) {
    const r = await evalIn(t.sessionId, REPORT);
    console.log(`\n${t.label}:`, JSON.stringify(r, null, 2));
    const remote = (r?.tiles || []).filter((x) => !x.self);
    const good = r?.joined && remote.length > 0 && remote.some((x) => x.w > 0 && x.ready >= 2);
    if (good) { pass++; console.log(`${t.label}: PASS — remote video decoding (${remote.filter(x => x.w > 0).length} remote tile(s))`); }
    else { fail++; console.log(`${t.label}: FAIL — no decoded remote video`); }
    const file = path.join(shotDir, `pc-webrtc-${t.label}.png`);
    const shot = await send('Page.captureScreenshot', { format: 'png' }, t.sessionId);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`${t.label} shot ->`, file);
  }

  if (process.env.NO_SHARE !== '1') {
    const CLICK_SHARE = `(() => {
      const b = [...document.querySelectorAll('.vc-controls .vc-btn')]
        .find(x => /Share screen|Stop sharing/i.test(x.textContent));
      if (!b) return 'no share button';
      b.click();
      return b.textContent.trim();
    })()`;
    console.log('\npeer-a share ->', await evalIn(a.sessionId, CLICK_SHARE));
    await wait(9000);
    console.log('peer-a getDisplayMedia ->', await evalIn(a.sessionId,
      `navigator.mediaDevices.getDisplayMedia({video:true}).then(s=>'ok: '+s.getVideoTracks()[0].label).catch(e=>'ERR '+e.name+': '+e.message)`));
    for (const t of [a, b]) {
      const r = await evalIn(t.sessionId, REPORT);
      const spot = await evalIn(t.sessionId, `(() => {
        const s = document.querySelector('.vc-spotlight');
        const v = s?.querySelector('video');
        return { present: !!s, tag: s?.querySelector('.vc-tag')?.innerText || '', w: v?.videoWidth || 0, ready: v?.readyState ?? 0 };
      })()`);
      const seen = (r?.tiles || []).some((x) => !x.self && x.w > 0 && x.ready >= 2);
      const banner = await evalIn(t.sessionId,
        `document.querySelector('.vc-banner')?.innerText.replace(/\\s+/g,' ').trim() || ''`);
      const good = (spot?.present && spot.w > 0 && spot.ready >= 2 && seen) || !!banner;
      if (good) {
        pass++;
        console.log(banner
          ? `${t.label}: PASS — capture failure surfaced to the user: "${banner}" (headless has no capturable screen)`
          : `${t.label}: PASS — shared screen shown (${spot.w}x, tag "${spot.tag}")`);
      } else { fail++; console.log(`${t.label}: FAIL — share neither worked nor reported`, JSON.stringify(spot)); }
      const file = path.join(shotDir, `pc-webrtc-${t.label}-share.png`);
      const shot = await send('Page.captureScreenshot', { format: 'png' }, t.sessionId);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(`${t.label} share shot ->`, file);
    }
  }

  console.log(`\nwebrtc: ${pass} passed, ${fail} failed`);
  ws.close();
  browser.kill();
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* chrome holds profile */ }
  setTimeout(() => process.exit(fail ? 1 : 0), 120);
})().catch((e) => {
  console.error('webrtc check failed:', e.message);
  browser.kill();
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* ignore */ }
  setTimeout(() => process.exit(1), 120);
});
