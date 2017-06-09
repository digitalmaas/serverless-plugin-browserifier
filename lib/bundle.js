'use strict'

const Bb = require('bluebird')
const browserify = require('browserify')
const os = require('os')
const path = require('path')
const archiver = require('archiver')
const glob = require('glob-all')

const fs = Bb.promisifyAll(require('fs-extra'))

function bundle (functionName) {
  const outputDir = this.options.out || path.join(os.tmpdir(), functionName)
  const functionBrowserifyConfig = this.getFunctionConfig(functionName)
  const finalZipFilePath = path.resolve(path.join(outputDir, '..', `${functionName}.zip`))

  let functionObject = this.serverless.service.getFunction(functionName)
  let browserifyInstance = browserify(functionBrowserifyConfig)

  this.serverless.cli.log(`Browserifier: Bundling ${functionName} with browserify...`)

  if (process.env.SLS_DEBUG) {
    this.serverless.cli.log(`Browserifier: Writing browserfied bundle to ${outputDir}`)
  }

  fs.emptyDirSync(outputDir)

  functionBrowserifyConfig.exclude.forEach(file => browserifyInstance.exclude(file))
  functionBrowserifyConfig.ignore.forEach(file => browserifyInstance.ignore(file))

  return new Bb((resolve, reject) => {
    let includeFiles = glob.sync(functionBrowserifyConfig.include, {
      cwd: this.serverless.config.servicePath,
      dot: true,
      silent: true,
      follow: true
    })

    if (process.env.SLS_DEBUG) {
      this.serverless.cli.log('Browserifier: Copying includes: ' + includeFiles)
    }

    includeFiles.forEach((includeFile) => {
      fs.copySync(this.serverless.config.servicePath + path.sep + includeFile, outputDir + path.sep + includeFile)
    })

    browserifyInstance.bundle((err, bundledBuf) => {
      if (err) {
        return reject(err)
      }
      const handlerPath = path.join(outputDir, functionObject.handler.split('.')[0] + '.js')
      fs.mkdirsSync(path.dirname(handlerPath), '0777')  // handler may be in a subdir
      fs.writeFile(handlerPath, bundledBuf, err => err ? reject(err) : resolve())
    })
  })
  .then(() => {
    if (process.env.SLS_DEBUG) {
      this.serverless.cli.log(`Browserifier: Zipping ${outputDir} to ${finalZipFilePath}`)
    }
    return zipDir(outputDir, finalZipFilePath)
  })
  .then((sizeBytes) => {
    const fileSizeInMegabytes = sizeBytes / 1000000.0
    this.serverless.cli.log(`Browserifier: Created ${functionName}.zip (${Math.round(fileSizeInMegabytes * 100) / 100} MB)...`)
    // This is how we tell Serverless to not do any bunding or zipping
    // @see https://serverless.com/framework/docs/providers/aws/guide/packaging/#artifact
    functionObject.package = functionObject.package || {}
    functionObject.package.artifact = finalZipFilePath
  })
  .then(() => { 
    fs.remove(outputDir) 
  })
}

function zipDir (dirPath, destZipFilePath) {
  return new Bb((resolve, reject) => {
    let output = fs.createWriteStream(destZipFilePath)
    let archive = archiver.create('zip')

    output.on('close', () => resolve(archive.pointer()))
    archive.on('error', (err) => reject(err))

    archive.pipe(output)
    archive.directory(dirPath, '')
    archive.finalize()
  })
}

module.exports = {
  bundle
}
