/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./packages/*/tsconfig.json'],
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'import/extensions': [
      'error',
      'ignorePackages',

      {
        ts: 'never',
        js: 'never',
      },
    ],
    // --- Your conventions (concise essentials) ---
    quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    semi: ['error', 'never'],
    'space-before-function-paren': ['error', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never',
    }],
    'eol-last': ['error', 'always'],
    'max-len': ['error', { code: 130 }],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'operator-linebreak': ['error', 'before'],
    '@typescript-eslint/array-type': ['error', { default: 'array' }],
    '@typescript-eslint/prefer-as-const': 'error',
    'prefer-const': ['error', { destructuring: 'any', ignoreReadBeforeAssign: false }],

    // --- NodeNext / ESM specific ---
    'import/no-unresolved': 'error',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['./*', '../*'],
            message: 'Always include the .js extension for relative imports under NodeNext.',
          },
        ],
      },
    ],
  },
  settings: {
    'import/resolver': {
      // Let ESLint understand TypeScript path aliases
      typescript: {
        project: ['./packages/*/tsconfig.json'],
      },
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'tests',
    'tsconfig.json',
    'index.ts',
    'vitest.config.ts',
    '.eslintrc.cjs'
  ],
}
