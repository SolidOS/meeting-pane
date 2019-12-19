
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
  mode: 'development',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'meetingPane.bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './index.html' })
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
    contentBase: './dist'
  },
  devtool: 'source-map'
}
