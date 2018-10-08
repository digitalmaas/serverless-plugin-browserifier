'use strict'

const Promise = require('bluebird')
const path = require('path')
const os = require('os')

const validate = require('./lib/validate')
const configure = require('./lib/configure')
const bundle = require('./lib/bundle')

class BrowserifierPlugin {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = options
    this.globalBrowserifyConfig = {}
    this.servicePath = path.join(this.serverless.config.servicePath || os.tmpdir(), '.serverless')
    this.functionConfigCache = {}
    Object.assign(
      this,
      validate,
      configure,
      bundle
    )
    this.hooks = {
      // Handle `sls deploy`
      'before:package:createDeploymentArtifacts': this.prepareAllFunctions.bind(this),
      'after:package:createDeploymentArtifacts': this.bundleAllFunctions.bind(this),

      // Handle `sls deploy function`
      'before:package:function:package': this.prepareFunction.bind(this),
      'after:package:function:package': this.bundleFunction.bind(this)
    }
  }

  prepareAllFunctions () {
    return Promise
      .bind(this)
      .then(this.validate)
      .then(this.computeGlobalConfig)
      .then(() => {
        const fns = this.getAllFunctions().map(name => this.bootstrap(name).reflect())
        this.serverless.cli.log(`Browserifier: Preparing ${fns.length} functions...`)
        return Promise.all(fns)
      })
      .then(results => results
        .filter(inspection => inspection.isRejected())
        .forEach(inspection => this.handleSkip(inspection.reason())))
      .tapCatch(this.warnFailure)
  }

  prepareFunction () {
    return Promise
      .bind(this)
      .then(this.validate)
      .then(this.computeGlobalConfig)
      .then(() => this.bootstrap(this.options.function))
      .catch(this.handleSkip)
      .tapCatch(this.warnFailure)
  }

  bundleAllFunctions () {
    return Promise
      .bind(this)
      .then(() => Promise.all(this.getAllFunctions().map(name => this.bundle(name))))
      .tapCatch(this.warnFailure)
  }

  bundleFunction () {
    return Promise
      .bind(this)
      .then(() => this.bundle(this.options.function))
      .tapCatch(this.warnFailure)
  }

  getAllFunctions () {
    return this.serverless.service.getAllFunctions()
  }

  handleSkip (err) {
    if (err.statusCode !== 'skip') {
      throw err
    }
    this.serverless.cli.log(`Browserifier: ${err.message}, skipping browserify`)
  }

  warnFailure () {
    this.serverless.cli.log(`Browserifier: unexpected failure detected`)
  }
}

module.exports = BrowserifierPlugin
