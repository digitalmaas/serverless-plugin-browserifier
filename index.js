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
      'package:createDeploymentArtifacts': this.createAllArtifacts.bind(this),

      // Handle `sls deploy function`
      'package:function:package': this.createArtifact.bind(this),

      // Handle `sls browserify`
      'browserify:validate': this.createArtifact.bind(this)
    }
  }

  createAllArtifacts () {
    return Bb
      .bind(this)
      .then(this.validate)
      .then(this.globalConfig)
      .then(() => Bb.all(this.serverless.service.getAllFunctions().map(name => this.bundle(name))))
      .catch(this.handleSkip)
  }

  createArtifact() {
    return Bb
      .bind(this)
      .then(this.validate)
      .then(this.globalConfig)
      .then(() => this.bundle(this.options.function))
      .catch(this.handleSkip)
  }

  handleSkip (err) {
    if (err.statusCode !== 'skip') { // User explicitly chose to skip this function's browserification
      throw err
    } else {
      this.serverless.cli.log(`Browserifier: ${err.message}, skipping browserify`)
    }
  }

}

module.exports = SlsBrowserify
