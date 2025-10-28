import globals from 'globals'
import neostandard from 'neostandard'

export default [
  ...neostandard(),
  {
    ignores: [
      '**/*.html',
      '**/*.md',
      '**/*.json',
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'shapes/**'
    ],
  },
  {
    files: ['src/**/*.js', 'src/**/*.cjs', 'src/**/*.mjs'],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      }
    },
    rules: {
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      'no-console': 'warn',
      'no-unused-vars': 'error',
      'no-undef': 'error'
    },
  }
]