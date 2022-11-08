'use strict';

/**
 * This Serverless plugin replaces 'latest' pseudo version tag to actual latest version
 */

const traverse = require('traverse');
const util = require('util');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.provider = serverless.getProvider("aws");
    this.options = options;
    this.resolvedLayers = new Set();

    this.hooks = {
      'after:aws:package:finalize:mergeCustomProviderResources': this.updateCFNLayerVersion.bind(this),
      'before:deploy:function:deploy': this.updateSLSLayerVersion.bind(this),
    };
  }

  updateSLSLayerVersion() {
    // Find All Lambda Layer associations from compiled serverless configuration
    return this.update(this.listSLSLayerAssociations());
  }

  updateCFNLayerVersion() {
    // Find All Lambda Layer associations from compiled CFN template
    return this.update(this.listCFNLayerAssociations());
  }

  async update(layerAssociations) {
    // Collect target Layer ARNs
    const collectedLayerARNs = this.collectLayerARNs(layerAssociations);

    // Resolve actual Layer ARNs
    const resolvedLayerARNs = await this.fetchLatestVersions(collectedLayerARNs);

    // Recursively replace layer ARNs
    this.replaceLayerVersions(layerAssociations, resolvedLayerARNs);
  }

  listCFNLayerAssociations() {
    // Lookup compiled CFN template to support individual deployments
    const compiledTemplate = this.serverless.service.provider.compiledCloudFormationTemplate;

    const resources = compiledTemplate.Resources;

    return Object.keys(resources).reduce((collection, key) => {
      const resource = resources[key];

      if (resource.Type === 'AWS::Lambda::Function') {
        const layers = resource.Properties && resource.Properties.Layers;

        if (Array.isArray(layers) && layers.length > 0) {
          collection.push({ name: key, layers });
        }
      }

      return collection;
    }, []);
  }

  listSLSLayerAssociations() {
    const { functions } = this.serverless.service;

    return Object.keys(functions).reduce((collection, name) => {
      const fn = functions[name];
      const layers = fn.layers;

      if (Array.isArray(layers) && layers.length > 0) {
        collection.push({ name, layers });
      }

      return collection;
    }, []);
  }

  async lookupLatestLayerVersionArn(layerArn) {
    const layer = this.extractLayerArn(layerArn);

    if (!layer) {
      return null;
    }

    const versions = [];

    let marker;
    do {
      const result = await this.provider.request("Lambda", "listLayerVersions", {
        LayerName: layer.layerName,
        Marker: marker,
      });

      versions.push(...result.LayerVersions);
      marker = result.NextMarker;
    } while (marker);

    const sortedVersions = versions.sort((a, b) => {
      if (a.Version > b.Version) {
        return -1;
      } else if (a.Version < b.Version) {
        return 1
      } else {
        return 0;
      }
    });

    return sortedVersions.length > 0 ?
      sortedVersions[0].LayerVersionArn :
      null;
  }

  extractLayerArn(arn) {
    const SEPARATOR = "__SEPARATOR__";

    // arn:aws:lambda:REGION:ACCOUNT_ID:layer:LAYER_NAME:LAYER_VERSION
    const tokens = arn.replace(/([^:]):([^:])/g, (match, prev, next) => `${prev}${SEPARATOR}${next}`).split(SEPARATOR);

    if (tokens.length !== 8) {
      return null;
    }

    let region = tokens[3];
    if (/AWS::Region/i.test(region)) {
      region = this.serverless.service.provider.region;
    }

    const accountId = tokens[4];
    const layerName = tokens[6];

    return {
      region,
      layerName: /AWS::AccountId/i.test(accountId) ?
        layerName :
        `arn:aws:lambda:${region}:${accountId}:layer:${layerName}`,
    };
  }

  collectLayerARNs(layerAssociations) {
    const set = new Set();

    for (const layerAssociation of layerAssociations) {
      traverse(layerAssociation.layers).forEach(function (node) {
        const matched = this.isLeaf
          && typeof node === "string"
          && /^arn:/i.test(node)
          && /latest$/i.test(node);

        if (matched) {
          set.add(node);
        }
      });
    }

    return set;
  }

  async fetchLatestVersions(layerARNs) {
    const dict = new Map();

    for (const layerARN of layerARNs) {
      const version = await this.lookupLatestLayerVersionArn(layerARN);
      dict.set(layerARN, version);
    }

    return dict;
  }

  replaceLayerVersions(layerAssociations, arnVersionMap) {
    const self = this;

    for (const layerAssociation of layerAssociations) {
      traverse(layerAssociation.layers).forEach(function (node) {
        const matched = this.isLeaf
          && typeof node === "string"
          && /^arn:/i.test(node)
          && /latest$/i.test(node);

        if (matched) {
          const resolvedLayerArn = arnVersionMap.get(node);
          if (resolvedLayerArn) {
            this.update(resolvedLayerArn);
            // Avoid logging the same resolved layer multiple times
            if (self.resolvedLayers.has(resolvedLayerArn)) {
              return;
            }
            self.resolvedLayers.add(resolvedLayerArn);
            self.log("Resolved %s to %s", node, resolvedLayerArn);
          } else {
            self.log("Detected unknown Layer ARN %s. Please create a new issue to github.com/mooyoul/serverless-latest-layer-version", node);
          }
        }
      });
    }
  }

  log(...args) {
    const TAG = '[serverless-latest-layer-version]';

    if (typeof args[0] === 'string') {
      args[0] = `${TAG} ${args[0]}`;
    } else {
      args.unshift(TAG);
    }

    this.serverless.cli.log(util.format(...args));
  }
}

module.exports = ServerlessPlugin;
