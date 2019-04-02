# Protractor rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The Protractor rules run protractor tests with Bazel.

## Installation

Add the `@bazel/protractor` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies' function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

This causes the `@bazel/protractor` package to be installed as a Bazel workspace named `npm_bazel_protractor`.

Now add this to your `WORKSPACE` to install the Protractor dependencies:

```python
# Fetch transitive Bazel dependencies of npm_bazel_protractor
load("@npm_bazel_protractor//:package.bzl", "rules_protractor_dependencies")
rules_protractor_dependencies()
```

This installs the `io_bazel_rules_webtesting` repository, if you haven't installed it earlier.

Finally, configure the rules_webtesting:

```python
# Setup web testing
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()

load("@npm_bazel_protractor//:browser_repositories.bzl", "browser_repositories")

browser_repositories()
```
