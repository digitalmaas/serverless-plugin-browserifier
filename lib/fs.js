'use strict'

// fixes packaging issues

const fs = require('fs')
const fsx = require('fs-extra')

const graceful = require('graceful-fs')
graceful.gracefulify(fs)

module.exports = Object.assign(fsx, {
  getNewFileStream (file) {
    return graceful.createWriteStream(file)
  }
})
