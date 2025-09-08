module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    mocha: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'google'
  ],
  rules: {
    // project prefers no require-jsdoc
    'require-jsdoc': 'off',
    'max-len': ['warn', { code: 120 }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
