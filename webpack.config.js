import path from 'path'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'

export default [
  {
    mode: 'production',
    entry: './src/meetingPane.js',
    output: {
      path: path.resolve(process.cwd(), 'dist'),
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
      rules: [
        {
          test: /\.(js|ts)$/,
          exclude: /node_modules/,
          use: ['babel-loader'],
        },

        {
          test: /\.ttl$/, // Target text  files
          type: 'asset/source', // Load the file's content as a string
        },

      ],
    },
    externals: {
      'solid-ui': 'SolidUI',
      'solid-logic': 'SolidLogic',
      rdflib: '$rdf',
    },
    resolve: {
      extensions: ['*', '.js'],
    },
    devtool: false,
  }
]
