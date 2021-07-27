Serverless Browserifier Plugin
==============================

[![serverless][serverless-badge]][serverless-url]
[![NPM version][version-badge]][npm-url]
[![digitalmaas][dmaas-badge]][dmaas-url]
[![NPM downloads][downloads-badge]][npm-url]
[![standardjs][standardjs-badge]][standardjs-url]

> A [Serverless](https://serverless.com) v1 and v2 plugin that uses [`browserify`][browserify-url] to bundle your Node.js Lambda functions.

1. [Supported Commands](#supported-commands)
1. [Motivation](#motivation)
1. [Installation](#installation)
1. [Basic Setup](#basic-setup)
1. [Advanced Configuration](#advanced-configuration)
1. [FAQ](#faq)
1. [Useful Information](#useful-information)
1. [License](#license)


Supported Commands
------------------

- `serverless package`
- `serverless deploy`
- `serverless deploy function`
- `serverless invoke local`
    + the plugin will automatically build and use your bundle to execute the function locally; to avoid it, you can use the `--no-build` option, which will then use your handler file directly


Motivation
----------

Smaller Lambda functions that run faster, with minimal changes to normal serverless configuration.

### Smaller and faster

A project usualy contains several dependencies that are required by different functions in miscellaneous combinations, and packaging it all up for every function generates very large and inefficient bundles. This plugin leverages [`browserify`'s][browserify-url] ability of bundling up all files requested using `require`, generating a single lean file with all that is needed for each specific function.

Normal serverless packaging includes all files within the `node_modules` structures, including several files that are not really needed during runtime, like _package.json_ files, documentation files, and much more. And although recent versions of serverless automatically ignore _devDependencies_, you'll certainly still have more dependencies than needed for each single function.

Serverless does support manual preparation of packages, but you will still have to take care of that for each single function individually, which can quickly get out of hand dependending on the number of dependencies you need. This is specially hard after `npm` v3, due to dependency tree flattening.

The reduction is package size is, on average, __superior to 90%__. This is important as AWS Lambda has an account-wide [deployment package size limit][lambda-size-limit], and reduces file transfer times.

Less code to parse also means quicker Lambda [_cold start_][container-reuse].

### Minimal changes

When using this plugin, one of the goals is to reduce serverless configuration changes as much as possible. It must possible to just remove it and resume normal usage of serverless, without any additional modifications.

No preset uglification, minification, nor transpilation; just plain bundling. You can add any other transformations you want by using common browserify plugins.


Installation
------------

From your target serverless project, run:
```
npm install serverless-plugin-browserifier --save-dev
```

Basic Setup
-----------

Add the plugin to your `serverless.yml`:

```yaml
plugins:
  - serverless-plugin-browserifier
package:
  individually: true
```

The `package.individually` setting must be set -- either on global or function level -- to allow minimal bundle size based on each lambda's entrypoint.

You're all set! Use your normal serverless commands to package and deploy.


Advanced Configuration
----------------------

For most use cases you should **NOT** need to do any extra configuration. That said, the ability is present if you need it.

The base config for browserify is read from the `custom.browserify` section of `serverless.yml`.  All [browserify options][browserify-options] are supported (most are auto configured by this plugin).  This plugin adds one special option `disable` which if `true` will bypass this plugin.

The base config can be overridden on a function-by-function basis.  Again, `custom.browserify` is not required and should not even need to be defined in most cases.

```yaml
custom:
  browserify:
    # any option defined in https://github.com/substack/node-browserify#browserifyfiles--opts
    extensions:
      - .js # default

functions:
  usersGet:
    description: Get users
    handler: users/index.handler
    browserify:
      # any option defined in https://github.com/substack/node-browserify#browserifyfiles--opts
      noParse:
        - ./someBig.json  # browserify can't optimize json, will take long time to parse for nothing
```

If you find a package that is not supported or does not behave well with browserify, you can still use function level `package.include` to include extra modules and files to your package. That said, you are encouraged to verify if you specific case can be dealt with by leveraging all available [browserify options][browserify-options] in your `serverless.yml` custom `browserify` section.

You can still use serveless' `package[include|exclude]` options to include extra files within your bundles, if necessary.

### Disabling

You can disable the plugin completely by setting the global or function level `disable` flag:

```yaml
custom:
  browserify:
    disable: true

# ... or ...

functions:
  usersGet:
    handler: users/index.handler
    browserify:
      disable: true
```


### Debugging

When this plugin is enabled, and `package.individually` is `true`, running `serverless deploy` and `serverless deploy -f <funcName>` will automatically browserify your Node.js lambda code.

If you want to see more information about the process, simply set envvar `SLS_DEBUG=*` for full serverless debug output, or `SLS_BROWSERIFIER_DEBUG=*` for plugin only debug messages. Example:

```
$ export SLS_BROWSERIFIER_DEBUG=*
$ sls deploy function -v -f usersGet
```

You may also verify your bundles by simply using `sls package`, which bundles everything up but does not deploy.


### Using browserify plugins/transforms

If you want to use browserify plugins, you can easily do that by using the global browserify options. As the plugin merely passes that up to browserify, as if it is calling the main [`browserify`][browserify-options] function, you can use it to add any transformations you want.

Do you want to transpile using TypeScript? No problem! You can use [`tsify`](https://www.npmjs.com/package/tsify):

```yml
# if you have no transform package options
custom:
  browserify:
    transform:
      - tsify                    # single dash!

# if you have extra transform package options
custom:
  browserify:
    transform:
      - - tsify                  # array of array, two dashes!
        - noImplicitAny: true

# multiple mixed transforms
custom:
  browserify:
    transform:
      - jstify
      - - tsify
        - noImplicitAny: true
```

For an in-depth example, please check [this issue](https://github.com/digitalmaas/serverless-plugin-browserifier/issues/8).


### Best practices

#### If using it with AWS, use discrete SDK clients!

The official [aws-sdk-js][aws-sdk] officially [supports browserify][aws-sdk-support]. That allows us to further reduce the size of our bundles (and Lambda memory usage and speed) by loading only what is strictly needed.

```javascript
// instead of ...
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
// ... you should use ...
const S3 = require('aws-sdk/clients/s3')
const s3 = new S3()
```

#### Ignore AWS SDK v2!

Although you can use discrete clients (see item above), AWS Lambda service always bundles up the latest SDK version in its Lambda container image. That means that, even if you don't add AWS SDK to your bundle, it will still be available in runtime.

Therefore, if you don't need any specific AWS SDK version, you can add the following to your plugin config:

```yml
custom:
  browserify:
    exclude:
      - aws-sdk
      - aws-sdk/clients/s3
```

To help you out, here's a script you can use to hide `aws-sdk` and all its clients from browserify. You can use it in your custom config for the plugin in _serverless.yml_:

```yml
# serverless.yml

custom:
  browserify: ${file(./custom.browserify.js)}
```

```js
// custom.browserify.js
//
const fs = require('fs')
const path = require('path')

module.exports = function browserifyOptions () {
  return {
    // any other valid browserify configuration...
    noParse: ['/**/*.json'],
    exclude: ['aws-sdk', ...getAllAwsSdkClients()]
  }
}

function getAllAwsSdkClients () {
  return fs
    .readdirSync('./node_modules/aws-sdk/clients', { withFileTypes: true })
    .filter(file => file.isFile() && path.extname(file.name) === '.js')
    .map(file => `aws-sdk/clients/${path.basename(file.name, '.js')}`)
}
```

FAQ
---

__Should I use Webpack instead of this plugin?__

Browserify, in general, supports more modules, optimises better (generates smaller bundles), and requires less configuration. [Webpack][webpack-github] is an amazing tool, but it comes with several extras that are not really needed within a pure Node.js environment.

__What about uglification? And babel?__

You should be able to use [`uglify-es`][uglify-url] through [`uglifyify`][uglifyify-url]. For babel usage, [`babelify`][babelify-url] should do the trick. Refer back to [_Using browserify plugins_](#using-browserify-pluginstransforms) section to set it up.

__This other plugin I use is not playing ball with `serverless-plugin-browserifier`! What's up?__

This plugin _hijacks_ the normal serverless packaging process, so it will probably conflict with other plugins that use similar mechanisms. Please avoid mixing this plugin with other plugins that modify serverless' packaging behaviour.


Useful Information
------------------

- [List of browserify's transforms][useful-transforms-list]
- [A curated list of awesome Browserify resources, libraries, and tools.][useful-browserify-resources]


License
-------

MIT License.

This project has been forked from the original [serverless-plugin-browserify][original-plugin] and published under a different name, as the original has been abandoned.

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
[aws-sdk]: https://github.com/aws/aws-sdk-js
[aws-sdk-support]: https://github.com/aws/aws-sdk-js/issues/696
[container-reuse]: https://aws.amazon.com/blogs/compute/container-reuse-in-lambda/
[lambda-size-limit]: http://docs.aws.amazon.com/lambda/latest/dg/limits.html
[useful-transforms-list]: https://github.com/browserify/browserify/wiki/list-of-transforms
[useful-browserify-resources]: https://github.com/browserify/awesome-browserify
