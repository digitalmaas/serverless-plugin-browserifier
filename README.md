Serverless Browserifier Plugin
==============================

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![NPM version](https://img.shields.io/npm/v/serverless-plugin-browserifier.svg)](https://www.npmjs.com/package/serverless-plugin-browserifier)
[![NPM downloads](https://img.shields.io/npm/dm/serverless-plugin-browserifier.svg)](https://www.npmjs.com/package/serverless-plugin-browserifier)

A [Serverless](https://serverless.com) v1.0 plugin that uses [Browserify](https://github.com/substack/node-browserify) to bundle your Node.js Lambda functions.

This project has been forked from the original [serverless-plugin-browserify](https://github.com/doapp-ryanp/serverless-plugin-browserify) by *Ryan Pendergast* and published under a different name.

## Motivation

Lambda's with smaller code start and run faster.  Lambda also has an account wide [deployment package size limit](http://docs.aws.amazon.com/lambda/latest/dg/limits.html).

With the example `package.json` and javascript code below, the default packaging for Node.js lambdas in Serverless produces a zip file that is **11.3 MB**, because it blindly includes all of `node_modules` in the zip package.

This plugin with 2 lines of configuration produces a zip file that is **400KB!**

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
Even if you choose to manually prepare your packages with `package[include|exclude]`, you will still have to take care of that for each single function individually. Also, when using npm 3, you will have a hard time making sure all dependencies are in place due to tree flattening.

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

For most use cases you should **NOT** need to do any configuration.  If you are a code ninja, read on.

The base config for browserify is read from the `custom.browserify` section of `serverless.yml`.  All [browserify options](https://github.com/substack/node-browserify#browserifyfiles--opts) are supported (most are auto configured by this plugin).  This plugin adds one special option `disable` which if `true` will bypass this plugin.

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

When this plugin is enabled, and `package.individually` is `true`, running `serverless deploy` and `serverless deploy -f <funcName>` will automatically browserify your node lambda code.

If you want to see output of bundled file or zip simply set `SLS_DEBUG`.  Example: 
```
$ export SLS_DEBUG=true
$ sls deploy function -v -f usersGet
```

### Bundle only

Run `sls browserify -f <functionName>`.  You can optionally dictate where the bundling output folder is by using the `-o` flag. Ex: `sls browserify -o /tmp/test -f pageUpdate`.

## FAQ

- **Should I use Webpack instead of this plugin?** I prefer Browserify over [webpack](https://webpack.github.io/) because I have found it supports more modules, optimizes better, and requires less configuration.
- **Why is UglifyJS not built-in?** No ES6 support.  [Issue](https://github.com/mishoo/UglifyJS2/issues/448) been open since 2014.

## License

Please refer to [LICENSE](./LICENSE) file.