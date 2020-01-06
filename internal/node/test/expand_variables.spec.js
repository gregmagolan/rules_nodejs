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
const args = process.argv.slice(2);
const out = JSON.parse(
    require('fs').readFileSync(runfiles.resolveWorkspaceRelative(args.shift()), 'utf-8'));
const expected = args;

if (out.length !== expected.length) {
  console.error(`expected ${expected.length} out but got ${out.length}`);
  console.error(`${JSON.stringify(out, null, 2).replace(/\"/g, '\'')} !== ${
      JSON.stringify(expected, null, 2).replace(/\"/g, '\'')}`)
  process.exit(1);
}

for (let i = 0; i < out.length; ++i) {
  if (out[i] !== expected[i]) {
    console.error(`expected param ${i + 1} in out file to be '${expected[i]}' but got '${out[i]}'`);
    console.error(`${JSON.stringify(out, null, 2).replace(/\"/g, '\'')} !== ${
        JSON.stringify(expected, null, 2).replace(/\"/g, '\'')}`)
    process.exit(1);
  }
}
