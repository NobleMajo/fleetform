#!/bin/bash

SCRIPT="$(pwd)/bin/dev \$@"
BIN_DIR="/usr/local/bin"

echo "Need root access..."
sudo echo "Root access granted!"

if [ ! -d "/usr/local/bin" ]; then
    if [ -d "/usr/bin" ]; then
        BIN_DIR="/usr/bin"
    elif [ -d "/bin" ]; then
        BIN_DIR="/bin"
    elif [ -d "/usr/local/sbin" ]; then
        BIN_DIR="/usr/local/sbin"
    elif [ -d "/usr/sbin" ]; then
        BIN_DIR="/usr/sbin"
    elif [ -d "/sbin" ]; then
        BIN_DIR="/sbin"
    else
        echo "No bin folder exist!"
        exit 1
    fi
fi

sudo rm -rf "$BIN_DIR/ffd"
sudo touch "$BIN_DIR/ffd"
sudo chmod 777 "$BIN_DIR/ffd"
echo "$SCRIPT" >> "$BIN_DIR/ffd"
sudo chmod 755 "$BIN_DIR/ffd"

echo "Installed at '$BIN_DIR/ffd'"
