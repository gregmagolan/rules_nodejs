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

const fs = require('fs');
const path = require('path');

const DEBUG = false;

/**
 * The runfiles manifest maps from short_path
 * https://docs.bazel.build/versions/master/skylark/lib/File.html#short_path
 * to the actual location on disk where the file can be read.
 *
 * In a sandboxed execution, it does not exist. In that case, runfiles must be
 * resolved from a symlink tree under the runfiles dir.
 * See https://github.com/bazelbuild/bazel/issues/3726
 */
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

function isFile(res) {
  try {
    return fs.statSync(res).isFile();
  } catch (e) {
    return false;
  }
}

function loadAsFileSync(res) {
  if (isFile(res)) {
    return res;
  }
  if (isFile(res + '.js')) {
    return res;
  }
  return null;
}

function loadAsDirectorySync(res) {
  const pkgfile = path.join(res, 'package.json');
  if (isFile(pkgfile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgfile, 'UTF-8'));
      const main = pkg['main'];
      if (main) {
        if (main === '.' || main === './') {
          main = 'index';
        }

        let maybe = loadAsFileSync(path.resolve(res, main));
        if (maybe) {
          return maybe;
        }

        maybe = loadAsDirectorySync(path.resolve(res, main));
        if (maybe) {
          return maybe;
        }
      }
    } catch (e) {
    }
  }
  return loadAsFileSync(path.resolve(res, 'index'));
}

function resolveManifestFile(res) {
  return runfilesManifest[res] || runfilesManifest[res + '.js'];
}

function resolveManifestDirectory(res) {
  const pkgfile = runfilesManifest[`${res}/package.json`];
  if (pkgfile) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgfile, 'UTF-8'));
      const main = pkg['main'];
      if (main) {
        if (main === '.' || main === './') {
          main = 'index';
        }

        let maybe = resolveManifestFile(path.posix.join(res, main));
        if (maybe) {
          return maybe;
        }

        maybe = resolveManifestDirectory(path.posix.join(res, main));
        if (maybe) {
          return maybe;
        }
      }
    } catch (e) {
    }
  }
  return resolveManifestFile(`${res}/index`)
}

module.exports = function resolveRunfiles(...pathSegments) {
  // Remove any empty strings from pathSegments
  pathSegments = pathSegments.filter(segment => segment);

  const defaultPath = path.join(process.env.RUNFILES, ...pathSegments);

  if (runfilesManifest) {
    // Normalize to forward slash, because even on Windows the runfiles_manifest file
    // is written with forward slash.
    const runfilesEntry = pathSegments.join('/').replace(/\\/g, '/');
    if (DEBUG) console.error('runfiles: try to resolve in runfiles manifest', runfilesEntry);

    let maybe = resolveManifestFile(runfilesEntry);
    if (maybe) {
      if (DEBUG) console.error('runfiles: resolved manifest file', maybe);
      return maybe;
    }

    maybe = resolveManifestDirectory(runfilesEntry);
    if (maybe) {
      if (DEBUG) console.error('runfiles: resolved via manifest directory', maybe);
      return maybe;
    }
  } else {
    if (DEBUG) console.error('runfiles: try to resolve in runfiles', defaultPath);

    let maybe = loadAsFileSync(defaultPath);
    if (maybe) {
      if (DEBUG) console.error('runfiles: resolved file', maybe);
      return maybe;
    }

    maybe = loadAsDirectorySync(defaultPath);
    if (maybe) {
      if (DEBUG) console.error('runfiles: resolved via directory', maybe);
      return maybe;
    }
  }

  return defaultPath;
}