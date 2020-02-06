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
