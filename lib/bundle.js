'use strict'

const Promise = require('bluebird')

const archiver = require('archiver')
const browserify = require('browserify')
const filesize = require('filesize')
const globby = require('globby')
const path = require('path')
const semver = require('semver')

const fs = require('./fs')

/// //////////////////////// exports && main functions

module.exports = {
  _bundle: bundle,
  _bootstrap: bootstrap
}

function bundle (functionName) {
  const data = this._b.functionConfigCache[functionName]
  if (!data) {
    return Promise.resolve()
  }
  return Promise.bind(this)
    .return(data)
    .then(clean)
    .then(prepareIncludes)
    .then(runBrowserify)
    .then(zipIt)
    .then(clean)
}

function bootstrap (functionName) {
  if (this._b.debugOn) {
    this.S.cli.log(`Browserifier: Preparing "${functionName}"...`)
  }
  return Promise.bind(this)
    .return(functionName)
    .then(prepareInitialData)
    .then(this._validateFunction)
    .then(cacheConfig)
    .then(fixServerlessConfig)
}

/// //////////////////////// support functions

function prepareInitialData (functionName) {
  return {
    functionName,
    outputFolder: path.join(this._b.servicePath, functionName),
    functionObject: this.S.service.getFunction(functionName),
    functionBrowserifyConfig: this._getFunctionConfig(functionName),
    outputBundle: path.relative(
      this.S.config.servicePath,
      path.join(this._b.servicePath, `${functionName}.zip`)
    )
  }
}

function cacheConfig (data) {
  if (data) {
    this._b.functionConfigCache[data.functionName] = data
  }
  return data
}

function prepareIncludes (data) {
  const includeFiles = globby.sync(data.functionBrowserifyConfig.include, {
    cwd: this.S.config.servicePath,
    dot: true,
    silent: true,
    follow: true
  })
  if (includeFiles && includeFiles.length) {
    if (this._b.debugOn) {
      this.S.cli.log('Browserifier: Copying includes: ' + includeFiles)
    }
    const copyFile = file => {
      return fs.copy(path.join(this.S.config.servicePath, file), path.join(data.outputFolder, file))
    }
    return Promise.each(includeFiles, copyFile).return(data)
  }
  return data
}

function runBrowserify (data) {
  if (this._b.debugOn) {
    this.S.cli.log(`Browserifier: Browserifying ${data.functionName}...`)
  }
  const cfg = data.functionBrowserifyConfig
  const b = browserify(cfg)
  cfg.exclude.forEach(file => b.exclude(file))
  cfg.ignore.forEach(file => b.ignore(file))
  cfg.external.forEach(file => b.external(file))
  return Promise.fromCallback(cb => b.bundle(cb))
    .then(bundleBuffer => {
      if (this._b.debugOn) {
        this.S.cli.log(`Browserifier: Writing browserified bundle to ${data.outputFolder}...`)
      }
      let handlerPath = data.functionObject.handler.split('.')[0] + '.js'
      handlerPath = path.join(data.outputFolder, handlerPath)
      this.S.utils.writeFileDir(handlerPath)
      return Promise.fromCallback(cb => fs.writeFile(handlerPath, bundleBuffer, cb))
    })
    .tap(() => {
      if (this._b.debugOn) {
        this.S.cli.log(`Browserifier: Browserified output dumped to ${data.outputFolder}...`)
      }
    })
    .return(data)
}

function zipIt (data) {
  if (this._b.debugOn) {
    this.S.cli.log(`Browserifier: Zipping ${data.outputFolder} to ${data.outputBundle}...`)
  }
  const handleStream = (resolve, reject) => {
    const output = fs.getNewFileStream(data.outputBundle)
    const zip = archiver.create('zip', { zlib: { level: 9 } })
    output.on('close', () => resolve(zip.pointer()))
    zip.on('error', err => reject(err))
    output.on('open', () => {
      zip.pipe(output)
      zip.directory(data.outputFolder, '')
      zip.finalize()
    })
  }
  return new Promise(handleStream).then(sizeInBytes => {
    this.S.cli.log(`Browserifier: Created ${data.functionName}.zip (${filesize(sizeInBytes)})...`)
    return data
  })
}

function clean (data) {
  if (fs.existsSync(data.outputFolder)) {
    return fs.removeSync(data.outputFolder)
  }
  return data
}

function fixServerlessConfig (data) {
  if (semver.lt(this.S.getVersion(), '1.18.0')) {
    data.functionObject.artifact = data.outputBundle
    data.functionObject.package = Object.assign({}, data.functionObject.package, { disable: true })
  } else {
    data.functionObject.package = {
      artifact: data.outputBundle
    }
  }
  return data
}
