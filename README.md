# serverless-latest-layer-version

[![Build Status](https://github.com/mooyoul/serverless-latest-layer-version/workflows/workflow/badge.svg)](https://github.com/mooyoul/serverless-latest-layer-version/actions)
[![Semantic Release enabled](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com/)
[![MIT license](http://img.shields.io/badge/license-MIT-blue.svg)](http://mooyoul.mit-license.org/)

This is the Serverless plugin for AWS Lambda Layers which enables missing "latest" version tag

![demo](/screenshot.png)

## Why?

![limits](/limit.png)

Unlike invoking Lambda function. Lambda Layer does not support `$LATEST` version tag.


## Install

First, install package as development dependency.

```bash
$ npm i serverless-latest-layer-version --save-dev
```

Then, add the plugin to serverless.yml

```yaml
# serverless.yml

plugins:
  - serverless-latest-layer-version
```

## Setup

Just change layer version to `latest`. 
The plugin automatically replaces `latest` version tag to actual latest version number. 

For example, if Previously specified layer arn is `arn:aws:lambda:us-east-1:800406105498:layer:nsolid-node-10:6`.
replace that as `arn:aws:lambda:us-east-1:800406105498:layer:nsolid-node-10:latest`. That's it!

## Changelog

See [CHANGELOG](/CHANGELOG.md).

## License
[MIT](LICENSE)

See full license on [mooyoul.mit-license.org](http://mooyoul.mit-license.org/)
