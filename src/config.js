// ══════════════════════════════════════════════════════════════
//  Shared Configuration Parser
//  Reads bitcoin-cli.conf and returns structured config
// ══════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");

const CONF_PATH = path.join(__dirname, "..", "bitcoin.conf");

function parseConfig(filePath) {
  const config = {};
  if (!fs.existsSync(filePath)) {
    // Fallback to hidden version if explicit one doesn't exist
    const hiddenPath = path.join(path.dirname(filePath), "." + path.basename(filePath));
    if (fs.existsSync(hiddenPath)) {
      filePath = hiddenPath;
    } else {
      console.error(`  ✗ Config file not found: ${filePath}`);
      process.exit(1);
    }
  }
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    config[key] = value;
  }
  return config;
}

const conf = parseConfig(CONF_PATH);
const rpcPort = conf.rpcport || "18443";

const isDocker = fs.existsSync("/.dockerenv");
const DATADIR = isDocker ? "/home/bitcoin/btc-node" : (conf.datadir || "./btc-node");

module.exports = {
  RPCUSER: conf.rpcuser || "bitcoin",
  RPCPASSWORD: conf.rpcpassword || "bitcoin",
  RPCHOST: `http://127.0.0.1:${rpcPort}`,
  NETWORK: conf.regtest == "1" ? "regtest" : (conf.testnet == "1" ? "testnet" : "mainnet"),
  ADDRESS: conf.address || "bcrt1qsaeer4a4uw445eeethryedutp95jl3nwuulmmu",
  DATADIR,
  parseConfig,
};
