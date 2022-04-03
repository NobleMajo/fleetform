#!/bin/bash

echo "   #####   TEST:\n$PWD\n$(pwd)"

docker run -i --rm \
    --name "fleeform-cli" \
    -v "/var/run/docker.sock:/var/run/docker.sock" \
    -v "$(pwd)/:/mountpoint" \
    fleetform \
        $@
 