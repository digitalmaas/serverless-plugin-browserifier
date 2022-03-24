'use strict'

const os = require('os')
const path = require('path')

const get = require('lodash/get')
const Bb = require('bluebird')

const bundle = require('./bundle')
const configure = require('./configure')
const errors = require('./errors')
const validate = require('./validate')

class BrowserifierPlugin {
  constructor (serverless, options) {
    this._s = serverless
    this._o = options
    this._b = {
      debugOn: Boolean(process.env.SLS_DEBUG) || Boolean(process.env.SLS_BROWSERIFIER_DEBUG),
      isDisabled: get(this._s, 'service.custom.browserify.disable', false),
      servicePath: path.join(this._s.config.servicePath || os.tmpdir(), '.serverless'),
      runtimeIsNode: get(this._s, 'service.provider.runtime', '').includes('nodejs'),
      packageIndividually: get(this._s, 'service.package.individually', false),
      globalBrowserifyConfig: {},
      functionConfigCache: {},
      localInvoke: false
    }
    this.hooks = {
      'initialize': this.initialise.bind(this),
      // handles `sls deploy`
      'before:package:createDeploymentArtifacts': this.prepareAndBundleAll.bind(this),
      // handles `sls deploy function`
      'before:package:function:package': this.prepareAndBundleFunction.bind(this, false),
      // handles `sls invoke local`
      'before:invoke:local:invoke': this.prepareAndBundleFunction.bind(this, true)
    }
    this._s.configSchemaHandler.defineFunctionProperties('browserify', {
      type: 'object',
      minProperties: 1,
      additionalProperties: true,
      properties: {
        disable: { type: 'boolean' }
      }
    })
  }

  initialise () {
    if (this._s.processedInput && this._s.processedInput.options) {
      this._o = this._s.processedInput.options
    }
  }

  prepareAndBundleAll () {
    return Bb.bind(this)
      .then(this.prepareAllFunctions)
      .then(this.bundleAllFunctions)
      .catch(this.handleSkip)
      .tapCatch(this.warnFailure)
  }

  prepareAndBundleFunction (localInvoke) {
    this._b.localInvoke = localInvoke
    return Bb.bind(this)
      .then(this.prepareFunction)
      .then(this.bundleFunction)
      .catch(this.handleSkip)
      .tapCatch(this.warnFailure)
  }

  prepareAllFunctions () {
    return Bb.bind(this)
      .then(this._validate)
      .then(this._computeGlobalConfig)
      .then(() => {
        const functionList = this.getAllFunctions()
        this._s.cli.log(`Browserifier: Preparing ${functionList.length} function(s)...`)
        return Bb.map(functionList, name => this._bootstrap(name).reflect())
      })
      .then(results => {
        return results
          .filter(inspection => inspection.isRejected())
          .forEach(inspection => this.handleSkip(inspection.reason()))
      })
  }

  prepareFunction () {
    return Bb.bind(this)
      .then(this._validate)
      .then(this._computeGlobalConfig)
      .then(() => this._bootstrap(this._o.function))
  }

  bundleAllFunctions () {
    return Bb.bind(this)
      .then(this._validate)
      .then(() => Bb.map(this.getAllFunctions(), name => this._bundle(name)))
  }

  bundleFunction () {
    return Bb.bind(this)
      .then(this._validate)
      .then(() => this._bundle(this._o.function))
  }

  getAllFunctions () {
    return this._s.service.getAllFunctions()
  }

  handleSkip (err) {
    if (err instanceof errors.SkipError) {
      this._s.cli.log(`Browserifier: ${err.message}`)
    } else {
      throw err
    }
  }

  warnFailure () {
    this._s.cli.log('Browserifier: Unexpected failure detected!')
  }

  static getName () {
    return 'com.digitalmaas.BrowserifierPlugin'
  }
}

Object.assign(BrowserifierPlugin.prototype, configure, bundle, validate)
module.exports = BrowserifierPlugin
