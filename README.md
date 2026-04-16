<div align="center">

# ₿ Bitcoin Regtest Simulator & Miner

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Bitcoin](https://img.shields.io/badge/Bitcoin-F7931A?style=for-the-badge&logo=bitcoin&logoColor=white)](https://bitcoin.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://javascript.info/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**A high-performance, aesthetically pleasing toolkit for Bitcoin Regtest environments.**
*Simulate mining, manage chain reorganizations, and explore Bitcoin Core RPC with style.*

[Features](#-key-features) • [Installation](#-getting-started) • [Configuration](#-configuration) • [Usage](#-usage)

</div>

---

## 🚀 Overview

This suite is designed for developers who need a robust and visual way to interact with a Bitcoin Regtest network. It eliminates the friction of manual `bitcoin-cli` commands by providing a specialized UI for block generation and a unique "Reorg Wizard" to test edge cases in blockchain applications.

---

## 🛠️ Installation & Setup

### 📋 Prerequisites
Before choosing a deployment method, ensure you have:
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [Bitcoin Core](https://bitcoincore.org/en/download/) (Local install required for non-docker setups)
*   **Git Bash** (Recommended for Windows users to run `.sh` scripts)

```bash
# Clone the repository
git clone https://github.com/0xEmptyVoid/BitcoinReorg.git
cd BitcoinReorg

# Install dependencies
npm install
```

---

## 💻 Operating Modes

This project supports multiple ways to run, depending on your environment and needs.

### 1. Running Locally (No Docker)
Best for developers who already have Bitcoin Core installed and want the fastest performance.

**Step A: Start your Bitcoin Node**
Make sure your node is running in regtest mode. You can use the provided `bitcoin.conf`:
```bash
bitcoind -conf=$(pwd)/bitcoin.conf -daemon
```

**Step B: Run the Simulator/Miner**
```bash
# To start the Interactive Simulator (Reorg Wizard)
npm start

# To start the Automated Mining Dashboard
npm run mine
```

---

### 🐳 Running with Docker
The Docker setup is fully automated and isolated. It includes its own Bitcoin Core v26.0 binaries and Node.js environment.

**How to run:**
1. **Build the image:**
   ```bash
   docker build -t bitcoin-reorg .
   ```
2. **Launch the container:**
   ```bash
   # Interactive mode (-it) is required for the terminal UI
   docker run -it --name btc-sim bitcoin-reorg
   ```

> [!IMPORTANT]
> The container overrides any Windows-specific paths in `bitcoin.conf`, so you don't need to change your configuration to run in Docker. All blockchain data inside Docker is stored in `/home/bitcoin/btc-node`.

---

### 🪟 Windows GUI Mode
A specialized mode for Windows users who prefer visual feedback from the **Bitcoin-QT** interface.

This mode launches the graphical version of Bitcoin Core alongside our CLI simulator. This allows you to see the blocks appearing in the Bitcoin-QT UI in real-time as the simulator generates them.

**How to run:**
1. Open **Git Bash**.
2. Run the Windows GUI script:
   ```bash
   ./run_win_gui.sh
   ```
3. **What happens?**
   *   `bitcoin-qt` will launch in a new window (Regtest mode).
   *   The terminal will wait for the node to initialize.
   *   The **Interactive Reorg Simulator** will start in your terminal.

> [!TIP]
> This is the best mode for debugging and learning, as you can see the "Best Block" change visually in the GUI while controlling it from the terminal.

---

## ✨ Key Features

### ⛏️ Automated Miner
A dedicated terminal dashboard for block generation.
- **Dynamic Intervals:** Set any mining speed from 1s to hours.
- **Real-time Stats:** Track block height, hash rate, and uptime.
- **Visual Log:** Elegant, color-coded logging of newly mined blocks.

### 🔄 Reorg Simulator Wizard
A guided 6-step process to simulate complex chain events:
1. **Snapshot:** View current chain state.
2. **Parameters:** Set how many blocks to fork and how many to replace.
3. **Pre-Reorg Mining:** Build the "original" chain.
4. **Invalidation:** Automatically trigger a chain split at a specific height.
5. **Alt-Chain Mining:** Build a longer "attack" chain.
6. **Summary:** Comprehensive report of the reorganization depth and final tip.

---

## ⚙️ Configuration
The application uses `bitcoin.conf` for all PRC connections. You can modify this file to point to an external node if needed.

```ini
regtest=1
[regtest]
rpcuser=admin
rpcpassword=admin123
rpcport=18443
address=bcrt1qsaeer4a4uw445eeethryedutp95jl3nwuulmmu
```

---

<div align="center">

**Created for the Bitcoin Developer Community**

</div>
