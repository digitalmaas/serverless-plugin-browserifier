module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'script'
  },
  env: {
    node: true,
    es6: true,
    jest: true
  },
  plugins: [
    'standard',
    'prettier'
  ],
  extends: [
    'standard',
    'prettier',
    'prettier/standard'
  ],
  rules: {
    'space-before-function-paren': ['error', 'always']
  }
}
