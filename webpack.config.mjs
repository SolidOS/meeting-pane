import path from 'path'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import { getModuleRules } from './webpack.module.rules.mjs'
import { createRequire } from 'module'
import TerserPlugin from 'terser-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const require = createRequire(import.meta.url)

const common = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(process.cwd(), 'lib'),
    filename: 'meetingPane.js',
    library: {
      name: 'MeetingPane',
      type: 'umd'
    },
    globalObject: 'this',
    clean: false
  },
  plugins: [
    new NodePolyfillPlugin()
  ],
  module: {
    rules: getModuleRules(MiniCssExtractPlugin.loader),
  },
  externals: {
    'solid-ui': 'UI',
    'solid-logic': 'SolidLogic',
    rdflib: '$rdf',
  },
  resolve: {
    extensions: ['.js', '.ts'],
    fallback: {
      path: require.resolve('path-browserify')
    },
  },
  devtool: 'source-map',
}

const normalConfig = {
  ...common,
  mode: 'production',
  output: {
    path: path.resolve(process.cwd(), 'lib'),
    filename: 'meeting-pane.js',
    library: {
      type: 'umd',
      name: 'MeetingPane',
      export: 'default',
    },
    globalObject: 'this',
    clean: true,
  },
  plugins: [
    ...(common.plugins || []),
    new MiniCssExtractPlugin({
      filename: 'meeting-pane.css',
    }),
  ],
  optimization: {
    minimize: false,
  }
}

const minConfig = {
  ...common,
  mode: 'production',
  output: {
    path: path.resolve(process.cwd(), 'lib'),
    filename: 'meeting-pane.min.js',
    library: {
      type: 'umd',
      name: 'MeetingPane',
      export: 'default',
    },
    globalObject: 'this',
    clean: false,
  },
  plugins: [
    ...(common.plugins || []),
    new MiniCssExtractPlugin({
      filename: 'meeting-pane.css',
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      })
    ],
  }
}

export default [normalConfig, minConfig]
