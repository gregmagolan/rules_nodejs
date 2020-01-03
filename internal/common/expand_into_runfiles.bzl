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

"""Helper functions to expand paths into runfiles
"""

# Expand $(rootpath) and $(rootpaths) to runfiles manifest path.
# Runfiles manifest path is of the form:
# - repo/path/to/file
def _expand_rootpath_to_manifest_path(ctx, input, targets):
    paths = ctx.expand_location(input, targets)
    return " ".join([_rootpath_to_runfiles_manifest_path(ctx, p, targets) for p in paths.split(" ")])

# Convert an runfiles rootpath to a runfiles manifestpath.
# Runfiles rootpath is returned from ctx.expand_location $(rootpath) and $(rootpaths):
# - ./file
# - path/to/file
# - ../external_repo/path/to/file
# This is converted to the runfiles manifest path of:
# - repo/path/to/file
def _rootpath_to_runfiles_manifest_path(ctx, path, targets):
    if path.startswith("../"):
        return path[len("../"):]
    if path.startswith("./"):
        path = path[len("./"):]
    return ctx.workspace_name + "/" + path

def expand_location_into_runfiles(ctx, input, targets = []):
    """Expands all $(execpath ...), $(rootpath ...), $(manifestpath ...) and legacy $(location ...) templates in the
    given string by replacing with the expanded path. Expansion only works for labels that point to direct dependencies
    of this rule or that are explicitly listed in the optional argument targets.

    See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables.

    Use $(manifestpath) and $(manifestpaths) to expand labels to the manifest file path.
    This is of the format: `repo/path/to/file`.

    Use $(execpath) and $(execpaths) to expand labels to the execroot (where Bazel runs build actions).
    This is of the format:
    - `./file`
    - `path/to/file`
    - `external/external_repo/path/to/file`
    - `<bin_dir>/path/to/file`
    - `<bin_dir>/external/external_repo/path/to/file`

    Use $(rootpath) and $(rootpaths) to expand labels to the runfiles path that a built binary can use
    to find its dependencies. This path is of the format:
    - `./file`
    - `path/to/file`
    - `../external_repo/path/to/file`

    The legacy $(location) and $(locations) expansion is deprecated and is now a symnonyms for $(manifestpath)
    and $(manifestpaths) for backward compatability. This differs from how $(location) and $(locations) expansion
    behaves in expansion the `args` attribute of a *_binary or *_test which returns the rootpath.
    See https://docs.bazel.build/versions/master/be/common-definitions.html#common-attributes-binaries.
    This also differs from how the builtin ctx.expand_location() expansions of $(location) and ($locations) behave
    as that function returns either the execpath or rootpath depending on the context.
    See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables.

    The behavior of $(location) and $(locations) expansion may change in the future with support either being removed
    entirely or the expansion changed to return the same path as ctx.expand_location() returns for these.

    Args:
      ctx: context
      input: String to be expanded
      targets: List of targets for additional lookup information.

    Returns:
      The expanded path or the original path
    """
    target = "@%s//%s:%s" % (ctx.workspace_name, "/".join(ctx.build_file_path.split("/")[:-1]), ctx.attr.name)

    # Loop through input an expand all predefined source/output path variables including the custom
    # $(manifestpath) and $(manifestpaths).
    # See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables.
    path = ""
    length = len(input)
    last = 0
    for i in range(length):
        # Expand $(manifestpath) and $(manifestpaths) to runfiles manfiest paths
        if input[i:].startswith("$(manifestpath ") or input[i:].startswith("$(manifestpaths "):
            j = input.find(")", i) + 1
            if (j == 0):
                fail("invalid $(manifestpath) expansion in string \"%s\" part of target %s" % (input, target))
            path += input[last:i]
            path += _expand_rootpath_to_manifest_path(ctx, "$(rootpath" + input[i + 14:j], targets)
            last = j
            i = j

        # Support legacy $(location) and $(locations) expansions which are synonyms for $(manifestpath) and $(manifestpaths)
        if input[i:].startswith("$(location ") or input[i:].startswith("$(locations "):
            j = input.find(")", i) + 1
            if (j == 0):
                fail("invalid \"%s\" expansion in string \"%s\" part of target %s" % (input[i:j], input, target))
            path += input[last:i]
            path += _expand_rootpath_to_manifest_path(ctx, "$(rootpath" + input[i + 10:j], targets)
            last = j
            i = j

        # Expand $(execpath) $(execpaths) $(rootpath) $(rootpaths) with plain ctx.expand_location()
        if input[i:].startswith("$(execpath ") or input[i:].startswith("$(execpaths ") or input[i:].startswith("$(rootpath ") or input[i:].startswith("$(rootpaths "):
            j = input.find(")", i) + 1
            if (j == 0):
                fail("invalid \"%s\" expansion in string \"%s\" part of target %s" % (input[i:j], input, target))
            path += input[last:i]
            path += ctx.expand_location(input[i:j], targets)
            last = j
            i = j
    path += input[last:]

    return path
