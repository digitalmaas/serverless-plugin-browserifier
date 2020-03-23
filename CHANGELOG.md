# [2.3.0-rc.1](https://github.com/digitalmaas/serverless-plugin-browserifier/compare/v2.2.1-rc.1...v2.3.0-rc.1) (2020-03-23)


### Bug Fixes

* fix packaging issue involving `graceful-fs` ([2099e52](https://github.com/digitalmaas/serverless-plugin-browserifier/commit/2099e52412942faf8282cd55e1c0d36bcc0f06ad))
* improve bundling code, use output stream `open` event ([b19ec43](https://github.com/digitalmaas/serverless-plugin-browserifier/commit/b19ec43651425e68219678e4a598cc5d2b1b1da9))


### Features

* add SLS_BROWSERIFIER_DEBUG flag ([1dac77e](https://github.com/digitalmaas/serverless-plugin-browserifier/commit/1dac77e52dbd7defd6b9bce20e79791ef5eb1f58))

## [2.2.1-rc.1](https://github.com/digitalmaas/serverless-plugin-browserifier/compare/v2.2.0...v2.2.1-rc.1) (2020-02-10)


### Bug Fixes

* update dependencies, trying to fix weird issues with sls 1.62.x ([55f04aa](https://github.com/digitalmaas/serverless-plugin-browserifier/commit/55f04aa65cf5ca2713067cde0bd07497f87dfba2))

Changelog

# [2.2.0](https://github.com/digitalmaas/serverless-plugin-browserifier/compare/v2.1.0...v2.2.0) (2020-02-06)


### Bug Fixes

* fix `disable` flags, add proper documentation (fixes [#12](https://github.com/digitalmaas/serverless-plugin-browserifier/issues/12)) ([b4c7206](https://github.com/digitalmaas/serverless-plugin-browserifier/commit/b4c7206dc43b7b804f6c12c069e1620789590e62))


### Features

* add granular packaging and disabling control ([d424af6](https://github.com/digitalmaas/serverless-plugin-browserifier/commit/d424af6119eadfa7839e8bd76b060273ed95810b))

## v2.1.0
- Properly support `browserify` versions 16.1.0 and up by using the new `node` option. More info [here](https://github.com/browserify/browserify/pull/1804).
- Display `browserify` version in use by the plugin.
- Add _external_ `browserify` config.
- Make more dependencies version flexible.
- Major README update.

# 2.0.0
- Make `browserify` a peer dependency.

## v1.0.5
- Improve `serverless` v1.18 support.

## v1.0.4
- Improper npm release, same as v1.0.3.

## v1.0.3
- Use `filesize` to report file size, just as serverless does.
