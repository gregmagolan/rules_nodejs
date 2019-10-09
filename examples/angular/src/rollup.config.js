const node = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const amd = require('rollup-plugin-amd');
const replace = require('rollup-plugin-re');

module.exports = {
  plugins: [
    replace({
      patterns: [{
        match: /\.ngfactory\.mjs/,
        test: 'examples_angular/external/npm/node_modules/',
        replace: '',
      }]
    }),
    node({
      mainFields: ['browser', 'es2015', 'module', 'jsnext:main', 'main'],
    }),
    amd({
      // Work-around for Angular ngfactory issue https://github.com/angular/angular/issues/29491.
      // Filter to only convert ngfactory files since any UMD files that may be bundled will break
      // with the amd plugin.
      include: /\.ngfactory\.js$/i,
    }),
    commonjs(),
  ],
};
