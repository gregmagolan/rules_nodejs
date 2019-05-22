# Copyright 2019 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

""" Test API surface is
"""

load("//:src/jasmine_node_test.bzl", _jasmine_node_test = "jasmine_node_test")

def jasmine_node_test(deps = [], **kwargs):
    deps = deps + [
        "//:jasmine__pkg",
        "@npm//jasmine",
    ]
    _jasmine_node_test(
        # The jasmine label here is specific to local testing since
        # there is no @npm//@bazel/jasmine package here. Users
        # will always have this label point to their @foobar//node_modules/@bazel/jasmine:index.js
        # target if there is no @npm//@bazel/jasmine package
        jasmine = "@npm_bazel_jasmine//:index.js",
        deps = deps,
        **kwargs
    )
