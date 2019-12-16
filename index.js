'use strict';

/**
 * This Serverless plugin replaces 'latest' pseudo version tag to actual latest version
 */

const { Lambda } = require('aws-sdk');
const traverse = require('traverse');
const util = require('util');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {
      'after:aws:package:finalize:mergeCustomProviderResources': this.updateLayerVersion.bind(this),
    };
  }

  async updateLayerVersion() {
    const self = this;

    // Find All Lambda Layer associations from compiled CFN template
    const layerAssociations = this.listLayerAssociations();

    // Collect target Layer ARNs
    const collectedLayerARNs = (() => {
      const set = new Set();

      for (const layerAssociation of layerAssociations) {
        traverse(layerAssociation.layers).forEach(function (node) {
          const matched = this.isLeaf
            && typeof node === "string"
            && /^arn:/i.test(node)
            && /latest$/i.test(node);

          if (matched) {
            set.add(node.toLowerCase());
          }
        });
      }

      return set;
    })();

    // Resolve actual Layer ARNs
    const resolvedLayerARNs = await (async () => {
      const dict = new Map();

      for (const collectedLayerArn of collectedLayerARNs) {
        const version = await this.lookupLatestLayerVersionArn(collectedLayerArn);
        dict.set(collectedLayerArn, version);
      }

      return dict;
    })();

    // Recursively replace layer ARNs
    for (const layerAssociation of layerAssociations) {
      traverse(layerAssociation.layers).forEach(function (node) {
        const matched = this.isLeaf
          && typeof node === "string"
          && /^arn:/i.test(node)
          && /latest$/i.test(node);

        if (matched) {
          const resolvedLayerArn = resolvedLayerARNs.get(node.toLowerCase());
          if (resolvedLayerArn) {
            this.update(resolvedLayerArn);
            self.log("Resolved %s to %s", node, resolvedLayerArn);
          } else {
            self.log("Detected unknown Layer ARN %s. Please create a new issue to github.com/mooyoul/serverless-latest-layer-version", node);
          }
        }
      });
    }
  }

  listLayerAssociations() {
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

  async lookupLatestLayerVersionArn(layerArn) {
    const layer = this.extractLayerArn(layerArn);

    if (!layer) {
      return null;
    }

    const lambda = new Lambda({ region: layer.region });

    const versions = [];

    let marker;
    do {
      const result = await lambda.listLayerVersions({
        LayerName: layer.layerName,
        Marker: marker,
      }).promise();

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
