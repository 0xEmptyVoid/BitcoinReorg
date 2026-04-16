#!/bin/bash

# Ensure bitcoin stops when script exits
trap 'echo "Stopping Bitcoin Node..."; bitcoin-cli -conf=/home/bitcoin/bitcoin.conf -datadir=/home/bitcoin/btc-node stop' EXIT

# Create data directory
mkdir -p /home/bitcoin/btc-node

# Start Bitcoin node
echo "Starting Bitcoin Node..."
bitcoind -daemon -conf=/home/bitcoin/bitcoin.conf -datadir=/home/bitcoin/btc-node > /dev/null 2>&1

# Wait for node to be ready
echo "Waiting for node to start..."
sleep 10

# Check if node is running
echo "Checking node status..."
bitcoin-cli -conf=/home/bitcoin/bitcoin.conf -datadir=/home/bitcoin/btc-node getblockchaininfo > /dev/null 2>&1 || echo "Node not ready yet"

# Give a bit more time for initialization
sleep 5

# Run the Bitcoin simulator
echo "Starting Bitcoin Regtest Network Reorganization Simulator..."
node index.js

# Keep container running (in case the simulator exits)
echo "Simulator has finished. Keeping container alive..."
tail -f /dev/null