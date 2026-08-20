const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

function request(method, reqPath, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: reqPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function waitForServer(retries = 20, delay = 300) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      const req = http.get('http://127.0.0.1:5000/api/health', (res) => {
        if (res.statusCode === 200) {
          return resolve();
        }
        retry();
      });
      req.on('error', () => {
        retry();
      });
    };

    const retry = () => {
      count++;
      if (count >= retries) {
        reject(new Error('Server did not start in time.'));
      } else {
        setTimeout(check, delay);
      }
    };

    check();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED BACKEND TESTS ===\n');

  let serverProcess = null;
  let selfStarted = false;

  // Check if server is already running
  try {
    await waitForServer(2, 200);
    console.log('⚡ Connected to existing server on port 5000');
  } catch (e) {
    console.log('🚀 Spawning local server process for test suite...');
    serverProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
      env: { ...process.env, PORT: '5000', NODE_ENV: 'test' },
      stdio: 'pipe'
    });
    selfStarted = true;
    try {
      await waitForServer(25, 300);
      console.log('✅ Server started successfully for testing.\n');
    } catch (err) {
      console.error('❌ Could not start test server:', err.message);
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
  }

  let passed = 0;
  let failed = 0;

  // 1. Healthcheck
  try {
    const res = await request('GET', '/api/health');
    if (res.status === 200 && res.data.status === 'OK') {
      console.log('✅ Healthcheck Test: PASSED');
      passed++;
    } else {
      console.error('❌ Healthcheck Test: FAILED', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ Healthcheck Exception:', err.message);
    failed++;
  }

  // 2. Signup Test
  let userToken = '';
  try {
    const res = await request('POST', '/api/auth/signup', {
      username: 'developer_' + Date.now().toString().slice(-4),
      password: 'password123',
      confirmPassword: 'password123'
    });
    if (res.status === 201 && res.data.token) {
      console.log('✅ User Signup Test: PASSED');
      userToken = res.data.token;
      passed++;
    } else {
      console.error('❌ User Signup Test: FAILED', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ User Signup Exception:', err.message);
    failed++;
  }

  // 3. Admin Login Test
  let adminToken = '';
  try {
    const res = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    if (res.status === 200 && res.data.token && res.data.user.role === 'admin') {
      console.log('✅ Admin Login Test: PASSED');
      adminToken = res.data.token;
      passed++;
    } else {
      console.error('❌ Admin Login Test: FAILED', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ Admin Login Exception:', err.message);
    failed++;
  }

  // 4. Admin Dashboard Metrics Test
  try {
    const res = await request('GET', '/api/admin/dashboard', null, adminToken);
    if (res.status === 200 && res.data.stats) {
      console.log('✅ Admin Dashboard API Test: PASSED (Total Users: ' + res.data.stats.totalUsers + ')');
      passed++;
    } else {
      console.error('❌ Admin Dashboard API Test: FAILED', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ Admin Dashboard Exception:', err.message);
    failed++;
  }

  // 5. File System Tree Test
  try {
    const res = await request('GET', '/api/fs/tree');
    if (res.status === 200 && Array.isArray(res.data.tree)) {
      console.log('✅ File System Tree API Test: PASSED (Items in root: ' + res.data.tree.length + ')');
      passed++;
    } else {
      console.error('❌ File System Tree API Test: FAILED', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ File System Tree Exception:', err.message);
    failed++;
  }

  // 6. AI Assistant Chat Test
  try {
    const res = await request('POST', '/api/ai/chat', {
      prompt: 'Create a navbar component in React',
      language: 'javascript'
    });
    if (res.status === 200 && res.data.codeSnippet) {
      console.log('✅ AI Assistant Endpoint Test: PASSED');
      passed++;
    } else {
      console.error('❌ AI Assistant Endpoint Test: FAILED', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ AI Assistant Exception:', err.message);
    failed++;
  }

  // 7. Room Data API Test
  try {
    const res = await request('GET', '/api/rooms/test-room-automation');
    if (res.status === 200 && res.data.room) {
      console.log('✅ Room Data API Test: PASSED');
      passed++;
    } else {
      console.error('❌ Room Data API Test: FAILED', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ Room Data Exception:', err.message);
    failed++;
  }

  console.log('\n========================================');
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('========================================');

  if (selfStarted && serverProcess) {
    serverProcess.kill();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
