#!/usr/bin/env bash

# Turn on extra logging so that test failures are easier to debug
export VERBOSE_LOGS=1
export NODE_DEBUG=module

stderr_echo_and_run() { >&2 echo "+ $@" ; "$@" ; }

ls_r () {
  ls -R "$@" | awk '
/:$/&&f{s=$0;f=0}
/:$/&&!f{sub(/:$/,"");s=$0;f=1;next}
NF&&f{ print s"/"$0 }' | xargs stat -f "%N%SY"
}

stderr_echo_and_run pwd

stderr_echo_and_run ls_r ..

# Assume node is on the machine
# This needs to be changed to use bazel toolchains before merging
stderr_echo_and_run node --preserve-symlinks-main --preserve-symlinks internal/linker/link_node_modules.js internal/linker/test/integration/_example.module_mappings.json

stderr_echo_and_run ls_r ..

stderr_echo_and_run node --preserve-symlinks-main --preserve-symlinks internal/linker/test/integration/program.js > $TEST_TMPDIR/out

out=`cat $TEST_TMPDIR/out`
if [[ "$out" != "1.2.3_a" ]]; then
  echo "expected 1.2.3_a but was ${out}" >&2
  exit 1
fi
