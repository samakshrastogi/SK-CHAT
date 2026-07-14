import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const services = [
  { name: 'backend', child: spawn(npm, ['run', 'dev', '--prefix', 'backend'], { stdio: 'inherit' }) },
  { name: 'frontend', child: spawn(npm, ['run', 'dev', '--prefix', 'frontend'], { stdio: 'inherit' }) },
];

let shuttingDown = false;

const stopAll = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const { child } of services) {
    if (!child.killed) child.kill();
  }

  process.exitCode = exitCode;
};

for (const { name, child } of services) {
  child.on('error', (error) => {
    console.error(`Unable to start ${name}:`, error.message);
    stopAll(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) console.error(`${name} stopped with signal ${signal}`);
    stopAll(code ?? 1);
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
