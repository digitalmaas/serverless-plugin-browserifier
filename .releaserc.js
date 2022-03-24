'use strict'

const changelogFile = 'CHANGELOG.md'
const writerOpts = { commitsSort: ['subject', 'scope'] }
const assets = [changelogFile, 'docs/', 'package.json']
const preset = 'conventionalcommits'

// //////////////////////////////////////////////

module.exports = {
  branches: [
    {
      name: 'master'
    },
    {
      name: 'next',
      prerelease: 'rc',
      channel: 'next'
    }
  ],
  plugins: [
    ['@semantic-release/commit-analyzer', { preset }],
    ['@semantic-release/release-notes-generator', { preset, writerOpts }],
    ['@semantic-release/changelog', { changelogFile }],
    ['@semantic-release/git', { assets }],
    '@semantic-release/github',
    '@semantic-release/npm'
  ]
}
