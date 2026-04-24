// ══════════════════════════════════════════════════════════════
//  Bitcoin Regtest Network — Reorg Simulator CLI
//  Uses bitcoin-core JavaScript library
//  Reads configuration from bitcoin-cli.conf
// ══════════════════════════════════════════════════════════════

const client = require("./src/rpc");
const config = require("./src/config");
const colors = require("./src/ui/colors");
const logger = require("./src/ui/logger");
const { renderBanner } = require("./src/ui/banner");
const { renderMenu, promptMenuChoice, promptInput } = require("./src/ui/menu");
const inspector = require("./src/reorg/chain_inspector");
const simulator = require("./src/reorg/simulator");
const readline = require("readline");

// ── Shared State ────────────────────────────────────────────
let autoMinerTimer = null;
let autoMinerActive = false;
let autoMinerConfig = { interval: config.INTERVAL, address: config.ADDRESS };
let blocksMinedSession = 0;
let autoMinerStartTime = null;
let autoMinerLogs = []; // Store recent logs in memory
const MAX_LOGS = 50;   // Keep only last 50 logs

// ── Helpers ─────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderConfig() {
  const sep = colors.muted("━".repeat(68));
  console.log(`  ${sep}`);
  console.log(`  ${colors.white.bold("  ⚙  CONFIGURATION")}`);
  console.log(`  ${sep}`);
  console.log("");
  logger.keyValue("Network", colors.success(config.NETWORK));
  logger.keyValue("RPC Host", colors.warning(config.RPCHOST));
  logger.keyValue("RPC User", colors.dim(config.RPCUSER));
  logger.keyValue("Address", colors.accent(config.ADDRESS));
  logger.keyValue("Interval", colors.info(`${config.INTERVAL}s`), "└─");
  console.log("");
}

// ── Connection Test ─────────────────────────────────────────
async function testConnection() {
  try {
    const info = await client.getBlockchainInfo();
    logger.success(
      `Connected to Bitcoin Core ${colors.muted(`(${info.chain}, height: ${info.blocks})`)}`
    );
    logger.blank();
    return true;
  } catch (err) {
    logger.error(`Failed to connect to Bitcoin Core at ${config.RPCHOST}`);
    console.log(`  ${colors.muted(`    Error: ${err.message}`)}`);
    if (err.code === "ECONNREFUSED") {
      console.log(
        `  ${colors.muted("    Make sure bitcoind is running with -regtest flag and -server=1")}`
      );
    }
    logger.blank();
    return false;
  }
}

// ── Menu Handlers ───────────────────────────────────────────
async function handleChainStatus() {
  await inspector.getChainStatus();
}

async function handleMineBlocks() {
  const count = await promptInput("Number of blocks to mine", "1");
  if (count === null) return;
  
  const address = await promptInput("Mining address", config.ADDRESS);
  if (address === null) return;

  console.log("");
  await simulator.mineBlocks(count, address);
}

async function handleSimulateReorg() {
  const wasActive = autoMinerActive;
  if (wasActive) {
    stopBackgroundMiner(true);
  }

  try {
    await simulator.simulateReorg();
  } finally {
    if (wasActive) {
      logger.info("Resuming auto miner...");
      startBackgroundMiner(autoMinerConfig.interval, autoMinerConfig.address, true);
    }
  }
}

async function handleInvalidateBlock() {
  const input = await promptInput("Block hash or height to invalidate");
  if (input === null) return;
  if (!input) {
    logger.error("No block hash or height provided.");
    return;
  }
  console.log("");
  await simulator.invalidateBlock(input);
}

async function handleReconsiderBlock() {
  const input = await promptInput("Block hash or height to reconsider");
  if (input === null) return;
  if (!input) {
    logger.error("No block hash or height provided.");
    return;
  }
  console.log("");
  await simulator.reconsiderBlock(input);
}

async function handleViewChainTips() {
  await inspector.getChainTips();
}

async function handleInspectBlock() {
  const input = await promptInput("Block hash or height", "0");
  if (input === null) return;
  console.log("");
  try {
    await inspector.getBlockDetails(input);
  } catch (err) {
    logger.error(`Failed to inspect block: ${err.message}`);
    logger.blank();
  }
}

async function handleViewTransaction() {
  const txid = await promptInput("Transaction ID (txid)");
  if (txid === null) return;
  if (!txid) {
    logger.error("No txid provided.");
    return;
  }
  console.log("");
  try {
    await inspector.getTransactionDetails(txid);
  } catch (err) {
    // Error already logged in getTransactionDetails
  }
}

async function handleAutoMiner() {
  if (autoMinerActive) {
    logger.warn("Auto miner is already running in background.");
    return;
  }

  const intervalSec = await promptInput("Mining interval (seconds)", String(config.INTERVAL));
  if (intervalSec === null) return;

  const address = await promptInput("Mining address", config.ADDRESS);
  if (address === null) return;
  
  autoMinerConfig = { interval: parseInt(intervalSec, 10), address };
  startBackgroundMiner(autoMinerConfig.interval, autoMinerConfig.address);
}

function startBackgroundMiner(intervalSec, address, isResume = false) {
  const intervalMs = intervalSec * 1000;
  if (isNaN(intervalMs) || intervalMs < 1000) {
    logger.error("Invalid interval. Minimum 1 second.");
    return;
  }

  if (!isResume) {
    autoMinerStartTime = Date.now();
    blocksMinedSession = 0;
  }

  autoMinerActive = true;
  
  if (!isResume) {
    logger.success(`Auto miner started in background (every ${intervalSec}s).`);
  }

  const mine = async () => {
    if (!autoMinerActive) return;
    try {
      const result = await client.generateToAddress(1, address);
      if (result && result.length > 0) {
        blocksMinedSession++;
        const height = await client.getBlockCount();
        const uptime = Math.floor((Date.now() - autoMinerStartTime) / 1000);
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = uptime % 60;
        const uptimeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        const logItem = {
          height,
          timestamp: new Date().toLocaleTimeString(),
          totalSession: blocksMinedSession,
          uptime: uptimeStr
        };
        
        autoMinerLogs.push(logItem);
        if (autoMinerLogs.length > MAX_LOGS) autoMinerLogs.shift();
      }
    } catch (err) {
      // Don't spam errors on interval
    }
  };

  autoMinerTimer = setInterval(mine, intervalMs);
}

function stopBackgroundMiner(isSuspending = false) {
  if (!autoMinerActive && !isSuspending) {
    logger.warn("Auto miner is not running.");
    return;
  }

  if (autoMinerTimer) {
    clearInterval(autoMinerTimer);
    autoMinerTimer = null;
  }
  
  autoMinerActive = false;
  
  if (!isSuspending) {
    logger.info("Auto miner stopped.");
  } else {
    logger.info("Auto miner suspended for simulation.");
  }
}

async function handleStopMiner() {
  stopBackgroundMiner();
}

async function handleViewLogs() {
  logger.heading("📋", "AUTO MINER LOGS");

  if (autoMinerLogs.length === 0) {
    if (autoMinerActive) {
      logger.info("Miner is active but no blocks mined yet in this session.");
    } else {
      logger.warn("Auto miner is not active and no recent logs found.");
    }
    logger.blank();
    return;
  }

  // Summary header
  const status = autoMinerActive ? colors.success("Active") : colors.error("Stopped");
  logger.keyValue("Status", status);
  logger.keyValue("Total Mined", colors.secondary.bold(String(blocksMinedSession)));
  
  if (autoMinerStartTime) {
    const uptime = Math.floor((Date.now() - autoMinerStartTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    const uptimeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    logger.keyValue("Session Time", colors.dim(uptimeStr));
  }
  
  console.log(`\n  ${colors.white.bold("  ⛏  RECENT ACTIVITY")}`);
  const sep = colors.muted("  " + "┄".repeat(64));
  console.log(sep);

  // Show last 10 logs
  const displayLogs = autoMinerLogs.slice(-10);
  for (const log of displayLogs) {
    console.log(
      `    ${colors.muted(log.timestamp)}  ` +
      `${colors.white("Block")} ${colors.white.bold(`#${log.height}`.padEnd(8))}  ` +
      `${colors.muted("│")}  ${colors.secondary(`⛏ ${log.totalSession}`.padEnd(6))} ` +
      `${colors.muted("│")}  ${colors.dim(log.uptime)}`
    );
  }
  
  console.log(sep);
  logger.blank();
}

// ── Main Loop ───────────────────────────────────────────────
async function main() {
  // Render banner
  renderBanner();

  // Show config
  renderConfig();

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  // Main menu loop
  let running = true;

  while (running) {
    renderMenu();
    const choice = await promptMenuChoice();

    console.log("");

    if (choice === null) {
      continue;
    }

    switch (choice) {
      case "1":
        await handleChainStatus();
        break;
      case "2":
        await handleMineBlocks();
        break;
      case "3":
        await handleAutoMiner();
        break;
      case "4":
        await handleStopMiner();
        break;
      case "5":
        await handleViewLogs();
        break;
      case "6":
        await handleSimulateReorg();
        break;
      case "7":
        await handleInvalidateBlock();
        break;
      case "8":
        await handleReconsiderBlock();
        break;
      case "9":
        await handleViewChainTips();
        break;
      case "10":
        await handleInspectBlock();
        break;
      case "11":
        await handleViewTransaction();
        break;
      case "0":
        running = false;
        break;
      default:
        logger.warn(`Invalid option: ${colors.muted(choice || "(empty)")}`);
        logger.blank();
        break;
    }
  }

  // Exit
  console.log("");
  const sep = colors.muted("━".repeat(68));
  console.log(`  ${sep}`);
  console.log(`  ${colors.secondary.bold("  ■ SIMULATOR STOPPED")}`);
  console.log(`  ${sep}`);
  console.log("");
  console.log(`  ${colors.muted("  Goodbye! ₿")}`);
  console.log("");
  process.exit(0);
}

// ── Graceful Shutdown ───────────────────────────────────────
process.on("SIGTERM", () => {
  process.exit(0);
});

// ── Run ─────────────────────────────────────────────────────
main().catch((err) => {
  console.error(colors.error(`\n  Fatal: ${err.message}\n`));
  process.exit(1);
});
