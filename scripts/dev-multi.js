import { spawn, spawnSync } from 'node:child_process';
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const children = [spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local'], { stdio: 'inherit' }), spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--strictPort'], { stdio: 'inherit' })];
let closing = false;
function stop(code = 0) { if (closing) return; closing = true; children.forEach(child => child.kill('SIGTERM')); process.exitCode = code; }
children.forEach(child => { child.on('exit', code => stop(code ?? 0)); child.on('error', () => stop(1)); });
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
