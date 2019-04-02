# Copyright 2018 The Bazel Authors. All rights reserved.
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

"""Legacy function that is now DEPRECATED.
"""

def check_rules_typescript_version(version_string):
    """Legacy function that is now DEPRECATED.
    """
    print("""
        WARNING: check_rules_typescript_version() provided by @npm_bazel_typescript//:version.bzl
        is deprecated and will be removed in the future.
        
        Bazel rules for nodejs published as npm packages such as @bazel/typescript have a single
        version policy and should never be fetched as transitive deps through npm. The version of
        @bazel/typescript should be explicitely set in your package.json file. If bazel rule npm
        packages depend on each other this should be expressed as a peerDependency in the package's
        package.json.
        """)
