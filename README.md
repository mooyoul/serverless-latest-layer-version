# serverless-latest-layer-version

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

#### 1.0.3

- Fixed a bug that cause plugin failure when there's no any `Resources` field exists on the `serverless.yml` (#1, Thanks to [@falaa](https://github.com/falaa))

#### 1.0.2

- Initial release


## License
[MIT](LICENSE)

See full license on [mooyoul.mit-license.org](http://mooyoul.mit-license.org/)
