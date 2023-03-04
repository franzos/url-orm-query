const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');

const shared = {
    entryPoints: ['./src/index.ts'],
    bundle: true,
    treeShaking: true,
    platform: 'node',
    target: 'node14',
    plugins: [nodeExternalsPlugin()],
}

esbuild.build({
    ...shared,
    outfile: 'dist/index.cjs.js',
    format: 'cjs',
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

esbuild.build({
    ...shared,
    outfile: 'dist/index.mjs.js',
    format: 'esm',
}).catch((err) => {
    console.error(err);
    process.exit(1);
});