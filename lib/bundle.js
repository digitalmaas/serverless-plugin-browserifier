'use strict'

const Bb = require('bluebird')
const browserify = require('browserify')
const archiver = require('archiver')
const globby = require('globby')
const path = require('path')

const fs = Bb.promisifyAll(require('fs-extra'))

/// //////////////////////// main functions

function bundle (functionName) {
  const data = this.functionConfigCache[functionName]
  if (!(data)) {
    return Bb.resolve()
  }
  return Bb
    .bind(this)
    .return(data)
    .then(prepareIncludes)
    .then(runBrowserify)
    .then(zip)
    .then(clean)
}

function bootstrap (functionName) {
  return Bb
    .bind(this)
    .return(functionName)
    .then(prepareInitialData)
    .then(fixServerlessConfig)
    .tap(() => {
      this.serverless.cli.log(`Browserifier: Preparing ${functionName}...`)
    })
}

/// //////////////////////// support functions

function prepareInitialData (functionName) {
  const data = {}
  data.functionName = functionName
  data.outputFolder = path.join(this.servicePath, functionName)
  data.functionBrowserifyConfig = this.getFunctionConfig(functionName)
  data.functionObject = this.serverless.service.getFunction(functionName)
  this.functionConfigCache[functionName] = data
  return data
}

function prepareIncludes (data) {
  fs.emptyDirSync(data.outputFolder)
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
    fs.copySync(path.join(this.serverless.config.servicePath, file), path.join(data.outputFolder, file))
  })
  return data
}

function runBrowserify (data) {
  if (process.env.SLS_DEBUG) {
    this.serverless.cli.log(`Browserifier: Writing browserified bundle to ${data.outputFolder}`)
  }
  const b = browserify(data.functionBrowserifyConfig)
  data.functionBrowserifyConfig.exclude.forEach(file => b.exclude(file))
  data.functionBrowserifyConfig.ignore.forEach(file => b.ignore(file))
  return Bb
    .fromCallback(cb => b.bundle(cb))
    .then(bundleBuffer => {
      const handlerPath = path.join(data.outputFolder, data.functionObject.handler.split('.')[0] + '.js')
      fs.mkdirsSync(path.dirname(handlerPath), '0777') // handler may be in a subdir
      return Bb.fromCallback(cb => fs.writeFile(handlerPath, bundleBuffer, cb))
    })
    .return(data)
}

function zip (data) {
  if (process.env.SLS_DEBUG) {
    this.serverless.cli.log(`Browserifier: Zipping ${data.outputFolder} to ${data.functionObject.artifact}`)
  }
  return new Bb((resolve, reject) => {
    const output = fs.createWriteStream(data.functionObject.artifact)
    const archive = archiver.create('zip')

    output.on('close', () => resolve(archive.pointer()))
    archive.on('error', (err) => reject(err))

    archive.pipe(output)
    archive.directory(data.outputFolder, '')
    archive.finalize()
  })
  .then(sizeInBytes => {
    const fileSizeInKBs = sizeInBytes / 100000.0
    this.serverless.cli.log(`Browserifier: Created ${data.functionName}.zip (${Math.round(fileSizeInKBs * 100)} KBs)...`)
    return data
  })
}

function clean (data) {
  fs.remove(data.outputFolder)
  if (fs.existsSync(data.workaroundFilePath)) fs.remove(data.workaroundFilePath)
  delete this.functionConfigCache[data.functionName]
}

function fixServerlessConfig (data) {
  data.workaroundFilePath = path.relative(this.serverless.config.servicePath, path.join(this.servicePath, 'fool-serverless.txt'))
  return fs.ensureFileAsync(data.workaroundFilePath)
    .then(() => fs.writeFileAsync(data.workaroundFilePath, 'fool packaging step'))
    .then(() => {
      data.functionObject.package = {
        individually: true,
        exclude: [ '**/*' ],
        include: [ data.workaroundFilePath ]
      }
      return data
    })
}

/// //////////////////////// exports

module.exports = {
  bundle,
  bootstrap
}
