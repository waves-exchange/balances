const path = require('path');

const config = {
    entry: './src/index.ts',
    target: 'web',
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'indexW.js',
        path: path.resolve(__dirname, 'dist'),
    },
};

const nodeConfig = {
    ...config,
    target: 'node',
    output: {
        filename: 'indexN.js',
        path: path.resolve(__dirname, 'dist'),
    },
    node: {
        global: false,
        __filename: false,
        __dirname: false,
    },
};


module.exports = [config, nodeConfig]
