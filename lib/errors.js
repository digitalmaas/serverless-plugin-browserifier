'use strict'

class SkipError extends Error {
  constructor (message) {
    super(message)
    this.name = 'SkipError'
  }
}
module.exports.SkipError = SkipError

class SkipFunctionError extends SkipError {
  constructor (functionName, reason) {
    super(`Skipping "${functionName}", ${reason}...`)
    this.name = 'SkipFunctionError'
  }
}
module.exports.SkipFunctionError = SkipFunctionError
