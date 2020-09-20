## [2.1.1](https://github.com/mooyoul/serverless-latest-layer-version/compare/v2.1.0...v2.1.1) (2020-09-20)


### Bug Fixes

* use aws credential from serverless internal ([3a79fe0](https://github.com/mooyoul/serverless-latest-layer-version/commit/3a79fe033f44394bb0f58dd5ff2ed4991dcb76a4)), closes [#7](https://github.com/mooyoul/serverless-latest-layer-version/issues/7)

# [2.1.0](https://github.com/mooyoul/serverless-latest-layer-version/compare/v2.0.0...v2.1.0) (2019-12-31)


### Bug Fixes

* fix invalid case-insensitive layer resolution ([1310f6b](https://github.com/mooyoul/serverless-latest-layer-version/commit/1310f6bb0d06924d7233d62a53a26e3caf85c8b5)), closes [#5](https://github.com/mooyoul/serverless-latest-layer-version/issues/5)


### Features

* add invidual function deployment support ([2191273](https://github.com/mooyoul/serverless-latest-layer-version/commit/2191273f1fbe81df4d5009fb7bf0e28988157f91)), closes [#3](https://github.com/mooyoul/serverless-latest-layer-version/issues/3)

# [2.0.0](https://github.com/mooyoul/serverless-latest-layer-version/compare/v1.0.3...v2.0.0) (2019-12-16)


### Bug Fixes

* resolve pseudo parameters in layer arn ([abcc6f9](https://github.com/mooyoul/serverless-latest-layer-version/commit/abcc6f94390d7c7d92335a7c035bed47b69e9180)), closes [#2](https://github.com/mooyoul/serverless-latest-layer-version/issues/2) [#3](https://github.com/mooyoul/serverless-latest-layer-version/issues/3)


### BREAKING CHANGES

* these changes may break deployments

# 1.0.3

- Fixed a bug that cause plugin failure when there's no any `Resources` field exists on the `serverless.yml` (#1, Thanks to [@falaa](https://github.com/falaa))

# 1.0.2

- Initial release
