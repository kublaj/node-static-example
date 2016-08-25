/**
 * @description webpack config for test
 * @author acrazing
 * @since 
 * @version 1.0.0
 */

const webpack = require('webpack')
module.exports = {
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ],
  resolve: {
    modulesDirectories: ['node_modules'],
    extensions: ['', '.ts', '.tsx', '.js', '.jsx', '.node'],
  },
  module: {
    loaders: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader?configFileName=tsconfig.json',
      },
    ],
  },
}
