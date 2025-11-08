const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './src/client/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
      ,{
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      }
    ]
  },
  plugins: [
    new Dotenv()
  ],
  devServer: {
    static: path.join(__dirname, 'public'),
    compress: true,
    port: 3001
    ,proxy: [
      {
        context: ['/auth'],
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        logLevel: 'warn'
      }
    ]
  },
  mode: 'development'
};