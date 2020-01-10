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
/**
 * @fileoverview NodeJS module loader for bazel.
 * Requires patcher before loading module if it has not already been loaded
 * in a bootstrap step.
 */
'use strict';
var path = require('path');

// Ensure that node is added to the path for any subprocess calls
const isWindows = /^win/i.test(process.platform);
process.env.PATH = [path.dirname(process.execPath), process.env.PATH].join(isWindows ? ';' : ':');

const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];

function log_verbose(...m) {
  // This is a template file so we use __filename to output the actual filename
  if (VERBOSE_LOGS) console.error(`[${path.basename(__filename)}]`, ...m);
}

const TARGET = 'TEMPLATED_target';
const ENTRY_POINT = 'TEMPLATED_entry_point';
const NODE_PATCHER = 'TEMPLATED_node_patcher';

log_verbose(`running ${TARGET} with
  cwd: ${process.cwd()}
  RUNFILES: ${process.env.RUNFILES}
  TARGET: ${TARGET}
  ENTRY_POINT: ${ENTRY_POINT}
  NODE_PATCHER: ${NODE_PATCHER}
`);

// Patch node first.
// If it has been previsouly loaded in a bootstrap step it will not be loaded again.
require(NODE_PATCHER)

if (require.main === module) {
  // Set the actual entry point in the arguments list.
  // argv[0] == node, argv[1] == entry point.
  // NB: 'TEMPLATED_entry_point' below is replaced during the build process.
  var mainScript = process.argv[1] = 'TEMPLATED_entry_point';
  try {
    module.constructor._load(mainScript, this, /*isMain=*/true);
  } catch (e) {
    console.error(e.stack || e);
    process.exit(1);
  }
}
