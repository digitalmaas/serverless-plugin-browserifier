'use strict'

const Bb = require('bluebird')
const browserify = require('browserify')
const globby = require('globby')
const path = require('path')

const fs = Bb.promisifyAll(require('fs-extra'))

function bundle (functionName) {
  const outputDir = this.options.out || path.join(this.servicePath, functionName)
  const functionBrowserifyConfig = this.getFunctionConfig(functionName)
  const finalZipFilePath = path.join(outputDir, '..', `${functionName}.zip`)

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
    let includeFiles = globby.sync(functionBrowserifyConfig.include, {
      cwd: this.serverless.config.servicePath,
      dot: true,
      silent: true,
      follow: true
    })

    if (process.env.SLS_DEBUG) {
      this.serverless.cli.log('Browserifier: Copying includes: ' + includeFiles)
    }

    includeFiles.forEach((includeFile) => {
      fs.copySync(path.join(this.serverless.config.servicePath, includeFile), path.join(outputDir, includeFile))
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
    // This is how we tell Serverless to not do any bunding or zipping
    // @see https://serverless.com/framework/docs/providers/aws/guide/packaging/#artifact
    functionObject.package = {
      individually: true,
      exclude: [ '**/*' ],
      include: [outputDir + '/**/*']
    }
  })
}

function clean (functionName) {
  const outputDir = this.options.out || path.join(this.servicePath, functionName)
  fs.remove(outputDir)
}

module.exports = {
  bundle,
  clean
}
