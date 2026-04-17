export const getModuleRules = function (styleLoader = 'style-loader') {
  return [
    {
      test: /\.(js|ts)$/,
      exclude: /node_modules/,
      use: ['babel-loader'],
    },
    {
      test: /\.css$/,
      exclude: /\.module\.css$/,
      use: [styleLoader, 'css-loader'],
    },
    {
      test: /\.module\.css$/,
      use: [
        styleLoader,
        {
          loader: 'css-loader',
          options: {
            modules: true
          }
        }
      ]
    },
    {
      test: /\.ttl$/,
      type: 'asset/source',
    }
  ]
}

export const moduleRules = getModuleRules()
