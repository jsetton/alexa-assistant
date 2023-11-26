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

readonly DOCKER_BUILD_IMAGE="public.ecr.aws/sam/build-nodejs20.x"
readonly LATEST_RELEASE_URL="https://github.com/jsetton/alexa-assistant/releases/latest/download/lambda.zip"

main() {
  if [[ $DO_DEBUG = true ]]; then
    echo "###########################"
    echo "####### Build Code ########"
    echo "###########################"
  fi

  if check_docker; then
    if ! install_dependencies; then
      display_stderr "Failed to install the dependencies in the project."
      exit 1
    fi

    if ! zip_node_modules; then
      display_stderr "Failed to zip the artifacts to $OUT_FILE."
      exit 1
    fi
  else
    if ! download_latest_release; then
      display_stderr "Failed to download latest release package to $OUT_FILE."
      exit 1
    fi
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

check_docker() {
  display_debug "Checking if docker is running."

  if [[ $DO_DEBUG == true ]]; then
    docker version
  else
    docker version > /dev/null 2>&1
  fi
  return $?
}

download_latest_release() {
  display_debug "Downloading latest release package from GitHub to $OUT_FILE."

  if [[ $DO_DEBUG == true ]]; then
    wget -d -O "$OUT_FILE" "$LATEST_RELEASE_URL"
  else
    wget -q -O "$OUT_FILE" "$LATEST_RELEASE_URL"
  fi
  return $?
}

install_dependencies() {
  display_debug "Installing NodeJS dependencies based on the package.json."

  if [[ $DO_DEBUG == true ]]; then
    docker run --rm -v "$PWD:/src" -w /src -e NODE_ENV=production "$DOCKER_BUILD_IMAGE" npm ci
  else
    docker run --rm -v "$PWD:/src" -w /src -e NODE_ENV=production "$DOCKER_BUILD_IMAGE" npm ci > /dev/null 2>&1
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
