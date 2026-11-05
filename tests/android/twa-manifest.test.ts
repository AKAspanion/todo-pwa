// The Play Store app's project (A1–A5 of docs/specs/2026-11-04-play-store-twa.md): the Bubblewrap
// manifest, the project generated from it, Digital Asset Links, what git keeps out, and the
// release notes.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const android = join(root, 'packages', 'android');
const PACKAGE_ID = 'in.spanion.todo.pwa';
const OLD_PACKAGE = 'app.web.spanion_todo';
/** The developer's upload key (public certificate fingerprint; the keystore stays outside the repository). */
const UPLOAD_KEY_FINGERPRINT =
  '05:FF:05:24:25:81:9B:BA:C2:A8:85:AF:0B:A2:33:B1:19:E9:C1:A0:22:EF:24:D1:B8:6A:79:19:AF:BA:A0:80';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

// Every file under dir, skipping what Gradle and the developer's machine write (.gitignore'd).
function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const skipped = new Set(['build', '.gradle']);
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return skipped.has(entry) ? [] : filesUnder(path);
    return [path];
  });
}

describe('twa-manifest.json (A2)', () => {
  const manifestPath = join(android, 'twa-manifest.json');
  const manifest = (existsSync(manifestPath) ? readJson(manifestPath) : {}) as Record<
    string,
    unknown
  >;

  it.each([
    ['packageId', PACKAGE_ID],
    ['host', 'todo.spanion.in'],
    ['name', 'Task Manager'],
    ['launcherName', 'Task Manager'],
    ['startUrl', '/home'],
    ['webManifestUrl', 'https://todo.spanion.in/manifest.webmanifest'],
    ['iconUrl', 'https://todo.spanion.in/img/icons/android-chrome-512x512.png'],
    ['maskableIconUrl', 'https://todo.spanion.in/img/icons/maskable-icon-512x512.png'],
    ['themeColor', '#1976D2'],
    ['themeColorDark', '#1976D2'],
    ['navigationColor', '#1976D2'],
    ['navigationColorDark', '#1976D2'],
    ['backgroundColor', '#FAFAFA'],
    ['display', 'standalone'],
    ['orientation', 'default'],
    ['fallbackType', 'customtabs'],
    ['enableNotifications', true],
    ['signingKey', { path: './android.keystore', alias: 'android' }],
    ['appVersionCode', 1],
    ['appVersionName', '1.0.0'],
    // Bubblewrap reads the version name from appVersion, and writes both.
    ['appVersion', '1.0.0'],
    ['fullScopeUrl', 'https://todo.spanion.in/'],
    ['generatorApp', 'bubblewrap-cli'],
    ['shortcuts', []],
  ])('sets %s', (field, value) => {
    expect(manifest[field]).toEqual(value);
  });

  it('never falls back to a WebView, where Google refuses sign-in', () => {
    expect(manifest.fallbackType).not.toBe('webview');
  });
});

describe('the generated project (A1, A2)', () => {
  const gradle = read(join(android, 'app', 'build.gradle'));

  it('targets API 36', () => {
    expect(gradle).toMatch(/^\s*targetSdkVersion 36$/m);
  });

  it('is the app in.spanion.todo.pwa opening todo.spanion.in', () => {
    expect(gradle).toContain(`applicationId "${PACKAGE_ID}"`);
    expect(gradle).toContain("hostName: 'todo.spanion.in'");
  });

  it('carries the version and the Custom Tabs fallback from the manifest', () => {
    expect(gradle).toMatch(/^\s*versionCode 1$/m);
    expect(gradle).toContain('versionName "1.0.0"');
    expect(gradle).toContain("fallbackType: 'customtabs'");
  });

  it('leaves nothing of the PWABuilder project', () => {
    expect(existsSync(join(android, 'source'))).toBe(false);
    expect(existsSync(join(android, 'Readme.html'))).toBe(false);
    const naming = filesUnder(android)
      .filter((path) => read(path).includes(OLD_PACKAGE) || path.includes('spanion_todo'))
      .map((path) => relative(root, path));
    expect(naming).toEqual([]);
  });
});

describe('assetlinks.json (A4)', () => {
  const statements = readJson(join(root, 'public', '.well-known', 'assetlinks.json'));

  it('holds exactly one statement, delegating to in.spanion.todo.pwa', () => {
    expect(statements).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: PACKAGE_ID,
          sha256_cert_fingerprints: expect.any(Array),
        },
      },
    ]);
  });

  it('no longer names the old package', () => {
    expect(JSON.stringify(statements)).not.toContain(OLD_PACKAGE);
  });

  it("lists the upload key's fingerprint (A4)", () => {
    const [statement] = statements as { target: { sha256_cert_fingerprints: string[] } }[];
    expect(statement?.target.sha256_cert_fingerprints).toContain(UPLOAD_KEY_FINGERPRINT);
  });

  it('lists only SHA-256 fingerprints', () => {
    const [statement] = statements as { target: { sha256_cert_fingerprints: string[] } }[];
    for (const fingerprint of statement?.target.sha256_cert_fingerprints ?? []) {
      expect(fingerprint).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
  });
});

describe('what stays out of git (A3)', () => {
  function ignored(paths: string[]): string[] {
    try {
      return execFileSync('git', ['check-ignore', ...paths], { cwd: root, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    } catch {
      // git check-ignore exits 1 when it ignores none of them.
      return [];
    }
  }

  it('ignores the keystore, the built packages and the Gradle output', () => {
    const paths = [
      'packages/android/android.keystore',
      'packages/android/upload.jks',
      'packages/android/app-release-signed.apk',
      'packages/android/app-release-bundle.aab',
      'packages/android/app-release-signed.apk.idsig',
      'packages/android/app/build/outputs/bundle/release/app-release.aab',
      'packages/android/build/tmp/x',
      'packages/android/.gradle/x',
      'packages/android/local.properties',
    ];
    expect(ignored(paths)).toEqual(paths);
  });

  it('tracks no keystore', () => {
    const tracked = execFileSync('git', ['ls-files', '--', '*.keystore', '*.jks'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(tracked).toBe('');
  });
});

describe('packages/android/README.md (A5)', () => {
  const readme = read(join(android, 'README.md'));

  it.each([
    'Ankit Kumar Pandit',
    'panditankit1995@gmail.com',
    'https://todo.spanion.in/privacy',
    'https://todo.spanion.in/delete-account',
    'npx @bubblewrap/cli@1.27.0',
    '13–15, 16–17 and 18+',
    'deleteUserData',
  ])('names %s', (text) => {
    expect(readme).toContain(text);
  });

  it('gives the closed-test rule: 12 testers for 14 days', () => {
    expect(readme).toMatch(/at least 12\s+testers\s+for\s+14\s+days/);
  });

  it('deploys deleteUserData by hand from the branch before merging (D8)', () => {
    expect(readme).toContain(
      'pnpm exec firebase deploy --only functions:deleteUserData --project spanion-todo',
    );
    expect(readme).toMatch(/Before merging this branch[\s\S]{0,400}pnpm exec firebase deploy/);
    expect(readme).toContain('delete-function-deployed-by-hand-first.md');
  });
});
