#!/usr/bin/env bash

# Variables
readonly projectDir=$(realpath "$(dirname ${BASH_SOURCE[0]})/..")
readonly envHelpersPath="$projectDir/.circleci/env-helpers.inc.sh";

# Load helpers and make them available everywhere (through `$BASH_ENV`).
source $envHelpersPath;
echo "source $envHelpersPath;" >> $BASH_ENV;

# Source `$BASH_ENV` to make the variables available immediately.
source $BASH_ENV;
