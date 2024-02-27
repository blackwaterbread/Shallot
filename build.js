const fs = require('fs');
const { rimrafSync } = require('rimraf');
require('@vercel/ncc')(`${__dirname}/dist/prebuild/src/App.js`, {
    // provide a custom cache path or disable caching
    cache: "./custom/cache/path" | false,
    // externals to leave as requires of the build
    externals: ["externalpackage"],
    // directory outside of which never to emit assets
    filterAssetBase: process.cwd(), // default
    minify: false, // default
    sourceMap: false, // default
    assetBuilds: false, // default
    sourceMapBasePrefix: '../', // default treats sources as output-relative
    // when outputting a sourcemap, automatically include
    // source-map-support in the output file (increases output by 32kB).
    sourceMapRegister: true, // default
    watch: false, // default
    license: '', // default does not generate a license file
    target: 'es2015', // default
    v8cache: false, // default
    quiet: false, // default
    debugLog: false // default
}).then(({ code, map, assets }) => {
    fs.writeFileSync('./dist/shallot.js', code);
    rimrafSync('./dist/prebuild');
    // Assets is an object of asset file names to { source, permissions, symlinks }
    // expected relative to the output code (if any)
});