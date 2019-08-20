# Copyright 2017 The Bazel Authors. All rights reserved.
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

"""Example of a rule that requires es2015 (devmode) inputs.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "JSTransitiveNamedModuleInfo")
load("@build_bazel_rules_nodejs//internal/common:sources_aspect.bzl", "sources_aspect")

def _devmode_consumer(ctx):
    # Since we apply the sources_aspect to our deps below, we can iterate through
    # the deps and fetch all transitive named js files from the JSTransitiveNamedModuleInfo
    # provider returned from the apsect.
    sources_depsets = []
    for dep in ctx.attr.deps:
        if JSTransitiveNamedModuleInfo in dep:
            sources_depsets.append(dep[JSTransitiveNamedModuleInfo].sources)
    sources = depset(transitive = sources_depsets)

    return [DefaultInfo(
        files = sources,
        runfiles = ctx.runfiles(transitive_files = sources),
    )]

devmode_consumer = rule(
    implementation = _devmode_consumer,
    attrs = {
        "deps": attr.label_list(aspects = [sources_aspect]),
    },
)
