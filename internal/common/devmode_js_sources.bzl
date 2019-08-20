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

"""Rule to get devmode js sources from deps.

Outputs a manifest file with the sources listed.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "JSTransitiveNamedModuleInfo")
load(":expand_into_runfiles.bzl", "expand_path_into_runfiles")
load(":sources_aspect.bzl", "sources_aspect")

def _devmode_js_sources_impl(ctx):
    # Since we apply the sources_aspect to our deps below, we can iterate through
    # the deps and fetch all transitive named js files from the JSTransitiveNamedModuleInfo
    # provider returned from the apsect.
    sources_depsets = []
    for dep in ctx.attr.deps:
        if JSTransitiveNamedModuleInfo in dep:
            sources_depsets.append(dep[JSTransitiveNamedModuleInfo].sources)
        if hasattr(dep, "files"):
            sources_depsets.append(dep.files)
    sources = depset(transitive = sources_depsets)

    ctx.actions.write(ctx.outputs.manifest, "".join([
        expand_path_into_runfiles(ctx, f.path) + "\n"
        for f in sources.to_list()
    ]))

    return [DefaultInfo(
        files = sources,
        runfiles = ctx.runfiles(transitive_files = sources),
    )]

devmode_js_sources = rule(
    implementation = _devmode_js_sources_impl,
    attrs = {
        "deps": attr.label_list(
            allow_files = True,
            aspects = [sources_aspect],
        ),
    },
    outputs = {
        "manifest": "%{name}.MF",
    },
)
