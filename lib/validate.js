'use strict'

const get = require('lodash/get')
const errors = require('./errors')

module.exports = {
  _validate () {
    if (this._b.isDisabled) {
      throw new errors.SkipError('plugin disabled...')
    }
    if (!this._b.runtimeIsNode) {
      this.S.cli.log('Browserifier: Service runtime is not nodejs...')
    }
    if (!this._b.packageIndividually) {
      this.S.cli.log('Browserifier: Service not set to package individually...')
    }
  },

  _validateFunction (data) {
    if (get(data, 'functionBrowserifyConfig.disable', this._b.isDisabled)) {
      throw new errors.SkipFunctionError(data.functionName, 'bundling disabled')
    }
    const node = this._b.runtimeIsNode ? 'nodejs' : ''
    if (get(data, 'functionObject.runtime', node).indexOf('nodejs') === -1) {
      throw new errors.SkipFunctionError(data.functionName, 'runtime is not nodejs')
    }
    if (!get(data, 'functionObject.package.individually', this._b.packageIndividually)) {
      throw new errors.SkipFunctionError(data.functionName, 'individual packaging not set')
    }
    return data
  }
}
