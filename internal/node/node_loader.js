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
 * @fileoverview Patched NodeJS module loader for bazel. This template is
 * expanded to contain module name -> path mappings and then patches the
 * NodeJS require() function to substitute the appropriate paths.
 *
 * @see https://github.com/nodejs/node/blob/master/lib/module.js
 */
'use strict';
var path = require('path');
var fs = require('fs');

// A small runfiles bootstrap is needed here to require
// internal/common/runfiles.js which exports the resolveRunfiles()
// function
function loadRunfilesManifest(manifestPath) {
  const result = Object.create(null);
  const input = fs.readFileSync(manifestPath, {encoding: 'utf-8'});
  for (const line of input.split('\n')) {
    if (!line) continue;
    const [runfilesPath, realPath] = line.split(' ');
    result[runfilesPath] = realPath;
  }
  return result;
}
const runfilesManifest =
    // On Windows, Bazel sets RUNFILES_MANIFEST_ONLY=1.
    // On every platform, Bazel also sets RUNFILES_MANIFEST_FILE, but on Linux
    // and macOS it's faster to use the symlinks in RUNFILES_DIR rather than resolve
    // through the indirection of the manifest file
    process.env.RUNFILES_MANIFEST_ONLY === '1' &&
    loadRunfilesManifest(process.env.RUNFILES_MANIFEST_FILE);

const resolveRunfiles = require(
    runfilesManifest ?
        runfilesManifest['build_bazel_rules_nodejs/internal/common/runfiles.js'] :
        path.join(process.env.RUNFILES, 'build_bazel_rules_nodejs/internal/common/runfiles.js'));

const DEBUG = false;

/**
 * The module roots as pairs of a RegExp to match the require path, and a
 * module_root to substitute for the require path.
 * @type {!Array<{module_name: RegExp, module_root: string}>}
 */
var MODULE_ROOTS = [TEMPLATED_module_roots];

/**
 * Array of bootstrap modules that need to be loaded before the entry point.
 */
var BOOTSTRAP = [TEMPLATED_bootstrap];

if (DEBUG)
  console.error(`
node_loader (target TEMPLATED_target): running with
  MODULE_ROOTS: ${MODULE_ROOTS}
  BOOTSTRAP: ${BOOTSTRAP}
`);

function resolveToModuleRoot(path) {
  if (!path) {
    throw new Error('resolveToModuleRoot missing path: ' + path);
  }

  var match;
  var lengthOfMatch = 0;
  var matchedEntry;
  for (var i = 0; i < MODULE_ROOTS.length; i++) {
    var m = MODULE_ROOTS[i];
    var p = path.replace(m.module_name, m.module_root);
    // Longest regex wins when multiple match
    var len = m.module_name.toString().length;
    if (p !== path && len > lengthOfMatch) {
      lengthOfMatch = len;
      match = p;
      matchedEntry = m;
    }
  }
  if (match) {
    return match;
  }
  return null;
}

var originalResolveFilename = module.constructor._resolveFilename;
module.constructor._resolveFilename =
    function(request, parent) {
  var failedResolutions = [];
  var resolveLocations = [
    request,
    resolveRunfiles(request),
    resolveRunfiles(
        'TEMPLATED_user_workspace_name', 'TEMPLATED_label_package', 'node_modules', request),
  ];
  // Additional search path in case the build is across workspaces.
  // See comment in node.bzl.
  if ('TEMPLATED_label_workspace_name') {
    resolveLocations.push(resolveRunfiles(
        'TEMPLATED_label_workspace_name', 'TEMPLATED_label_package', 'node_modules', request));
  }
  var manifestLocation = resolveRunfiles('manifest');
  for (var location of resolveLocations) {
    try {
      // Do not resolve the MANIFEST file in runfiles
      // This can occur unintentially from a require('manifest') if there
      // is a manifest.js file or manifest npm package to be resolved
      if (runfilesManifest && location.toLowerCase() == manifestLocation.toLowerCase()) {
        continue;
      }
      return originalResolveFilename(location, parent);
    } catch (e) {
      failedResolutions.push(location);
    }
  }

  var moduleRoot = resolveToModuleRoot(request);
  if (moduleRoot) {
    var moduleRootInRunfiles = resolveRunfiles(moduleRoot);
    try {
      var filename = module.constructor._findPath(moduleRootInRunfiles, []);
      if (!filename) {
        throw new Error(`No file ${request} found in module root ${moduleRoot}`);
      }
      return filename;
    } catch (e) {
      console.error(`Failed to findPath for ${moduleRootInRunfiles}`);
      throw e;
    }
  }
  var error = new Error(
      `Cannot find module '${request}'\n  looked in:` + failedResolutions.map(r => '\n   ' + r));
  error.code = 'MODULE_NOT_FOUND';
  throw error;
}

// Before loading anything that might print a stack, install the
// source-map-support.
try {
  require('source-map-support').install();
} catch (e) {
  console.error(`WARNING: source-map-support module not installed.
   Stack traces from languages like TypeScript will point to generated .js files.
   `);
}

// Load all bootstrap modules before loading the entrypoint.
for (var i = 0; i < BOOTSTRAP.length; i++) {
  try {
    module.constructor._load(BOOTSTRAP[i], this);
  } catch (e) {
    console.error('bootstrap failure ' + e.stack || e);
    process.exit(1);
  }
}

if (require.main === module) {
  // Set the actual entry point in the arguments list.
  // argv[0] == node, argv[1] == entry point.
  // NB: entry_point below is replaced during the build process.
  var mainScript = process.argv[1] = 'TEMPLATED_entry_point';
  try {
    module.constructor._load(mainScript, this, /*isMain=*/true);
  } catch (e) {
    console.error('failed to load main ', e.stack || e);
    process.exit(1);
  }
}
