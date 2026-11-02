/**
 * The visual harness: captures each state of a screen at the policy widths, keeps the first
 * captures as the screen's references (the developer approves them at a checkpoint), and compares
 * later captures with them through ga's visual-compare script.
 *
 * Per screen, under `design/modernize/<screen>/`:
 * - `refs/<state>-<width>.png`: the approved references (committed);
 * - `app/<state>-<width>.png`: the latest captures (ignored by git);
 * - `compare.json`: the pairs file, one per screen so screen tasks never share it;
 * - `compare/`: the script's side-by-side images and summary.json (committed).
 *
 * Both sides of a pair open `design/modernize/reference.html`, which shows one image at the
 * window's width, so the comparison runs without the app or any server; the "app" side is served
 * by `visual-setup.mjs`.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, BrowserContextOptions, Page } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const VISUAL_DIR = join(ROOT, 'design', 'modernize');
const COMPARE_SCRIPT =
  '/Users/ankitkumarpandit/Documents/work/geekyants/claude-plugin/geekyants-claude-plugin/plugins/ga/skills/verify-work/scripts/visual-compare.mjs';
/** The origin visual-setup.mjs serves the captured images from, on the "app" side. */
const CAPTURE_ORIGIN = 'http://visual.test';

/** Every capture sees 2026-11-02 09:00 local time: the browser runs in UTC. */
export const VISUAL_TIME_ZONE = 'UTC';
export const VISUAL_CLOCK = '2026-11-02T09:00:00Z';
export const VISUAL_WIDTHS = [390, 1280] as const;
export const VISUAL_HEIGHT = 900;
/** Letters, digits, '.', '_' and '-': screen and state names become folder and file names. */
const NAME = /^[A-Za-z0-9][\w.-]*$/;

export interface VisualState {
  /** Names the images: `<name>-<width>.png`. */
  name: string;
  /** Where the state starts, such as `/signin`. */
  path: string;
  /** The app's language and theme for this state (saved as the app saves them). Default en, light. */
  locale?: 'en' | 'hi';
  theme?: 'light' | 'dark';
  /** Runs before the page opens: sign in, seed data, mock a request with page.route. */
  before?: (page: Page) => Promise<void>;
  /** Runs once the page has loaded: open a dialog, type, submit. */
  act?: (page: Page) => Promise<void>;
  /** Capture the whole scrolling page rather than the window. */
  fullPage?: boolean;
}

export interface CompareResult {
  status: number;
  output: string;
  /** The references this run created, because the state had none: they need the developer's approval. */
  newReferences: string[];
}

/** The browser context every capture uses, the same as visual-compare's own captures. */
export function visualContextOptions(width: number, baseURL?: string): BrowserContextOptions {
  return {
    ...(baseURL ? { baseURL } : {}),
    viewport: { width, height: VISUAL_HEIGHT },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: VISUAL_TIME_ZONE,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  };
}

/** Stops time at the visual clock and turns off every animation and transition, before the page loads. */
export async function prepareVisualPage(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date(VISUAL_CLOCK));
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent =
      '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';
    const add = () => document.head.append(style);
    if (document.head) add();
    else document.addEventListener('DOMContentLoaded', add, { once: true });
  });
}

function checkName(kind: string, name: string): void {
  if (!NAME.test(name))
    throw new Error(`${kind} "${name}" must be letters, digits, ".", "_" or "-"`);
}

/** Captures every state at every width into `design/modernize/<screen>/app/`. */
export async function captureScreen(
  browser: Browser,
  baseURL: string,
  screen: string,
  states: VisualState[],
): Promise<string[]> {
  checkName('screen', screen);
  const dir = join(VISUAL_DIR, screen);
  mkdirSync(join(dir, 'app'), { recursive: true });
  mkdirSync(join(dir, 'refs'), { recursive: true });
  const newReferences: string[] = [];
  for (const state of states) {
    checkName('state', state.name);
    for (const width of VISUAL_WIDTHS) {
      const context = await browser.newContext(visualContextOptions(width, baseURL));
      try {
        const page = await context.newPage();
        await prepareVisualPage(page);
        const saved = { lang: state.locale ?? 'en', dark: String(state.theme === 'dark') };
        await page.addInitScript((prefs) => {
          localStorage.setItem('lang', prefs.lang);
          localStorage.setItem('dark', prefs.dark);
        }, saved);
        await state.before?.(page);
        await page.goto(state.path, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle');
        await state.act?.(page);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const file = `${state.name}-${width}.png`;
        await page.screenshot({
          path: join(dir, 'app', file),
          fullPage: state.fullPage ?? false,
          animations: 'disabled',
          caret: 'hide',
        });
        if (!existsSync(join(dir, 'refs', file))) {
          copyFileSync(join(dir, 'app', file), join(dir, 'refs', file));
          newReferences.push(relative(ROOT, join(dir, 'refs', file)));
        }
      } finally {
        await context.close();
      }
    }
  }
  return newReferences;
}

/** Writes the screen's pairs file: each state's reference against its latest capture. */
export function writeComparePairs(screen: string, states: VisualState[]): string {
  checkName('screen', screen);
  const page = (side: 'refs' | 'app', state: string) =>
    `reference.html?screen=${screen}&side=${side}&state=${state}`;
  const pairsFile = join(VISUAL_DIR, screen, 'compare.json');
  const pairs = {
    appBase: `${CAPTURE_ORIGIN}/design/modernize/`,
    clock: VISUAL_CLOCK,
    setup: relative(dirname(pairsFile), join(ROOT, 'e2e', 'support', 'visual-setup.mjs')),
    pairs: states.map((state) => ({
      name: state.name,
      design: `../${page('refs', state.name)}`,
      app: page('app', state.name),
      fullPage: true,
    })),
  };
  mkdirSync(dirname(pairsFile), { recursive: true });
  writeFileSync(pairsFile, `${JSON.stringify(pairs, null, 2)}\n`);
  return pairsFile;
}

/** Runs ga's visual-compare on the screen's pairs at 390 and 1280; status 0 when every pair was compared. */
export function runVisualCompare(screen: string): { status: number; output: string } {
  checkName('screen', screen);
  const result = spawnSync(
    process.execPath,
    [
      COMPARE_SCRIPT,
      join('design', 'modernize', screen, 'compare.json'),
      '--widths',
      VISUAL_WIDTHS.join(','),
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 300_000 },
  );
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? String(result.error) : ''}`,
  };
}

/**
 * Captures the screen's states, writes its pairs file and compares them. Open every image in
 * `design/modernize/<screen>/compare/` before ruling on the result.
 */
export async function compareScreen(
  browser: Browser,
  baseURL: string,
  screen: string,
  states: VisualState[],
): Promise<CompareResult> {
  const newReferences = await captureScreen(browser, baseURL, screen, states);
  writeComparePairs(screen, states);
  return { ...runVisualCompare(screen), newReferences };
}
