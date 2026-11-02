// ESLint flat config for the Cloud Functions package. The package is CommonJS (no "type" in
// package.json), so this file is too.
const js = require('@eslint/js');
const { defineConfig, globalIgnores } = require('eslint/config');
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = defineConfig(
  globalIgnores(['lib/**', 'node_modules/**']),

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    name: 'functions/rules',
    languageOptions: { globals: globals.node },
    rules: {
      // A leading underscore marks a parameter a signature needs but the body doesn't use.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
      eqeqeq: 'error',
    },
  },

  {
    name: 'functions/commonjs-config',
    files: ['eslint.config.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
