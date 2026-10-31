// Hosted previews can opt out of HMR without breaking Vite's CSS runtime.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const probe = createServer();
await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts', '--port', String(port)], {
  env: { ...process.env, NODE_ENV: 'development', DISABLE_HMR: 'true' }, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 30000);
    child.stdout.on('data', () => { if (output.includes('StudioFlow Salon OS running')) { clearTimeout(timeout); resolve(); } });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  for (const path of ['/', '/src/App.tsx', '/src/lib/customerReferral.ts', '/src/lib/customerWhatsApp.ts', '/src/lib/useAuthSession.ts', '/src/index.css']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, `${path} must be served with HMR disabled`);
  }
  const response = await fetch(base + '/@vite/client');
  assert.equal(response.status, 200);
  const code = await response.text();
  assert.doesNotMatch(code, /\bWebSocket\b/, 'Disabled client must not open a WebSocket');
  // Execute the client module, verifying normal dev styles still install/update/remove.
  const styles = [];
  globalThis.HTMLElement = class {};
  globalThis.document = {
    createElement: () => ({ setAttribute() {}, remove() { styles.splice(styles.indexOf(this), 1); } }),
    head: { appendChild: style => styles.push(style) },
  };
  const runtime = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  runtime.updateStyle('test.css', 'body { color: red }');
  assert.equal(styles.length, 1);
  assert.equal(styles[0].textContent, 'body { color: red }');
  runtime.updateStyle('test.css', 'body { color: blue }');
  assert.equal(styles.length, 1);
  assert.equal(styles[0].textContent, 'body { color: blue }');
  runtime.removeStyle('test.css');
  assert.equal(styles.length, 0);
  assert.equal(runtime.injectQuery('/src/file.css?x=1#part', 'direct'), '/src/file.css?direct&x=1#part');
  console.log('PASS: DISABLE_HMR serves modules and CSS without a WebSocket client.');
} finally {
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already exited */ }
}
