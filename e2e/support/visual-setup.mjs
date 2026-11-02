/**
 * The visual-compare setup module for every design/modernize/<screen>/compare.json (see
 * visual.ts): on the "app" side it serves the project's files from http://visual.test, so the
 * latest captures are compared with their references without the app or a server running.
 */
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png' };

export async function before({ page, side }) {
  if (side !== 'app') return;
  await page.route('http://visual.test/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(ROOT, decodeURIComponent(pathname));
    const type = TYPES[extname(file).toLowerCase()];
    if (!file.startsWith(ROOT + sep) || !type) return route.fulfill({ status: 404 });
    try {
      return await route.fulfill({ status: 200, contentType: type, body: await readFile(file) });
    } catch {
      return route.fulfill({ status: 404 });
    }
  });
}
