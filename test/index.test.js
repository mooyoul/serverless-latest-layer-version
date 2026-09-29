'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { LambdaClient, ListLayerVersionsCommand } = require('@aws-sdk/client-lambda');
const Plugin = require('..');

const LATEST = 'arn:aws:lambda:eu-west-1:123456789012:layer:shared:latest';
const layerVersion = (version) => ({
  Version: version,
  LayerVersionArn: `arn:aws:lambda:eu-west-1:123456789012:layer:shared:${version}`,
});

const createServerless = (provider) => ({
  getProvider: () => provider,
  cli: { log: () => {} },
  service: {
    provider: {
      region: 'eu-west-1',
      compiledCloudFormationTemplate: {
        Resources: {
          HelloLambdaFunction: {
            Type: 'AWS::Lambda::Function',
            Properties: { Layers: [LATEST] },
          },
        },
      },
    },
    functions: {},
  },
});

const originalSend = LambdaClient.prototype.send;
afterEach(() => {
  LambdaClient.prototype.send = originalSend;
});

// osls 4 removed provider.request(); calling it throws AWS_SDK_V2_SURFACE_REMOVED.
test('resolves latest through an SDK v3 client on osls 4', async () => {
  const sent = [];
  LambdaClient.prototype.send = async function (command) {
    assert.ok(command instanceof ListLayerVersionsCommand);
    assert.equal(await this.config.region(), 'eu-west-1');
    sent.push(command.input);
    return command.input.Marker
      ? { LayerVersions: [layerVersion(2)] }
      : { LayerVersions: [layerVersion(3), layerVersion(1)], NextMarker: 'page-2' };
  };
  const serverless = createServerless({
    getAwsSdkV3Config: async () => ({ region: 'eu-west-1' }),
    request: () => {
      throw new Error('AWS_SDK_V2_SURFACE_REMOVED');
    },
  });

  await new Plugin(serverless, {}).updateCFNLayerVersion();

  assert.deepEqual(sent, [
    { LayerName: 'arn:aws:lambda:eu-west-1:123456789012:layer:shared', Marker: undefined },
    { LayerName: 'arn:aws:lambda:eu-west-1:123456789012:layer:shared', Marker: 'page-2' },
  ]);
  assert.deepEqual(
    serverless.service.provider.compiledCloudFormationTemplate.Resources.HelloLambdaFunction.Properties.Layers,
    ['arn:aws:lambda:eu-west-1:123456789012:layer:shared:3'],
  );
});

test('falls back to provider.request() on Serverless 3 / osls 3', async () => {
  const calls = [];
  const serverless = createServerless({
    request: async (...args) => {
      calls.push(args);
      return { LayerVersions: [layerVersion(1), layerVersion(4)] };
    },
  });

  await new Plugin(serverless, {}).updateCFNLayerVersion();

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), ['Lambda', 'listLayerVersions']);
  assert.deepEqual(
    serverless.service.provider.compiledCloudFormationTemplate.Resources.HelloLambdaFunction.Properties.Layers,
    ['arn:aws:lambda:eu-west-1:123456789012:layer:shared:4'],
  );
});
