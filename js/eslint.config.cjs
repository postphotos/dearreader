module.exports = [
  // Global ignore patterns (flat config replacement for .eslintignore)
  {
    ignores: ['node_modules/**', 'build/**', 'build_test/**', 'dist/**', '.venv/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
  'require-jsdoc': 'off',
  'max-len': ['warn', { code: 140 }],
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  // Less strict rules for generated/build/test files
  {
    files: ['build/**', 'build_test/**', 'test/**', '**/__tests__/**', 'src/**/__tests__/**'],
    rules: {
      'max-len': ['warn', { code: 200 }],
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  // Relax some rules for source files to reduce noisy warnings
  {
    files: ['src/**'],
    rules: {
      'max-len': ['warn', { code: 240 }],
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
];
