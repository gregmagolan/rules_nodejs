// bootstrap the bazel require patch since this bootstrap script is loaded with
// `--node_options=--require=$(rlocation $(location :bootstrap.js))`
if (process.env['BAZEL_NODE_RUNFILES_HELPER']) {
  require(process.env['BAZEL_NODE_RUNFILES_HELPER']).patchRequire();
}
