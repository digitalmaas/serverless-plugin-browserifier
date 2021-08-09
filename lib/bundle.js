'use strict'

const path = require('path')
const Bb = require('bluebird')

const archiver = require('archiver')
const browserify = require('browserify')
const filesize = require('filesize')
const globby = require('globby')
const semver = require('semver')

const errors = require('./errors')
const fs = require('./fs')

/// //////////////////////// exports && main functions

module.exports = {
  _bundle: bundle,
  _bootstrap: bootstrap
}

function bundle (functionName) {
  if (this._b.debugOn) {
    this._s.cli.log(`Browserifier: Bundling "${functionName}"...`)
  }
  return Bb.bind(this)
    .return(functionName)
    .then(getConfigFromCache)
    .then(prepareIncludes)
    .then(runBrowserify)
    .then(data => {
      if (this._b.localInvoke === true) {
        return data
      }
      return Bb.bind(this).return(data).then(zipIt).then(clean)
    })
    .catch(err => (err instanceof errors.SkipFunctionError ? {} : Promise.reject(err)))
}

function bootstrap (functionName) {
  if (this._b.debugOn) {
    this._s.cli.log(`Browserifier: Preparing "${functionName}"...`)
  }
  return Bb.bind(this)
    .return(functionName)
    .then(prepareInitialData)
    .then(this._validateFunction)
    .then(cacheConfig)
    .then(fixServerlessConfig)
    .then(clean)
}

/// //////////////////////// support functions

function prepareInitialData (functionName) {
  return {
    functionName,
    outputFolder: path.join(this._b.servicePath, functionName),
    functionObject: this._s.service.getFunction(functionName),
    functionBrowserifyConfig: this._getFunctionConfig(functionName),
    outputBundle: path.relative(
      this._s.config.servicePath,
      path.join(this._b.servicePath, `${functionName}.zip`)
    )
  }
}

function getConfigFromCache (functionName) {
  const data = this._b.functionConfigCache[functionName]
  if (!data) {
    throw new errors.SkipFunctionError(functionName + ' could not be found in config cache')
  }
  return data
}

function cacheConfig (data) {
  if (data) {
    this._b.functionConfigCache[data.functionName] = data
  }
  return data
}

function prepareIncludes (data) {
  const includeFiles = globby.sync(data.functionBrowserifyConfig.include, {
    cwd: this._s.config.servicePath,
    dot: true,
    silent: true,
    follow: true
  })
  if (includeFiles && includeFiles.length) {
    if (this._b.debugOn) {
      this._s.cli.log('Browserifier: Copying includes: ' + includeFiles)
    }
    const copyFile = file => {
      fs.copySync(path.join(this._s.config.servicePath, file), path.join(data.outputFolder, file))
    }
    return Bb.each(includeFiles, copyFile).return(data)
  }
  return data
}

function runBrowserify (data) {
  if (this._b.debugOn) {
    this._s.cli.log(`Browserifier: Browserifying ${data.functionName}...`)
  }
  const cfg = data.functionBrowserifyConfig
  const b = browserify(cfg)
  cfg.exclude.forEach(file => b.exclude(file))
  cfg.ignore.forEach(file => b.ignore(file))
  cfg.external.forEach(file => b.external(file))
  return Bb.fromCallback(cb => b.bundle(cb))
    .then(bundleBuffer => {
      if (this._b.debugOn) {
        this._s.cli.log(`Browserifier: Writing browserified bundle to ${data.outputFolder}...`)
      }
      const [handlerPath, handlerFunction] = data.functionObject.handler.split('.')
      let filePath = path.join(data.outputFolder, handlerPath)
      if (this._b.localInvoke === true) {
        const newHandlerPath = path.relative(this._s.config.servicePath, filePath)
        data.functionObject.handler = newHandlerPath + '.' + handlerFunction
        this._s.cli.log(`Browserifier: Function ${data.functionName} bundle generated...`)
      }
      filePath += '.js'
      this._s.utils.writeFileDir(filePath)
      return Bb.fromCallback(cb => fs.writeFile(filePath, bundleBuffer, cb))
    })
    .tap(() => {
      if (this._b.debugOn) {
        this._s.cli.log(`Browserifier: Browserified output dumped to ${data.outputFolder}...`)
      }
    })
    .return(data)
}

function zipIt (data) {
  if (this._b.debugOn) {
    this._s.cli.log(`Browserifier: Zipping ${data.outputFolder} to ${data.outputBundle}...`)
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
  return new Bb(handleStream).then(sizeInBytes => {
    this._s.cli.log(`Browserifier: Created ${data.functionName}.zip (${filesize(sizeInBytes)})...`)
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
  if (semver.lt(this._s.getVersion(), '1.18.0')) {
    data.functionObject.artifact = data.outputBundle
    data.functionObject.package = Object.assign({}, data.functionObject.package, { disable: true })
  } else {
    data.functionObject.package = {
      artifact: data.outputBundle
    }
  }
  return data
}
