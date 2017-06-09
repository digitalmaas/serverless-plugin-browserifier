'use strict'

module.exports.validate = function () {
  if (process.env.SLS_DEBUG) {
    this.serverless.cli.log('Browserifier::validate')
  }

  if (!this.serverless.service.provider.runtime || this.serverless.service.provider.runtime.indexOf('nodejs') === -1) {
    throw new this.serverless.classes.Error('Browserifier plugin only works against nodejs runtimes')
  }

  if (!this.serverless.service.package || !this.serverless.service.package.individually) {
    throw new this.serverless.classes.Error('Browserifier plugin only works when packaging functions individually. package.individually must be true in serverless.yml', 'skip')
  }
}
