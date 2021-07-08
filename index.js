'use strict'

const Promise = require('bluebird')
const get = require('lodash/get')
const path = require('path')
const os = require('os')

const bundle = require('./lib/bundle')
const configure = require('./lib/configure')
const errors = require('./lib/errors')
const validate = require('./lib/validate')

class BrowserifierPlugin {
  constructor (serverless, options) {
    this.S = serverless
    this._b = {
      options,
      debugOn: Boolean(process.env.SLS_DEBUG) || Boolean(process.env.SLS_BROWSERIFIER_DEBUG),
      isDisabled: get(this.S, 'service.custom.browserify.disable', false),
      servicePath: path.join(this.S.config.servicePath || os.tmpdir(), '.serverless'),
      runtimeIsNode: get(this.S, 'service.provider.runtime', '').indexOf('nodejs') !== -1,
      packageIndividually: get(this.S, 'service.package.individually', false),
      globalBrowserifyConfig: {},
      functionConfigCache: {}
    }
    this.hooks = {
      // handle `sls deploy`
      'before:package:createDeploymentArtifacts': this._prepareAllFunctions.bind(this),
      // handle `sls deploy function`
      'before:package:function:package': this._prepareFunction.bind(this),
      'after:package:function:package': this._bundleFunction.bind(this)
    }
  }

  _prepareAllFunctions () {
    return Promise.bind(this)
      .then(this._validate)
      .then(this._computeGlobalConfig)
      .then(() => {
        const fns = this._getAllFunctions()
        this.S.cli.log(`Browserifier: Preparing ${fns.length} function(s)...`)
        return Promise.map(fns, name => this._bootstrap(name).reflect())
      })
      .then(results => {
        return results
          .filter(inspection => inspection.isRejected())
          .forEach(inspection => this._handleSkip(inspection.reason()))
      })
      .then(() => Promise.all(this._getAllFunctions().map(name => this._bundle(name))))
      .catch(this._handleSkip)
      .tapCatch(this._warnFailure)
  }

  _prepareFunction () {
    return Promise.bind(this)
      .then(this._validate)
      .then(this._computeGlobalConfig)
      .then(() => this._bootstrap(this._b.options.function))
      .then(() => this._bundle(this._b.options.function))
      .catch(this._handleSkip)
      .tapCatch(this._warnFailure)
  }

  _getAllFunctions () {
    return this.S.service.getAllFunctions()
  }

  _handleSkip (err) {
    if (err instanceof errors.SkipError) {
      this.S.cli.log(`Browserifier: ${err.message}`)
    } else {
      throw err
    }
  }

  _warnFailure () {
    this.S.cli.log('Browserifier: Unexpected failure detected!')
  }

  static getName () {
    return 'com.digitalmaas.BrowserifierPlugin'
  }
}

Object.assign(BrowserifierPlugin.prototype, configure, bundle, validate)
module.exports = BrowserifierPlugin
