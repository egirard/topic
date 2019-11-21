const path = require('path');

function getCommonConfig() {
  return {
    entry: ['babel-polyfill', 'whatwg-fetch'],
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          }
        }
      ]
    },
  };
}

function createTarget(entries, outputPath, outputFile) {
  let config = getCommonConfig();
  for (var i = 0; i < entries.length; i++)
    config.entry.push(entries[i]);
  config.output = {
    path: path.resolve(__dirname, outputPath),
    filename: outputFile
  }
  return config;
}

const topicConfig = createTarget(['./src/index.js'], 'dist', 'main.min.js');

module.exports = [topicConfig];
