#!/bin/bash

CURRENT_SCRIPT=$(realpath $0)
CURRENT_SCRIPT_DIR=$(dirname $CURRENT_SCRIPT)

$CURRENT_SCRIPT_DIR/node_modules/ts-node/dist/bin.js \
    $CURRENT_SCRIPT_DIR/src/index.ts \
    $@