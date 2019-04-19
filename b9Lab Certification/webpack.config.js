const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  //entry: {
    //home: './app/javascripts/app.js',
    //tollboothoperator: './app/javascripts/tollboothoperator.js'
  //},
  entry: {
    //app: ['./app/javascripts/app.js', './app/javascripts/tollboothoperator.js']
    app : "./app/javascripts/app.js",
    tollboothoperator : "./app/javascripts/tollboothoperator.js",
    tollbooths : "./app/javascripts/tollbooths.js",
    vehicles : "./app/javascripts/vehicles.js"
  },
  //entry: './app/javascripts/app.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
  },
  plugins: [
    // Copy our app's index.html to the build folder.
    new CopyWebpackPlugin([
      { from: './app/index.html', to: "index.html" },
      { from: './app/tollboothOperator.html', to: "tollboothOperator.html" },
      { from: './app/tollbooths.html', to: "tollbooths.html"},
      { from: './app/vehicles.html', to: "vehicles.html"}
    ])
  ],
  module: {
    rules: [
      {
       test: /\.css$/,
       use: [ 'style-loader', 'css-loader' ]
      }
    ],
    loaders: [
      { test: /\.json$/, use: 'json-loader' },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
          plugins: ['transform-runtime']
        }
      }
    ]
  },
  devServer: {
    host: '0.0.0.0',
    port: 9000
  }
}
