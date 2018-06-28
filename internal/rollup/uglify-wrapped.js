/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// A wrapper around uglify-js that handle minifies directories as inputs
// and outputs

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const resolveRunfiles = require('../common/runfiles');

const DEBUG = false;

// capture the inputs and output options
const argv = require('minimist')(process.argv.slice(2));
const inputs = argv._;
const output = argv.output || argv.o;
const debug = argv.debug;
const configFile = argv['config-file'];
delete argv._;
delete argv.output;
delete argv.o;
delete argv.debug;
delete argv['config-file'];

const isWindows = /^win/i.test(process.platform);

if (DEBUG)
  console.error(`
Uglify: running with
  cwd: ${process.cwd()}
  argv: ${process.argv.slice(2).join(' ')}
  inputs: ${JSON.stringify(inputs)}
  output: ${output}
  debug: ${debug}
`);

if (inputs.length != 1) {
  throw new Error(`Only one input file supported: ${inputs}`);
}

const input = inputs[0];

function runUglify(inputFile, outputFile, sourceMapFile) {
  if (DEBUG) console.error(`Minifying ${inputFile} -> ${outputFile} (sourceMap ${sourceMapFile})`);

  const uglifyConfig = {
    'sourceMap': {'filename': sourceMapFile},
    'compress': {
      'pure_getters': true,
      'passes': 3,
      'global_defs': {'ngDevMode': false},
      'keep_fnames': !debug,
      'reduce_funcs': !debug,
      'reduce_vars': !debug,
      'sequences': !debug,
    },
    'mangle': !debug,
  };

  fs.writeFileSync(configFile, JSON.stringify(uglifyConfig));

  const args = [
    resolveRunfiles('build_bazel_rules_nodejs_rollup_deps/node_modules/uglify-es/bin/uglifyjs'),
    inputFile, '--output', outputFile, '--config-file', configFile
  ];

  for (arg in argv) {
    const prefix = arg.length == 1 ? '-' : '--';
    const value = argv[arg];
    args.push(prefix + arg);
    if (value && value !== true) {
      args.push(value);
    }
  }

  if (DEBUG) console.error(`Running node ${args.join(' ')}`);

  child_process.execFileSync(
      isWindows ? 'node.cmd' : 'node', args,
      {stdio: [process.stdin, process.stdout, process.stderr]});
}

const isFile = !fs.lstatSync(path.join(process.cwd(), input)).isDirectory();

if (isFile) {
  runUglify(input, output, output + '.map');
} else {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }
  const dir = fs.readdirSync(input);
  dir.forEach(f => {
    if (f.endsWith('.js')) {
      const inputFile = path.join(input, path.basename(f));
      const outputFile = path.join(output, path.basename(f));
      runUglify(inputFile, outputFile, outputFile + '.map');
    }
  });
}
