'use strict'

const get = require('lodash/get')
const union = require('lodash/union')
const semver = require('semver')

module.exports = {
  /**
   * Compute the base configuration
   */
  _computeGlobalConfig () {
    if (this._b.debugOn) {
      this._s.cli.log('Browserifier: Computing global config...')
    }
    const globalCustom = get(this._s, 'service.custom.browserify', {})
    const globalDefault = this._getBrowserifyDefaultConfig()
    this._b.globalBrowserifyConfig = Object.assign({}, globalDefault, globalCustom)
    if (this._s.service.package) {
      // Merge together package.exclude and custom.browserify.exclude
      if (this._s.service.package.exclude && this._s.service.package.exclude.length) {
        this._b.globalBrowserifyConfig.exclude = union(
          this._s.service.package.exclude,
          this._b.globalBrowserifyConfig.exclude
        )
      }
      // Save service package.include
      if (this._s.service.package.include && this._s.service.package.include.length) {
        this._b.globalBrowserifyConfig.include = this._s.service.package.include
      }
    }
    if (this._b.debugOn) {
      const computed = JSON.stringify(this._b.globalBrowserifyConfig)
      this._s.cli.log('Browserifier: Computed globalBrowserifyConfig: ' + computed)
    }
  },

  /**
   * Returns plugin default configuration object.
   * @return {object} Default plugin configuration.
   */
  _getBrowserifyDefaultConfig () {
    const version = this._getBrowserifyVersion()
    if (semver.lt(version, '13.3.0')) {
      throw new this._s.classes.Error("Minimal 'browserify' version supported is v13.3.0.", 'skip')
    }
    this._s.cli.log('Browserifier: Using browserify@' + version)
    // Props disable, exclude, include, external and ignore are not browserify
    // options, but will be used for custom plugin settings if defined in yml
    const config = {
      disable: false,
      exclude: [],
      include: [],
      external: [],
      ignore: [],
      basedir: this._s.config.servicePath,
      entries: [],
      bare: true,
      standalone: 'lambda',
      extensions: ['.js'],
      ignoreMissing: true, // Do not fail on missing optional dependencies
      detectGlobals: true, // We don't care if its slower, we want more mods to work
      debug: this._b.debugOn
    }
    if (semver.gte(version, '16.1.0')) {
      if (this._b.debugOn) {
        this._s.cli.log('Browserifier: Using browserify "node" option...')
      }
      config.node = true
    } else {
      if (this._b.debugOn) {
        this._s.cli.log('Browserifier: Using browserify "legacy" options...')
      }
      Object.assign(config, {
        browserField: false, // Setup for node app (copy logic of --node in bin/args.js)
        builtins: false,
        commondir: false,
        insertGlobalVars: {
          'process': undefined,
          'global': undefined,
          'Buffer': undefined,
          'Buffer.isBuffer': undefined
        }
      })
    }
    return config
  },

  /**
   * Return browserify version to be used.
   * @return {[type]} [description]
   */
  _getBrowserifyVersion () {
    try {
      const pkg = require('browserify/package.json')
      return pkg.version
    } catch (err) {
      throw new this._s.classes.Error('Required peer dependency "browserify" is not available.')
    }
  },

  /**
   * Merge the global base configuration with given lambda function contextual configuration
   *
   * @param {string} functionName () {}
   * @returns {*}
   */
  _getFunctionConfig (functionName) {
    const functionObject = this._s.service.getFunction(functionName)
    const functionBrowserifyConfig = Object.assign(
      {},
      this._b.globalBrowserifyConfig,
      functionObject.browserify || {}
    )
    if (this._b.debugOn) {
      const computed = JSON.stringify(functionObject)
      this._s.cli.log(`Browserifier: functionObject for ${functionName}: ${computed}`)
    }
    if (!functionBrowserifyConfig.entries.length) {
      const bundleEntryPt = functionObject.handler.split('.')[0]
      functionBrowserifyConfig.entries = [bundleEntryPt]
    }
    if (functionObject.package) {
      // Merge together functions.FUNCTION.package.exclude and browserify exclude
      if (functionObject.package.exclude && functionObject.package.exclude.length) {
        functionBrowserifyConfig.exclude = union(
          functionBrowserifyConfig.exclude,
          functionObject.package.exclude
        )
      }
      // Merge together service and function includes
      if (functionObject.package.include && functionObject.package.include.length) {
        functionBrowserifyConfig.include = union(
          functionBrowserifyConfig.include,
          functionObject.package.include
        )
      }
    }
    if (this._b.debugOn) {
      const computed = JSON.stringify(functionBrowserifyConfig)
      this._s.cli.log('Browserifier: Computed function BrowserifierConfig: ' + computed)
    }
    return functionBrowserifyConfig
  }
}
