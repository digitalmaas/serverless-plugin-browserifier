'use strict'

const Bb = require('bluebird')

const validate = require('./lib/validate')
const configure = require('./lib/configure')
const bundle = require('./lib/bundle')

class SlsBrowserify {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = options
    this.globalBrowserifyConfig = {}

    Object.assign(
      this,
      validate,
      configure,
      bundle
    )

    this.commands = {
      browserify: {
        usage: 'Bundle Node.js lambda with Browserify',
        lifecycleEvents: [
          'validate',
          'bundle'
        ],
        options: {
          out: {
            usage: 'Path to output directory',
            shortcut: 'o'
          },
          function: {
            usage: 'Name of the function',
            shortcut: 'f',
            required: true
          }
        },
        commands: {}
      }
    }

    this.hooks = {
      // Handle `sls deploy`
      'before:package:createDeploymentArtifacts': () => Bb
        .bind(this)
        .then(this.validate)
        .then(this.globalConfig)
        .then(() => {
          const functionNames = this.serverless.service.getAllFunctions()
          return Bb.all(functionNames.map(functionName => {
            return this.bundle(functionName)
          }))
        })
        .catch(handleSkip),

      // Handle `sls deploy function`
      'before:package:function:package': () => Bb
        .bind(this)
        .then(this.validate)
        .then(this.globalConfig)
        .then(() => this.bundle(this.options.function))
        .catch(handleSkip),

      // Handle `sls browserify`
      'browserify:validate': () => Bb
        .bind(this)
        .then(this.validate)
        .then(this.globalConfig)
        .then(() => this.bundle(this.options.function))
        .catch(handleSkip)
    }
  }
}

function handleSkip (err) {
  if (err.statusCode !== 'skip') { // User explicitly chose to skip this function's browserification
    throw err
  } else {
    this.serverless.cli.log(`WARNING: ${err.message} skipping browserifier`)
  }
}

module.exports = SlsBrowserify
