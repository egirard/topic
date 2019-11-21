const path = require('path');

const config = {
    entry: ['babel-polyfill', 'whatwg-fetch', './src/index.js'],
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
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
    }
  };

module.exports = [config];
