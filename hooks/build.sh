#!/bin/bash
#
# Shell script for ask-cli code build for nodejs-npm flow.
#
# Script Usage: build.sh <OUT_FILE> <DO_DEBUG>
# OUT_FILE is the file name for the output (required)
# DO_DEBUG is boolean value for debug logging
#
# Run this script whenever a package.json is defined

readonly OUT_FILE=${1:-"upload.zip"}
readonly DO_DEBUG=${2:-false}

readonly DOCKER_BUILD_IMAGE="lambci/lambda:build-nodejs12.x"

main() {
  if [[ $DO_DEBUG = true ]]; then
    echo "###########################"
    echo "####### Build Code ########"
    echo "###########################"
  fi

  if ! install_dependencies; then
    display_stderr "Failed to install the dependencies in the project."
    exit 1
  fi

  if ! zip_node_modules; then
    display_stderr "Failed to zip the artifacts to ${OUT_FILE}."
    exit 1
  fi

  if [[ $DO_DEBUG = true ]]; then
    echo "###########################"
    echo "Codebase built successfully"
    echo "###########################"
  fi

  exit 0
}

display_stderr() {
  echo "[Error] $1" >&2
}

display_debug() {
  [[ $DO_DEBUG == true ]] && echo "[Debug] $1" >&2
}

install_dependencies() {
  display_debug "Installing NodeJS dependencies based on the package.json."

  if [[ $DO_DEBUG == true ]]; then
    docker run --rm -v "$PWD:/src" -w /src $DOCKER_BUILD_IMAGE npm ci --production
  else
    docker run --rm -v "$PWD:/src" -w /src $DOCKER_BUILD_IMAGE npm ci --production > /dev/null 2>&1
  fi
  return $?
}

zip_node_modules() {
  display_debug "Zipping source files and dependencies to $OUT_FILE."

  if [[ $DO_DEBUG == true ]]; then
    zip -vr "$OUT_FILE" ./*
  else
    zip -qr "$OUT_FILE" ./*
  fi
  return $?
}

# Execute main function
main "$@"
