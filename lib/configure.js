'use strict'

const union = require('lodash.union')

module.exports = {
  /**
   * Compute the base configuration
   */
  computeGlobalConfig () {
    if (process.env.SLS_DEBUG) {
      this.serverless.cli.log('Browserifier::globalConfig')
    }

    const globalCustom = (this.serverless.service.custom && this.serverless.service.custom.browserify) || {}

    if (globalCustom.disable) {
      throw new this.serverless.classes.Error('custom.browserify.disable is true in serverless.yml', 'skip')
    }

    const globalDefault = this.getBrowserifyDefaultConfig()

    // Merge in global config
    this.globalBrowserifyConfig = Object.assign({}, globalDefault, globalCustom)

    if (this.serverless.service.package) {
      // Merge together package.exclude and custom.browserify.exclude
      if (this.serverless.service.package.exclude && this.serverless.service.package.exclude.length) {
        this.globalBrowserifyConfig.exclude = union(this.serverless.service.package.exclude, this.globalBrowserifyConfig.exclude)
      }
      // Save service package.include
      if (this.serverless.service.package.include && this.serverless.service.package.include.length) {
        this.globalBrowserifyConfig.include = this.serverless.service.package.include
      }
    }

    if (process.env.SLS_DEBUG) {
      console.log('computed globalBrowserifyConfig', this.globalBrowserifyConfig)
    }
  },

  /**
   * Returns plugin default configuration object.
   * @return {object} Default plugin configuration.
   */
  getBrowserifyDefaultConfig () {
    const version = this.getBrowserifyVersion()
    if (version < '13.3.0') {
      throw new this.serverless.classes.Error('Minimal \'browserify\' version supported is v13.3.0.', 'skip')
    }
    this.serverless.cli.log('Browserifier: Using browserify@' + version)
    // Props disable, exclude, include, external and ignore are not browserify
    // options, but will be used for custom plugin settings if defined in yml
    const config = {
      disable: false,
      exclude: [],
      include: [],
      external: [],
      ignore: [],
      basedir: this.serverless.config.servicePath,
      entries: [],
      standalone: 'lambda',
      ignoreMissing: true, // Do not fail on missing optional dependencies
      detectGlobals: true, // We don't care if its slower, we want more mods to work
      debug: Boolean(process.env.SLS_DEBUG)
    }
    if (version >= '16.1.0') {
      config.node = true
    } else {
      Object.assign(config, {
        browserField: false, // Setup for node app (copy logic of --node in bin/args.js)
        builtins: false,
        commondir: false,
        insertGlobalVars: {
          process: undefined,
          global: undefined,
          Buffer: undefined,
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
  getBrowserifyVersion () {
    try {
      const pkg = require('browserify/package.json')
      return pkg.version
    } catch (err) {
      throw new this.serverless.classes.Error('Required peer dependency \'browserify\' is not installed.', 'skip')
    }
  },

  /**
   * Merge the global base configuration with given lambda function contextual configuration
   *
   * @param {string} functionName () {}
   * @returns {*}
   */
  getFunctionConfig (functionName) {
    const functionObject = this.serverless.service.getFunction(functionName)
    let functionBrowserifyConfig = Object.assign({}, this.globalBrowserifyConfig, functionObject.browserify || {})

    if (functionBrowserifyConfig.disable) {
      throw new this.serverless.classes.Error(`browserify.disable is true for ${functionName}`, 'skip')
    }

    if (process.env.SLS_DEBUG) {
      console.log(`functionObject for ${functionName}`, functionObject)
    }

    if (!functionBrowserifyConfig.entries.length) {
      const bundleEntryPt = functionObject.handler.split('.')[0] + '.js'
      functionBrowserifyConfig.entries = [bundleEntryPt]
    }

    if (functionObject.package) {
      // Merge together functions.FUNCTION.package.exclude and browserify exclude
      if (functionObject.package.exclude && functionObject.package.exclude.length) {
        functionBrowserifyConfig.exclude = union(functionBrowserifyConfig.exclude, functionObject.package.exclude)
      }
      // Merge together service and function includes
      if (functionObject.package.include && functionObject.package.include.length) {
        functionBrowserifyConfig.include = union(functionBrowserifyConfig.include, functionObject.package.include)
      }
    }

    if (process.env.SLS_DEBUG) {
      console.log('computed function BrowserifierConfig', functionBrowserifyConfig)
    }

    return functionBrowserifyConfig
  }
}
