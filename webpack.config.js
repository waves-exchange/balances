const path = require('path');

const config = {
    entry: './src/index.ts',
    node: {
        global: false,
        __filename: false,
        __dirname: false,
    },
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
        filename: 'index.js',
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
};


module.exports = [config, nodeConfig]
