#!/bin/bash

# Ensure bitcoin stops when script exits
trap 'echo "Stopping Bitcoin Node..."; bitcoin-cli -conf="$(pwd)/bitcoin.conf" stop' EXIT

# Start Bitcoin node
echo "Starting Bitcoin Node..."
bitcoin-qt -conf="$(pwd)/bitcoin.conf" > /dev/null 2>&1 &

echo "Waiting for node to initialize..."
sleep 8

# Run the Bitcoin simulator
echo "Starting Bitcoin Regtest Network Reorganization Simulator..."
node index.js