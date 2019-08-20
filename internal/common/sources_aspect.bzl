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

"""Aspect to collect js sources from deps.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "JSEcmaScriptModuleInfo", "JSModuleInfo", "JSNamedModuleInfo", "JSTransitiveEcmaScriptModuleInfo", "JSTransitiveModuleInfo", "JSTransitiveNamedModuleInfo")
load("@build_bazel_rules_nodejs//internal/common:node_module_info.bzl", "NodeModuleInfo")

def _sources_aspect_impl(target, ctx):
    module_format = None
    module_sources = depset()
    if JSModuleInfo in target:
        module_format = target[JSModuleInfo].module_format
        module_sources = depset(transitive = [target[JSModuleInfo].sources])

    named_sources = depset()
    if JSNamedModuleInfo in target:
        named_sources = depset(transitive = [target[JSNamedModuleInfo].sources])

    esm_sources = depset()
    if JSEcmaScriptModuleInfo in target:
        esm_sources = depset(transitive = [target[JSEcmaScriptModuleInfo].sources])

    if hasattr(ctx.rule.attr, "deps"):
        for dep in ctx.rule.attr.deps:
            if JSTransitiveModuleInfo in dep:
                if module_format != dep[JSTransitiveModuleInfo].module_format:
                    module_format = "mixed"
                module_sources = depset(transitive = [module_sources, dep[JSTransitiveModuleInfo].sources])
            if JSTransitiveNamedModuleInfo in dep:
                named_sources = depset(transitive = [named_sources, dep[JSTransitiveNamedModuleInfo].sources])
            if JSTransitiveEcmaScriptModuleInfo in dep:
                esm_sources = depset(transitive = [esm_sources, dep[JSTransitiveEcmaScriptModuleInfo].sources])

    providers = []

    # provider transitive sources JS providers
    if module_sources:
        providers.extend([JSTransitiveModuleInfo(
            module_format = module_format,
            sources = module_sources,
        )])

    if named_sources:
        providers.extend([JSTransitiveNamedModuleInfo(
            sources = named_sources,
        )])

    if esm_sources:
        providers.extend([JSTransitiveEcmaScriptModuleInfo(
            sources = esm_sources,
        )])

    # provide NodeModuleInfo if it is not already provided there are NodeModuleInfo deps
    if not NodeModuleInfo in target:
        transitive_sources = depset()
        nm_wksp = None
        if hasattr(ctx.rule.attr, "deps"):
            for dep in ctx.rule.attr.deps:
                if NodeModuleInfo in dep:
                    if nm_wksp and dep[NodeModuleInfo].workspace != nm_wksp:
                        fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (nm_wksp, dep[NodeModuleInfo].workspace))
                    nm_wksp = dep[NodeModuleInfo].workspace
                    transitive_sources = depset(transitive = [dep[NodeModuleInfo].transitive_sources, transitive_sources])
            if nm_wksp:
                providers.extend([NodeModuleInfo(sources = depset(), transitive_sources = transitive_sources, workspace = nm_wksp)])

    return providers

sources_aspect = aspect(
    _sources_aspect_impl,
    attr_aspects = ["deps"],
)
