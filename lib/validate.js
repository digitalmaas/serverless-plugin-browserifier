'use strict'

const get = require('lodash/get')
const errors = require('./errors')

module.exports = {
  _validate () {
    if (this._b.isDisabled) {
      throw new errors.SkipError('plugin disabled, skipped')
    }
    if (this._o.build === false) {
      throw new errors.SkipError('--no-build option detected, skipped')
    }
    if (!this._b.packageIndividually) {
      throw new errors.SkipError('Service not configrued to `package.individually`, skipped')
    }
  },

  _validateFunction (data) {
    if (get(data, 'functionObject.browserify.disable', this._b.isDisabled)) {
      throw new errors.SkipFunctionError(data.functionName, 'bundling disabled')
    }
    const node = this._b.runtimeIsNode ? 'nodejs' : ''
    if (!get(data, 'functionObject.runtime', node).includes('nodejs')) {
      throw new errors.SkipFunctionError(data.functionName, 'function runtime is not nodejs')
    }
    if (!get(data, 'functionObject.package.individually', this._b.packageIndividually)) {
      throw new errors.SkipFunctionError(data.functionName, 'individual packaging not set')
    }
    return data
  }
}
