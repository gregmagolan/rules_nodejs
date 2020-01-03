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

"""Generates a params file from a list of arguments.
"""

load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles")

_DOC = """Generates a params file from a list of arguments."""

_ATTRS = {
    "out": attr.output(
        doc = """Path of the output file, relative to this package.""",
        mandatory = True,
    ),
    "args": attr.string_list(
        doc = """Arguments to concatenate into a params file.
Subject to "Make" variable substitutions.
See https://docs.bazel.build/versions/master/be/make-variables.html.
1. Predefined source/output path variables
   https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables
2. Predefined variables & Custom variables
   https://docs.bazel.build/versions/master/be/make-variables.html#predefined_variables
   https://docs.bazel.build/versions/master/be/make-variables.html#custom_variables
Predefined genrule variables are not supported in this context.""",
    ),
    "data": attr.label_list(
        doc = """Data for predefined source/output path variable expansions in args.""",
        allow_files = True,
    ),
    "is_windows": attr.bool(mandatory = True),
    "newline": attr.string(
        doc = """one of ["auto", "unix", "windows"]: line endings to use. "auto"
for platform-determined, "unix" for LF, and "windows" for CRLF.""",
        values = ["unix", "windows", "auto"],
        default = "auto",
    ),
}

def _expand_location_into_runfiles(ctx, s):
    # `.split(" ")` is a work-around https://github.com/bazelbuild/bazel/issues/10309
    # TODO: If the string has intentional spaces or if one or more of the expanded file
    # locations has a space in the name, we will incorrectly split it into multiple arguments
    return expand_location_into_runfiles(ctx, s, targets = ctx.attr.data).split(" ")

def _impl(ctx):
    if ctx.attr.newline == "auto":
        newline = "\r\n" if ctx.attr.is_windows else "\n"
    elif ctx.attr.newline == "windows":
        newline = "\r\n"
    else:
        newline = "\n"

    expanded_args = []

    # First expand predefined source/output path variables
    # $(execpath), $(rootpath), $(manifestpath) & legacy $(location)
    for a in ctx.attr.args:
        expanded_args += _expand_location_into_runfiles(ctx, a)

    # Next expand predefined variables & custom variables
    expanded_args = [ctx.expand_make_variables("args", e, {}) for e in expanded_args]

    # ctx.actions.write creates a FileWriteAction which uses UTF-8 encoding.
    ctx.actions.write(
        output = ctx.outputs.out,
        content = newline.join(expanded_args),
        is_executable = False,
    )
    files = depset(direct = [ctx.outputs.out])
    runfiles = ctx.runfiles(files = [ctx.outputs.out])
    return [DefaultInfo(files = files, runfiles = runfiles)]

_params_file = rule(
    implementation = _impl,
    provides = [DefaultInfo],
    attrs = _ATTRS,
    doc = _DOC,
)

def params_file(
        newline = "auto",
        **kwargs):
    """Generates a UTF-8 encoded params file from a list of arguments.

    Handles "Make" variable substitutions for args.

    Args:
      newline: one of ["auto", "unix", "windows"]: line endings to use. "auto"
          for platform-determined, "unix" for LF, and "windows" for CRLF.
      **kwargs: further keyword arguments, e.g. <code>visibility</code>
    """
    _params_file(
        newline = newline or "auto",
        is_windows = select({
            "@bazel_tools//src/conditions:host_windows": True,
            "//conditions:default": False,
        }),
        **kwargs
    )
