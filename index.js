'use strict'

const Bb = require('bluebird')
const path = require('path')
const os = require('os')

const validate = require('./lib/validate')
const configure = require('./lib/configure')
const bundle = require('./lib/bundle')

class SlsBrowserify {
  //
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
    return Bb
      .bind(this)
      .then(this.validate)
      .then(this.computeGlobalConfig)
      .then(() => Bb.all(this.getAllFunctions().map(name => this.bootstrap(name).reflect())))
      .then(results => results
        .filter(inspection => inspection.isRejected())
        .forEach(inspection => this.handleSkip(inspection.reason())))
      .tapCatch(this.warnFailure)
  }

  prepareFunction () {
    return Bb
      .bind(this)
      .then(this.validate)
      .then(this.computeGlobalConfig)
      .then(() => this.bootstrap(this.options.function))
      .catch(this.handleSkip)
      .tapCatch(this.warnFailure)
  }

  bundleAllFunctions () {
    return Bb
      .bind(this)
      .then(() => this.getAllFunctions().forEach(name => this.bundle(name)))
      .tapCatch(this.warnFailure)
  }

  bundleFunction () {
    return Bb
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

module.exports = SlsBrowserify
