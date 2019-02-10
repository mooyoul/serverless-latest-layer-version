'use strict';

/**
 * This Serverless plugin replaces 'latest' pseudo version tag to actual latest version
 */

const { Lambda } = require('aws-sdk');
const util = require('util');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);
    this.cache = new Map();

    const { service } = this.serverless;

    if (service.provider.name === 'aws') {
      this.hooks = {
        'before:package:setupProviderConfiguration': this.beforeSetupProviderConfiguration.bind(this),
      };
    } else {
      this.log('Detected non-aws environment. skipping...');
    }
  }

  async beforeSetupProviderConfiguration() {
    const { service } = this.serverless;


    for (const functionName of Object.keys(service.functions)) {
      const functionDef = service.functions[functionName];
      const functionDefLayers = functionDef.layers;
      if (Array.isArray(functionDefLayers)) {
        await this.processLayerARNList(functionDefLayers);
      }

      const logicalId = this.provider.naming.getLambdaLogicalId(functionName);
      const resourceDef = service.resources.Resources[logicalId];
      const resourceDefLayers = resourceDef && resourceDef.Properties && resourceDef.Properties.Layers;

      if (Array.isArray(resourceDefLayers)) {
        await this.processLayerARNList(resourceDefLayers);
      }
    }
  }

  async processLayerARNList(layerARNList) {
    for (let i = 0 ; i < layerARNList.length ; i++) {
      const arn = layerARNList[i];

      // arn:aws:lambda:REGION:ACCOUNT_ID:layer:LAYER_NAME:LAYER_VERSION
      const arnParts = arn.split(':');
      const layerRegion = arnParts[3];
      const layerVersion = arnParts[7];

      if (layerVersion.toLowerCase() === 'latest' || layerVersion.toLowerCase() === '$latest') {
        const latestVersionARN = await (async () => {
          const layerNameArn = arnParts.slice(0, -1).join(":");
          if (this.cache.has(layerNameArn)) {
            return this.cache.get(layerNameArn);
          }

          const latestVersion = await this.getLatestLayerVersion(layerRegion, layerNameArn);
          const latestArn = [
            ...arnParts.slice(0, -1),
            latestVersion,
          ].join(':');
          this.cache.set(layerNameArn, latestArn);

          return latestArn;
        })();

        layerARNList[i] = latestVersionARN;
        this.log('Replaced %s to %s', arn, latestVersionARN);
      }
    }
  }

  async getLatestLayerVersion(layerRegion, layerName) {
    const lambda = new Lambda({ region: layerRegion });

    const versions = [];

    let marker;
    do {
      const result = await lambda.listLayerVersions({
        LayerName: layerName,
        Marker: marker,
      }).promise();

      versions.push(...result.LayerVersions.map((v) => v.Version));
      marker = result.NextMarker;
    } while (marker);

    return Math.max(...versions);
  }

  log(...args) {
    let formatArgs;

    if (typeof args[0] === 'string') {
      formatArgs = [
        `serverless-latest-layer-version ${args[0]}`,
        ...args.slice(1),
      ];
    } else {
      formatArgs = [
        'serverless-latest-layer-version',
        ...args,
      ];
    }

    this.serverless.cli.log(util.format(...formatArgs));
  }
}

module.exports = ServerlessPlugin;
