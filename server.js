const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;

const frontend = spawn('npm', ['run', 'frontend'], {
  cwd: root,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, BROWSER: 'none' },
});

const backend = spawn('node', ['backend/server.js'], {
  cwd: root,
  shell: true,
  stdio: 'inherit',
});

frontend.on('exit', (code) => {
  backend.kill();
  process.exit(code || 0);
});

backend.on('exit', (code) => {
  frontend.kill();
  process.exit(code || 0);
});
