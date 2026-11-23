// Verify the middleware-mode preview serves its imports and upgrades HMR on
// the same port as HTTP, so a reverse proxy does not need a second port.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const probe = createServer();
await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts', '--port', String(port)], {
  env: { ...process.env, NODE_ENV: 'development' }, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
const waitForChildExit = (processChild, timeoutMs) => new Promise(resolve => {
  if (processChild.exitCode !== null || processChild.signalCode !== null) {
    resolve(true);
    return;
  }
  let settled = false;
  const finish = exited => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    processChild.removeListener('exit', onExit);
    resolve(exited);
  };
  const onExit = () => finish(true);
  const timer = setTimeout(() => finish(false), timeoutMs);
  processChild.once('exit', onExit);
  if (processChild.exitCode !== null || processChild.signalCode !== null) finish(true);
});

const stopServer = async processChild => {
  if (!processChild || processChild.exitCode !== null || processChild.signalCode !== null) return;
  try {
    if (process.platform === 'win32') processChild.kill('SIGTERM');
    else process.kill(-processChild.pid, 'SIGTERM');
  } catch { /* already exited */ }
  if (await waitForChildExit(processChild, 5000)) return;
  try {
    if (process.platform === 'win32') processChild.kill('SIGKILL');
    else process.kill(-processChild.pid, 'SIGKILL');
  } catch { /* already exited */ }
  await waitForChildExit(processChild, 2000);
};

child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 30000);
    const onData = () => { if (output.includes('StudioFlow Salon OS running')) { clearTimeout(timeout); resolve(); } };
    child.stdout.on('data', onData);
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const paths = ['/src/App.tsx', '/src/components/AuthPage.tsx', '/src/components/CustomerApp.tsx', '/src/components/customer/Rewards.tsx', '/src/components/customer/Profile.tsx', '/src/components/CustomerReferralBridge.tsx', '/src/lib/customerReferral.ts', '/src/lib/customerWhatsApp.ts', '/src/lib/useAuthSession.ts'];
  for (const path of paths) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, `${path} must transform successfully`);
  }
  const client = await (await fetch(base + '/@vite/client')).text();
  assert.match(client, /const hmrPort = null;/, 'HMR should reuse the browser-facing port');
  const token = client.match(/const wsToken = "([^"]+)"/)?.[1];
  assert.ok(token, 'Vite supplied a WebSocket token');
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/?token=${encodeURIComponent(token)}`, 'vite-hmr');
    const timer = setTimeout(() => { socket.close(); reject(new Error('HMR WebSocket timed out')); }, 5000);
    socket.addEventListener('message', event => {
      if (JSON.parse(event.data).type === 'connected') { clearTimeout(timer); socket.close(); resolve(); }
    });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('HMR WebSocket failed')); });
  });
  console.log('PASS: affected imports transform and HMR connects on the HTTP preview port.');
} finally {
  await stopServer(child);
}
