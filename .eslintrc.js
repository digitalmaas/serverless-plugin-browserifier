'use strict'

const prettierrc = require('./.prettierrc.json')
const engines = require('./package.json').engines

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module'
  },
  env: {
    node: true
  },
  plugins: ['prettierx'],
  extends: [
    // order matters
    'eslint:recommended',
    'standardize',
    'plugin:prettierx/standardize'
  ],
  settings: {
    prettierx: {
      usePrettierrc: true,
      editorconfig: true
    }
  },
  rules: {
    'require-atomic-updates': 0,
    'node/no-extraneous-require': 0,
    'node/no-unsupported-features/es-syntax': ['error', { version: engines.node }],
    'prettierx/options': ['error', prettierrc]
  }
}
