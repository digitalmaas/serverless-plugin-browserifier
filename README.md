Serverless Browserifier Plugin
==============================

[![serverless][serverless-badge]][serverless-url]
[![NPM version][version-badge]][npm-url]
[![digitalmaas][dmaas-badge]][dmaas-url]
[![NPM downloads][downloads-badge]][npm-url]
[![standardjs][standardjs-badge]][standardjs-url]

A [Serverless](https://serverless.com) v1 plugin that uses [Browserify][browserify-url] to bundle your Node.js Lambda functions.

This project has been forked from the original [serverless-plugin-browserify][original-plugin] by *Ryan Pendergast* and published under a different name.

## Motivation

Lambda functions with smaller code start and run faster.

With the example `package.json` and javascript code below, the default packaging for Node.js lambdas in Serverless produces a zip file that is **11.3 MB**, because it blindly includes all of `node_modules` in the zip package.

This plugin with 2 lines of configuration produces a zip file that is **400 KB!**

```json
...
  "dependencies": {
    "aws-sdk": "^2.6.12",
    "moment": "^2.15.2",
    "request": "^2.75.0",
    "rxjs": "^5.0.0-rc.1"
  },
...
```  

```javascript
const Rx      = require('rxjs/Rx');
const request = require('request');
...
```
Even if you choose to manually prepare your packages with `package[include|exclude]`, you will still have to take care of that for each single function individually, and manually. This is specially hard after `npm` 3, due to dependency tree flattening.

Also, AWS Lambda has an account-wide [deployment package size limit](http://docs.aws.amazon.com/lambda/latest/dg/limits.html).

Mind that [aws-sdk-js](https://github.com/aws/aws-sdk-js) now officially [supports browserify](https://github.com/aws/aws-sdk-js/issues/696). Read more about this in [on this article](https://rynop.wordpress.com/2016/11/01/aws-sdk-for-javascript-now-fully-componentized/).

## Installation

From your target serverless project, run:
```
npm install serverless-plugin-browserifier --save-dev
```

Add the plugin to your `serverless.yml` file and set `package.individually` to `true`:

```yaml
plugins:
  - serverless-plugin-browserifier
package:
  individually: true
```

The property `package.individually` must be set because it makes configuration more straightforward, and if you are not packaging individually size is not a concern of yours in the first place.

## Configuration

For most use cases you should **NOT** need to do any configuration. You can, however, introduce custom configuration.

The base config for browserify is read from the `custom.browserify` section of `serverless.yml`.  All [browserify options][browserify-options] are supported (most are auto configured by this plugin).  This plugin adds one special option `disable` which if `true` will bypass this plugin.

The base config can be overridden on a function-by-function basis.  Again, `custom.browserify` is not required and should not even need to be defined in most cases.

```yaml
custom:
  browserify:
    #any option defined in https://github.com/substack/node-browserify#browserifyfiles--opts

functions:
    usersGet:
      name: ${self:provider.stage}-${self:service}-pageGet
      description: get user
      handler: users/handler.hello      
      browserify:
        noParse:
          - ./someBig.json  #browserify can't optimize json, will take long time to parse for nothing      
```

If you find a package that is not supported or does not behave well with browserify, you can still use function level `package.include` to include extra modules and files to your package. That said, you are encouraged to verify if you specific case can be dealt with by leveraging all available [browserify options](https://github.com/substack/node-browserify#browserifyfiles--opts) in your `serverless.yml` custom `browserify` section. 

## Usage

When this plugin is enabled, and `package.individually` is `true`, running `serverless deploy` and `serverless deploy -f <funcName>` will automatically browserify your Node.js lambda code.

If you want to see more information about the process, simply set `SLS_DEBUG=*`. Example: 
```
$ export SLS_DEBUG=*
$ sls deploy function -v -f usersGet
```

## FAQ

__Should I use Webpack instead of this plugin?__

Browserify, in general, supports more modules, optimises better (generates smaller bundles), and requires less configuration. [Webpack][webpack-github] is an amazing tool, but it comes with several extras that are not really needed within a pure Node.js environment.

__What about uglification?__

You should be able to use [`uglify-es`][uglify-url] through [`uglifyify`][uglifyify-url].

__And what about babel?__

I believe that [`babelify`][babelify-url] should do the trick, although I don't see any reason for it. AWS Lambda already supports Node.js 6.10, with enough ES-next goodies that allows us to avoid transpilers.

## License

MIT License.    
For the complete information, please refer to the [license](./LICENSE) file.

[serverless-badge]: https://img.shields.io/badge/serverless-%E2%9A%A1-yellow.svg?colorB=555555&style=flat-square
[version-badge]: https://img.shields.io/npm/v/serverless-plugin-browserifier.svg?style=flat-square
[downloads-badge]: https://img.shields.io/npm/dm/serverless-plugin-browserifier.svg?style=flat-square
[standardjs-badge]: https://img.shields.io/badge/code_style-standard-brightgreen.svg?style=flat-square
[dmaas-badge]: https://img.shields.io/badge/sponsored%20by-digitalmaas-green.svg?colorB=00CD98&style=flat-square
[serverless-url]: http://www.serverless.com
[npm-url]: https://www.npmjs.com/package/serverless-plugin-browserifier
[dmaas-url]: https://digitalmaas.com/
[standardjs-url]: https://standardjs.com/
[browserify-url]: http://browserify.org/
[browserify-options]: https://github.com/substack/node-browserify#browserifyfiles--opts
[webpack-github]: https://webpack.github.io/
[original-plugin]: https://github.com/doapp-ryanp/serverless-plugin-browserify
[uglify-url]: https://www.npmjs.com/package/uglify-es
[uglifyify-url]: https://www.npmjs.com/package/uglifyify
[babelify-url]: https://www.npmjs.com/package/babelify
