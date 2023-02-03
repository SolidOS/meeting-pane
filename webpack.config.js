
const HtmlWebpackPlugin = require('html-webpack-plugin')
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

module.exports = [{
  mode: 'development',
  entry: './dev/index.js',
  plugins: [
    new HtmlWebpackPlugin({ template: './dev/index.html' }),
    new NodePolyfillPlugin()
  ],
  externals: {
    fs: 'null',
    'node-fetch': 'fetch',
    'isomorphic-fetch': 'fetch',
    xmldom: 'window',
    'text-encoding': 'TextEncoder',
    'whatwg-url': 'window',
    '@trust/webcrypto': 'crypto'
  },
  devServer: {
    static: './dist'
  },
  devtool: 'source-map',
  resolve: {
    fallback: { "path": false }
  }
},
{
  mode: 'development',
  entry: './src/meetingPane.js',
  output: {
    filename: 'meetingPane.js'
  },
  externals: {
    fs: 'null',
    'node-fetch': 'fetch',
    'isomorphic-fetch': 'fetch',
    xmldom: 'window',
    'text-encoding': 'TextEncoder',
    'whatwg-url': 'window',
    '@trust/webcrypto': 'crypto'
  },
  devtool: 'source-map',
  resolve: {
    fallback: { "path": false }
  }
}]
