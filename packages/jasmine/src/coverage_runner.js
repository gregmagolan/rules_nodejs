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
const crypto = require('crypto');
const childProcess = require('child_process');

/**
 * This is designed to collect the coverage of one target, since in nodejs
 * and using NODE_V8_COVERAGE it may produce more than one coverage file, however bazel expects
 * there to be only one lcov file. So this collects up the v8 coverage json's merges them and
 * converts them to lcov for bazel to pick up later.
 * TODO: The functionality in this script could be put into _lcov_merger then it would apply to
 * any tool reporting coverage not just jasmine
 */
async function main() {
  const result = childProcess.spawnSync(
      process.execPath,
      [...process.execArgv, __dirname + '/jasmine_runner.js', ...process.argv.slice(2)],
      {stdio: 'inherit'});

  const exitCode = result.status;

  const v8CoverageEnabled = process.env.COVERAGE_DIR && process.env.NODE_V8_COVERAGE;

  // 0 indicates success
  // so if it's anything then exit here since bazel only collects coverage on success
  if (exitCode !== 0 || !v8CoverageEnabled) {
    if (result.error) {
      console.error(result.error);
    }
    process.exit(exitCode == null ? 1 : exitCode);
  }

  const coverageDir = process.env.COVERAGE_DIR;
  const outputFile = process.env.COVERAGE_OUTPUT_FILE;
  const sourceFileManifest = process.env.COVERAGE_MANIFEST;

  const instrumentedSourceFiles = fs.readFileSync(sourceFileManifest).toString('utf8').split('\n');

  // c8 will name the output report file lcov.info
  // so we give it a dir that it can write to
  // later on we'll move and rename it into output_file as bazel expects
  const tmpdir = process.env['TEST_TMPDIR'];
  const c8OutputDir = path.join(tmpdir, crypto.randomBytes(4).toString('hex'));
  fs.mkdirSync(c8OutputDir);

  const includes =
      instrumentedSourceFiles
          // the manifest may include files such as .bash so we want to reduce that down to the set
          // we can run coverage on in JS
          .filter(f => ['.js', '.jsx', '.cjs', '.ts', '.tsx', '.mjs'].includes(path.extname(f)))
          .map(f => {
            // at runtime we only run .js or .mjs
            // meaning that the coverage written by v8 will only include urls to .js or .mjs
            // so the source files need to be mapped from their input to output extensions
            // TODO: how do we know what source files produce .mjs and .cjs?
            const p = path.parse(f);
            let targetExt;
            switch (p) {
              case '.mjs':
                targetExt = '.mjs';
              default:
                targetExt = '.js';
            }

            return path.format({...p, base: null, ext: targetExt});
          });

  // only require in c8 when we're actually going to do some coverage
  const c8 = require('c8');
  // see https://github.com/bcoe/c8/blob/master/lib/report.js
  // for more info on this function
  // TODO: enable the --all functionality
  await new c8
      .Report({
        include: includes,
        // the test-exclude lib will include everything if out includes array is empty
        // so instead when it's empty exclude everything
        exclude: includes.length === 0 ? ['**'] : [],
        reportsDirectory: c8OutputDir,
        // tempDirectory as actually the dir that c8 will read from for the v8 json files
        tempDirectory: coverageDir,
        resolve: '',
        // TODO: maybe add an attribute to allow more reporters
        // or maybe an env var?
        reporter: ['lcovonly']
      })
      .run();
  // moves the report into the files bazel expects
  // lcovonly names this file lcov.info
  fs.copyFileSync(path.join(c8OutputDir, 'lcov.info'), outputFile);

  process.exit(exitCode);
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
