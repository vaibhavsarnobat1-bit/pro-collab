const io = require('../client/node_modules/socket.io-client');

const ROOM = process.argv[2] || 'lobby';
const PATH = process.argv[3] || 'index.html';
const peer = io('http://localhost:5000', { transports: ['websocket'] });

peer.on('connect', () => {
  peer.emit('join-room', { roomId: ROOM, password: '' }, (res) => {
    console.log('joined', ROOM, 'as', peer.id, 'ok=' + (res && res.ok));
    let step = 0;
    const tick = () => {
      step += 1;
      const line = 2 + (step % 12);
      peer.emit('cursor-change', {
        roomId: ROOM,
        filePath: PATH,
        cursor: { lineNumber: line, column: 6 + (step % 30) },
        selection: { startLineNumber: line, startColumn: 6, endLineNumber: line, endColumn: 6 + ((step * 3) % 25) }
      });
      if (step === 4) {
        peer.emit('code-delta', {
          roomId: ROOM,
          filePath: PATH,
          changes: [{ range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: '<!-- written by the mock peer -->\n', version: 77 }],
          version: 77
        });
        console.log('sent one delta');
      }
    };
    tick();
    setInterval(tick, 700);
  });
});

peer.on('connect_error', (e) => { console.error('connect_error', e.message); process.exit(1); });
