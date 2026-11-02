/// <reference types="vitest/config" />
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import vuetify from 'vite-plugin-vuetify';

const root = dirname(fileURLToPath(import.meta.url));

/** The largest file the service worker may precache, and the largest chunk the build may emit (W2). */
const MAX_PRECACHE_BYTES = 2 * 1024 * 1024;

/** Demo Firebase settings for unit tests: always the emulators, never a real project, whatever `.env.local` holds. */
const testEnv = parseEnv(readFileSync(join(root, '.env.ci'), 'utf8')) as Record<string, string>;

interface EmulatorSettings {
  emulators: { auth: { port: number }; firestore: { port: number } };
}

/**
 * Where the app finds the emulators when `VITE_USE_EMULATORS` is 'true'. The ports have one
 * source, firebase.json (this project runs on its own ports, beside other projects on the default
 * ones); `firebase emulators:exec` sets the same hosts in the environment, which win when present.
 */
function emulatorHosts(): { auth: string; firestore: string } {
  const { emulators } = JSON.parse(
    readFileSync(join(root, 'firebase.json'), 'utf8'),
  ) as EmulatorSettings;
  return {
    auth: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? `127.0.0.1:${emulators.auth.port}`,
    firestore: process.env.FIRESTORE_EMULATOR_HOST ?? `127.0.0.1:${emulators.firestore.port}`,
  };
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/**
 * Moves every `.map` file out of `dist` into `sourcemaps/` beside it, once the whole build, the
 * service worker included, has been written: they are kept for error tracking but never deployed
 * (S5). `sourcemap: 'hidden'` keeps the `//# sourceMappingURL` comments out of the bundles, so
 * nothing in `dist` points at the moved files.
 */
function moveSourceMapsOutOfDist(): Plugin {
  let outDir = '';
  return {
    name: 'todo:move-sourcemaps-out-of-dist',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle: {
      order: 'post',
      sequential: true,
      handler() {
        const sourcemapDir = join(dirname(outDir), 'sourcemaps');
        rmSync(sourcemapDir, { recursive: true, force: true });
        for (const file of listFiles(outDir).filter((f) => f.endsWith('.map'))) {
          const target = join(sourcemapDir, relative(outDir, file));
          mkdirSync(dirname(target), { recursive: true });
          renameSync(file, target);
        }
      },
    },
  };
}

/** Vendor chunks, each well under the precache limit: Firebase, Vuetify, Vue and its libraries, and the rest. */
function vendorChunk(test: RegExp, name: string, priority: number) {
  return { name, test, priority };
}

export default defineConfig({
  define: {
    __FIREBASE_EMULATOR_HOSTS__: JSON.stringify(emulatorHosts()),
  },
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      // src/pwa/index.ts registers the worker itself (Task 9), so the plugin injects no script.
      injectRegister: false,
      includeAssets: ['favicon.ico', 'img/icons/*.png', 'img/icons/*.svg'],
      manifest: {
        id: '/',
        name: 'Task Manager',
        short_name: 'TODO',
        description: 'Plan your tasks, label them and get reminded before they are due.',
        lang: 'en',
        scope: '/',
        start_url: '/home',
        display: 'standalone',
        theme_color: '#1976D2',
        background_color: '#FAFAFA',
        icons: [
          { src: '/img/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/img/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/img/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: MAX_PRECACHE_BYTES,
        sourcemap: 'hidden',
      },
      devOptions: { enabled: false },
    }),
    moveSourceMapsOutOfDist(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 1024,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            vendorChunk(/[\\/]node_modules[\\/](@firebase|firebase)[\\/]/, 'firebase', 40),
            vendorChunk(/[\\/]node_modules[\\/]vuetify[\\/]/, 'vuetify', 30),
            vendorChunk(
              /[\\/]node_modules[\\/](@vue|vue|vue-router|pinia|vue-i18n|@intlify)[\\/]/,
              'vue',
              20,
            ),
            vendorChunk(/[\\/]node_modules[\\/]/, 'vendor', 10),
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: testEnv,
    restoreMocks: true,
    unstubGlobals: true,
    server: { deps: { inline: ['vuetify'] } },
  },
});
