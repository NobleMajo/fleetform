#!/bin/bash

docker run -i --rm \
    --name "fleeform-cli" \
    -v "/var/run/docker.sock:/var/run/docker.sock" \
    -v "$(pwd)/:/mountpoint" \
    fleetform \
        $@
