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
'use strict';

const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

// The arguments are passed via a params file
const TARGET_CPU = process.argv[2];
const COMPILATION_MODE = process.argv[3];
const params = require('fs')
                   .readFileSync(runfiles.resolveWorkspaceRelative(process.argv[4]), 'utf-8')
                   .split(/\r?\n/);

const expected = [
  'some_value',
  // manifestpaths
  'build_bazel_rules_nodejs/package.json',
  'build_bazel_rules_nodejs/internal/common/test/foo/bar/a.txt',
  'build_bazel_rules_nodejs/internal/common/test/params_file.spec.js',
  // manifestpath
  'build_bazel_rules_nodejs/package.json',
  // execpaths
  './package.json',
  `bazel-out/${TARGET_CPU}-${COMPILATION_MODE}/bin/internal/common/test/foo/bar/a.txt`,
  'internal/common/test/params_file.spec.js',
  // execpath
  './package.json',
  // rootpaths
  './package.json',
  'internal/common/test/foo/bar/a.txt',
  'internal/common/test/params_file.spec.js',
  // rootpath
  './package.json',
  // locations (synonym for manifestpaths)
  'build_bazel_rules_nodejs/package.json',
  'build_bazel_rules_nodejs/internal/common/test/foo/bar/a.txt',
  'build_bazel_rules_nodejs/internal/common/test/params_file.spec.js',
  // location (synonym for manifestpath)
  'build_bazel_rules_nodejs/package.json',
];

if (params.length !== expected.length) {
  console.error(`expected ${expected.length} params but got ${params.length}`);
  console.error(`${JSON.stringify(params, null, 2).replace(/\"/g, '\'')} !== ${
      JSON.stringify(expected, null, 2).replace(/\"/g, '\'')}`)
  process.exit(1);
}

for (let i = 0; i < params.length; ++i) {
  if (params[i] !== expected[i]) {
    console.error(
        `expected param ${i + 1} in params file to be '${expected[i]}' but got '${params[i]}'`);
    console.error(`${JSON.stringify(params, null, 2).replace(/\"/g, '\'')} !== ${
        JSON.stringify(expected, null, 2).replace(/\"/g, '\'')}`)
    process.exit(1);
  }
}
