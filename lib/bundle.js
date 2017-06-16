'use strict'

const Bb = require('bluebird')
const browserify = require('browserify')
const globby = require('globby')
const path = require('path')
const fs = require('fs-extra')

/// //////////////////////// main functions

function clean (functionName) {
  const outputDir = this.options.out || path.join(this.servicePath, functionName)
  fs.remove(outputDir)
}

function bundle (functionName) {
  return Bb
    .bind(this)
    .return(functionName)
    .then(prepareInitialData)
    .then(prepareIncludes)
    .then(runBrowserify)
    .then(fixServerlessConfig)
}

/// //////////////////////// support functions

function prepareInitialData (functionName) {
  const data = {}
  data.functionName = functionName
  data.outputDir = this.options.out || path.join(this.servicePath, functionName)
  data.functionBrowserifyConfig = this.getFunctionConfig(functionName)
  data.functionObject = this.serverless.service.getFunction(functionName)
  return data
}

function prepareIncludes (data) {
  const includeFiles = globby.sync(data.functionBrowserifyConfig.include, {
    cwd: this.serverless.config.servicePath,
    dot: true,
    silent: true,
    follow: true
  })
  if (process.env.SLS_DEBUG) {
    this.serverless.cli.log('Browserifier: Copying includes: ' + includeFiles)
  }
  includeFiles.forEach(file => {
    fs.copySync(path.join(this.serverless.config.servicePath, file), path.join(data.outputDir, file))
  })
  return data
}

function runBrowserify (data) {
  this.serverless.cli.log(`Browserifier: Bundling ${data.functionName} with browserify...`)
  if (process.env.SLS_DEBUG) {
    this.serverless.cli.log(`Browserifier: Writing browserfied bundle to ${data.outputDir}`)
  }
  fs.emptyDirSync(data.outputDir)
  const b = browserify(data.functionBrowserifyConfig)
  data.functionBrowserifyConfig.exclude.forEach(b.exclude)
  data.functionBrowserifyConfig.ignore.forEach(b.ignore)
  return Bb
    .fromCallback(cb => b.bundle(cb))
    .then(bundleBuffer => {
      const handlerPath = path.join(data.outputDir, data.functionObject.handler.split('.')[0] + '.js')
      fs.mkdirsSync(path.dirname(handlerPath), '0777') // handler may be in a subdir
      return Bb.fromCallback(cb => fs.writeFile(handlerPath, bundleBuffer, cb))
    })
    .return(data)
}

function fixServerlessConfig (data) {
  data.functionObject.package = {
    individually: true,
    exclude: [ '**/*' ],
    include: [ data.outputDir + '/**/*' ]
  }
}

/// //////////////////////// exports

module.exports = {
  bundle,
  clean
}
