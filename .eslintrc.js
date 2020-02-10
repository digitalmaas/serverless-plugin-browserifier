'use strict'

const prettierrc = require('./.prettierrc.json')
const engines = require('./package.json').engines

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  env: {
    node: true
  },
  plugins: [
    'node',
    'prettierx'
  ],
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'standard',
    'plugin:prettierx/standardx'
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
