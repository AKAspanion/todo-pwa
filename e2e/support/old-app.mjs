/**
 * Builds and serves the old app (the Vue 2 build live before the rewrite) for the visual references
 * (restore-original-design spec §4.2). Run by hand, never by the test run:
 *
 *   node e2e/support/old-app.mjs          # create the worktree, install, serve; prints OLD_APP_URL
 *   node e2e/support/old-app.mjs --stop   # stop the server and remove the worktree
 *
 * The old code is checked out into a throwaway git worktree outside the repository's tracked files
 * (OLD_APP_DIR). Its Firebase setup is pointed at the local Auth and Firestore emulators (project
 * demo-todo, ports from firebase.json), by a patch and a .env.local that exist only in that
 * worktree: nothing here is ever committed, and this repository's status is unchanged.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OLD_APP_REF = 'b8af93e^';
export const OLD_APP_DIR = join(tmpdir(), 'todo-pwa-old-app');
export const OLD_APP_PORT = 5190;
const STATE_DIR = join(tmpdir(), 'todo-pwa-old-app-state');
const PID_FILE = join(STATE_DIR, 'server.pid');
const LOG_FILE = join(STATE_DIR, 'server.log');

const { emulators } = JSON.parse(readFileSync(join(ROOT, 'firebase.json'), 'utf8'));
const AUTH_PORT = emulators.auth.port;
const FIRESTORE_PORT = emulators.firestore.port;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

const git = (...args) => run('git', args, { cwd: ROOT });

function replaceOnce(file, from, to) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`${file}: the old code no longer has "${from}"`);
  writeFileSync(file, text.replace(from, to));
}

function serverPid() {
  if (!existsSync(PID_FILE)) return null;
  const pid = Number(readFileSync(PID_FILE, 'utf8'));
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

/** Stops the server (its whole process group) and removes the worktree. */
function stop() {
  const pid = serverPid();
  if (pid) {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      process.kill(pid, 'SIGTERM');
    }
  }
  rmSync(STATE_DIR, { recursive: true, force: true });
  if (existsSync(OLD_APP_DIR)) {
    try {
      git('worktree', 'remove', '--force', OLD_APP_DIR);
    } catch {
      rmSync(OLD_APP_DIR, { recursive: true, force: true });
    }
  }
  git('worktree', 'prune');
  console.log('OLD_APP_STOPPED');
}

/** Checks out the old code and points its Firebase setup at the emulators. */
function createWorktree() {
  git('worktree', 'prune');
  if (existsSync(OLD_APP_DIR)) {
    git('worktree', 'remove', '--force', OLD_APP_DIR);
  }
  git('worktree', 'add', '--detach', OLD_APP_DIR, OLD_APP_REF);

  // The demo project: its values are made up, the emulators accept any key.
  writeFileSync(
    join(OLD_APP_DIR, '.env.local'),
    [
      'VUE_APP_API_KEY=demo-api-key',
      'VUE_APP_AUTH_DOMAIN=demo-todo.firebaseapp.com',
      'VUE_APP_DATABASE_URL=',
      'VUE_APP_PROJECT_ID=demo-todo',
      'VUE_APP_STORAGE_BUCKET=demo-todo.appspot.com',
      'VUE_APP_MESSAGING_SENDER_ID=000000000000',
      'VUE_APP_APP_ID=1:000000000000:web:0000000000000000',
      'VUE_APP_VAPID_KEY=demo-vapid-key',
      '',
    ].join('\n'),
  );

  // Auth and Firestore go to the emulators; the compat SDK's own calls, right after init. The
  // warning banner the SDK adds to the page is switched off: the old app never showed one.
  replaceOnce(
    join(OLD_APP_DIR, 'src', 'firebase', 'index.ts'),
    'firebase.initializeApp(this.firebaseConfig);',
    [
      'firebase.initializeApp(this.firebaseConfig);',
      `(firebase.auth() as any).useEmulator('http://127.0.0.1:${AUTH_PORT}', { disableWarnings: true });`,
      `firebase.firestore().useEmulator('127.0.0.1', ${FIRESTORE_PORT});`,
    ].join('\n        '),
  );
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!serverPid()) throw new Error(`the old app's server exited; see ${LOG_FILE}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`the old app did not answer at ${url} in ${timeoutMs / 1000}s; see ${LOG_FILE}`);
}

async function start() {
  if (serverPid()) {
    console.log(`OLD_APP_URL=http://localhost:${OLD_APP_PORT}`);
    return;
  }
  createWorktree();
  run('npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], { cwd: OLD_APP_DIR });

  mkdirSync(STATE_DIR, { recursive: true });
  const log = openSync(LOG_FILE, 'a');
  const child = spawn('npx', ['vue-cli-service', 'serve', '--port', String(OLD_APP_PORT)], {
    cwd: OLD_APP_DIR,
    detached: true,
    stdio: ['ignore', log, log],
    env: { ...process.env },
  });
  closeSync(log);
  child.unref();
  writeFileSync(PID_FILE, String(child.pid));
  await waitForServer(`http://localhost:${OLD_APP_PORT}/`, 240_000);
  console.log(`OLD_APP_URL=http://localhost:${OLD_APP_PORT}`);
}

if (process.argv.includes('--stop')) {
  stop();
} else {
  start().catch((error) => {
    console.error(String(error));
    process.exit(1);
  });
}
