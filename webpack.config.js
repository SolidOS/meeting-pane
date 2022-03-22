
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = [{
  mode: 'development',
  entry: './dev/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'meeting.bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './dev/index.html' })
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
  devtool: 'source-map'
},
{
  mode: 'development',
  entry: './src/meetingPane.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
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
  devtool: 'source-map'
}]
