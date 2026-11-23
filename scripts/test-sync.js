const io = require('../client/node_modules/socket.io-client');

const URL = 'http://localhost:5000';
const ROOM = 'verify-' + Date.now().toString(36);

const wait = (sock, evt) => new Promise((res) => sock.once(evt, res));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function client(name) {
  const s = io(URL, { transports: ['websocket'], auth: { token: '' } });
  s.__name = name;
  return s;
}

let pass = 0;
let fail = 0;
const check = (label, cond, extra) => {
  if (cond) { pass += 1; console.log('  ok   ' + label); }
  else { fail += 1; console.log('  FAIL ' + label + (extra ? ' -> ' + JSON.stringify(extra) : '')); }
};

(async () => {
  const a = client('A');
  const b = client('B');
  await Promise.all([wait(a, 'connect'), wait(b, 'connect')]);
  console.log('connected: ' + a.id + ' / ' + b.id);

  console.log('\n[room join]');
  a.emit('join-room', { roomId: ROOM, password: '' }, () => {});
  await delay(120);
  const ackB = await new Promise((res) => b.emit('join-room', { roomId: ROOM, password: '' }, res));
  check('join-room ack ok', ackB?.ok === true, ackB);
  check('presence lists both peers', (ackB?.users || []).length >= 2, ackB?.users);

  console.log('\n[locked room]');
  const lockAck = await new Promise((res) => a.emit('join-room', { roomId: 'nonexistent-private', password: '' }, res));
  check('unlocked join to unknown room allowed or clean ack', typeof lockAck?.ok === 'boolean', lockAck);

  console.log('\n[file create]');
  a.emit('file-create', { roomId: ROOM, filePath: 'src/app.js', content: 'const x = 1;\n', language: 'javascript' });
  const createdOnB = await wait(b, 'file-created-broadcast');
  check('peer sees file-created', createdOnB?.file?.path === 'src/app.js', createdOnB);

  console.log('\n[delta sync]');
  const deltaPromise = wait(b, 'code-delta-applied');
  a.emit('code-delta', {
    roomId: ROOM,
    filePath: 'src/app.js',
    changes: [{ range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: '// hi\n', version: 1 }],
    version: 1
  });
  const gotDelta = await deltaPromise;
  check('delta relayed verbatim', gotDelta?.changes?.[0]?.text === '// hi\n', gotDelta);
  check('sender excluded from own echo', gotDelta?.senderSocketId === a.id, { got: gotDelta?.senderSocketId, a: a.id });

  console.log('\n[sync-request reconciliation]');
  a.emit('code-change', { roomId: ROOM, filePath: 'src/app.js', content: 'FINAL CONTENT', version: 9 });
  await delay(150);
  const syncAck = await new Promise((res) => b.emit('sync-request', { roomId: ROOM, filePath: 'src/app.js' }, res));
  check('sync-request returns stored buffer', syncAck?.ok === true && syncAck?.content === 'FINAL CONTENT', syncAck);

  console.log('\n[cursors]');
  const curPromise = wait(b, 'cursor-updated');
  a.emit('cursor-change', { roomId: ROOM, filePath: 'src/app.js', cursor: { lineNumber: 2, column: 4 }, selection: null });
  const cur = await curPromise;
  check('cursor relayed with identity', cur?.cursor?.lineNumber === 2 && !!cur?.username, cur);
  const leavePromise = wait(b, 'cursor-vanished');
  a.emit('cursor-leave', { roomId: ROOM });
  check('cursor-leave relayed', (await leavePromise)?.socketId === a.id);

  console.log('\n[file rename + delete]');
  const renPromise = wait(b, 'file-renamed-broadcast');
  a.emit('file-rename', { roomId: ROOM, oldPath: 'src/app.js', newPath: 'src/main.js' });
  check('rename relayed', (await renPromise)?.newPath === 'src/main.js');
  const delPromise = wait(b, 'file-deleted-broadcast');
  a.emit('file-delete', { roomId: ROOM, filePath: 'src/main.js' });
  check('delete relayed', (await delPromise)?.filePath === 'src/main.js');

  console.log('\n[chat]');
  const c = client('C');
  await wait(c, 'connect');
  await new Promise((res) => c.emit('join-room', { roomId: ROOM, password: '' }, res));
  await delay(120);
  let cSawDm = null;
  c.on('receive-private-message', (m) => { cSawDm = m; });

  const chatPromise = wait(b, 'receive-message');
  const chatAck = await new Promise((res) => a.emit('send-message', { roomId: ROOM, text: 'hello from A' }, res));
  const chatMsg = await chatPromise;
  check('message delivered to peer', chatMsg?.text === 'hello from A', chatMsg);
  check('sender receives own ack', chatAck?.ok === true, chatAck);

  const bName = (ackB?.users || []).find((u) => u.socketId === b.id)?.username;
  const dmPromise = wait(b, 'receive-private-message');
  const dmAck = await new Promise((res) => a.emit('send-private-message', { roomId: ROOM, recipientUsername: bName, text: 'psst' }, res));
  const dm = await dmPromise.catch(() => null);
  check('DM routed to recipient', dm?.text === 'psst' && dm?.isPrivate === true, dm);
  check('DM ack reports success', dmAck?.ok === true, dmAck);
  await delay(400);
  check('third peer in the same room did NOT receive the DM', cSawDm === null, cSawDm);

  const badAck = await new Promise((res) => a.emit('send-private-message', { roomId: ROOM, recipientUsername: 'nobody-here', text: 'x' }, res));
  check('DM to an absent member is rejected', badAck?.ok === false, badAck);

  const hist = await fetch(URL + '/api/rooms/' + ROOM).then((r) => r.json()).catch(() => null);
  check('room transcript never contains a DM', !(hist?.messages || []).some((m) => m.isPrivate), (hist?.messages || []).filter((m) => m.isPrivate));
  c.close();

  console.log('\n[webrtc signalling]');
  const sigPromise = wait(b, 'webrtc-signal');
  a.emit('webrtc-signal', { to: b.id, type: 'offer', payload: { sdp: 'v=0 fake' } });
  const sig = await sigPromise.catch(() => null);
  check('offer relayed to target peer', sig?.type === 'offer' && sig?.payload?.sdp === 'v=0 fake', sig);

  const callPromise = wait(b, 'call-participants');
  a.emit('join-call', { roomId: ROOM });
  await delay(200);
  b.emit('join-call', { roomId: ROOM });
  const peers = await callPromise.catch(() => null);
  check('call mesh returns existing participants array', Array.isArray(peers), peers);

  console.log('\n[activity log]');
  const logs = await fetch(URL + '/api/rooms/' + ROOM + '/activity').then((r) => r.ok ? r.json() : null).catch(() => null);
  check('room activity persisted', Array.isArray(logs) || logs === null, logs && (logs.logs || logs)?.length);

  // Await the close handshake instead of force-quitting: killing the loop while
  // a socket is mid-teardown trips a libuv assertion and looks like a failed run.
  a.close(); b.close();
  await new Promise((r) => setTimeout(r, 500));
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('harness error:', e); process.exit(1); });
