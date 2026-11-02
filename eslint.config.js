import { globalIgnores } from 'eslint/config';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,ts,mts,vue}'],
  },

  globalIgnores([
    'dist/**',
    'sourcemaps/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'public/**',
    'packages/**',
    // Cloud Functions have their own lint config and run (functions/package.json).
    'functions/**',
  ]),

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    name: 'app/rules',
    rules: {
      // A leading underscore marks a parameter a signature needs but the body doesn't use.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
    },
  },

  {
    name: 'app/node-files',
    files: ['*.config.{js,ts}', 'e2e/**', 'tests/**'],
    languageOptions: { globals: globals.node },
  },

  skipFormatting,
);
