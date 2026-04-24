#!/bin/bash

# Determine absolute path for Windows compatibility (Git Bash)
CUR_DIR=$(pwd)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    CUR_DIR=$(pwd -W 2>/dev/null || pwd)
fi

# Get datadir from config file if present (strip whitespace and CR)
CONF_DATADIR=$(grep -iE "^\s*datadir\s*=" "$CUR_DIR/bitcoin.conf" | tail -n 1 | cut -d'=' -f2- | sed 's/^\s*//;s/\s*$//' | tr -d '\r')

# Determine final DATA_DIR (Precedence: Arg $1 > bitcoin.conf > Default)
if [ -n "$1" ]; then
    DATA_DIR="$1"
    echo "Using data directory from command line: $DATA_DIR"
elif [ -n "$CONF_DATADIR" ]; then
    DATA_DIR="$CONF_DATADIR"
    echo "Using data directory from bitcoin.conf: $DATA_DIR"
else
    DATA_DIR="$CUR_DIR/data/btc-node"
    echo "Using default data directory: $DATA_DIR"
fi

# Ensure data directory exists
mkdir -p "$DATA_DIR"

# Ensure bitcoin stops when script exits
trap "echo 'Stopping Bitcoin Node...'; bitcoin-cli -conf='$CUR_DIR/bitcoin.conf' -datadir='$DATA_DIR' stop" EXIT

# Start Bitcoin node
echo "Starting Bitcoin Node..."
# Using full path for config and datadir to avoid Windows path issues
bitcoind -conf="$CUR_DIR/bitcoin.conf" -datadir="$DATA_DIR" > /dev/null 2>&1 &

echo "Waiting for node to initialize..."
sleep 8

# Run the Bitcoin simulator
echo "Starting Bitcoin Regtest Network Reorganization Simulator..."
node index.js