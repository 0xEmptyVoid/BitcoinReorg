// ══════════════════════════════════════════════════════════════
//  Bitcoin Regtest Auto-Miner (JavaScript Version)
//  Uses bitcoin-core library
//  Reads configuration from bitcoin-cli.conf
// ══════════════════════════════════════════════════════════════

const chalk = require("chalk");
const figlet = require("figlet");
const chalkAnimation = require("chalk-animation");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const config = require("./src/config");
const client = require("./src/rpc");

// ── Configuration ────────────────────────────────────────────
const RPCUSER = config.RPCUSER;
const RPCPASSWORD = config.RPCPASSWORD;
const RPCHOST = config.RPCHOST;
const NETWORK = config.NETWORK;
const ADDRESS = config.ADDRESS;
const INTERVAL = config.INTERVAL * 1000; // Convert to ms

// ── State ────────────────────────────────────────────────────
let blocksMined = 0;
let errors = 0;
const startTime = Date.now();
let miningInterval = null;

// ── Color Palette ────────────────────────────────────────────
const colors = {
  primary: chalk.hex("#F7931A"), // Bitcoin orange
  secondary: chalk.hex("#FFD700"), // Gold
  success: chalk.hex("#00E676"), // Bright green
  error: chalk.hex("#FF5252"), // Red
  warning: chalk.hex("#FFB74D"), // Amber
  info: chalk.hex("#40C4FF"), // Light blue
  muted: chalk.hex("#6B7280"), // Gray
  white: chalk.hex("#F8F9FA"), // Off-white
  accent: chalk.hex("#BB86FC"), // Purple
  dim: chalk.hex("#4A4A4A"), // Dark gray
  cyan: chalk.hex("#00BCD4"), // Cyan
  separator: chalk.hex("#333333"), // Dark separator
};

// ── Helpers ──────────────────────────────────────────────────
function getTimestamp() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function getUptime() {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shortHash(hash) {
  if (!hash || hash.length < 24) return hash || "N/A";
  return `${hash.substring(0, 16)}...${hash.substring(hash.length - 8)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Banner ───────────────────────────────────────────────────
function pad(str, width) {
  // Strip ANSI codes for length calculation
  const stripped = str.replace(/\x1B\[[0-9;]*m/g, "");
  const padding = Math.max(0, width - stripped.length);
  return str + " ".repeat(padding);
}

function renderBanner() {
  console.clear();

  const W = 96; // inner width (fits full BITCOIN MINER title)
  const border = "═".repeat(W);

  const titleLines = [
    " ██████╗ ██╗████████╗ ██████╗ ██████╗ ██╗███╗   ██╗  ███╗   ███╗██╗███╗   ██╗███████╗██████╗ ",
    " ██╔══██╗██║╚══██╔══╝██╔════╝██╔═══██╗██║████╗  ██║  ████╗ ████║██║████╗  ██║██╔════╝██╔══██╗",
    " ██████╔╝██║   ██║   ██║     ██║   ██║██║██╔██╗ ██║  ██╔████╔██║██║██╔██╗ ██║█████╗  ██████╔╝",
    " ██╔══██╗██║   ██║   ██║     ██║   ██║██║██║╚██╗██║  ██║╚██╔╝██║██║██║╚██╗██║██╔══╝  ██╔══██╗",
    " ██████╔╝██║   ██║   ╚██████╗╚██████╔╝██║██║ ╚████║  ██║ ╚═╝ ██║██║██║ ╚████║███████╗██║  ██║",
    " ╚═════╝ ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝  ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝",
  ];

  const subtitle = "⛏  Regtest Block Generator v1.0.0  ⛏";

  // ── Render ──
  console.log("");
  console.log(colors.primary(`  ╔${border}╗`));

  // Title: BITCOIN MINER (horizontal)
  for (const line of titleLines) {
    const stripped = line.length;
    const leftPad = Math.max(0, Math.floor((W - stripped) / 2));
    const rightPad = Math.max(0, W - stripped - leftPad);
    console.log(
      colors.primary("  ║") +
        " ".repeat(leftPad) +
        colors.primary.bold(line) +
        " ".repeat(rightPad) +
        colors.primary("║"),
    );
  }

  // Subtitle
  {
    const leftPad = Math.floor((W - subtitle.length) / 2);
    const rightPad = W - subtitle.length - leftPad;
    console.log(
      colors.primary("  ║") +
        " ".repeat(leftPad) +
        colors.info(subtitle) +
        " ".repeat(rightPad) +
        colors.primary("║"),
    );
  }

  console.log(colors.primary(`  ╚${border}╝`));
  console.log("");
}

function renderConfig() {
  const sep = colors.muted("━".repeat(68));
  console.log(`  ${sep}`);
  console.log(`  ${colors.white.bold("  ⚙  CONFIGURATION")}`);
  console.log(`  ${sep}`);
  console.log("");
  console.log(
    `  ${colors.info("  ├─")} ${colors.white("Network")}    ${colors.muted("│")} ${colors.success(NETWORK)}`,
  );
  console.log(
    `  ${colors.info("  ├─")} ${colors.white("RPC Host")}   ${colors.muted("│")} ${colors.warning(`${RPCHOST}`)}`,
  );
  console.log(
    `  ${colors.info("  ├─")} ${colors.white("RPC User")}   ${colors.muted("│")} ${colors.dim(RPCUSER)}`,
  );
  console.log(
    `  ${colors.info("  ├─")} ${colors.white("Address")}    ${colors.muted("│")} ${colors.accent(ADDRESS)}`,
  );
  console.log(
    `  ${colors.info("  └─")} ${colors.white("Interval")}   ${colors.muted("│")} ${colors.info(`${INTERVAL / 1000}s`)}`,
  );
  console.log("");
}

function renderMiningHeader() {
  const sep = colors.muted("━".repeat(68));
  console.log(`  ${sep}`);
  console.log(`  ${colors.white.bold("  ⛏  MINING LOG")}`);
  console.log(`  ${sep}`);
  console.log("");
}

// ── Mining ───────────────────────────────────────────────────
async function mineBlock() {
  try {
    const result = await client.generateToAddress(1, ADDRESS);

    if (result && result.length > 0) {
      blocksMined++;
      const blockHash = result[0];

      // Get current block height
      let height = "?";
      try {
        height = await client.getBlockCount();
      } catch (_) {}

      const ts = colors.muted(getTimestamp());
      const blk = `${colors.white("Block")} ${colors.white.bold(`#${height}`)}`;
      const hash = colors.cyan(shortHash(blockHash));
      const mined = colors.secondary(`⛏ ${blocksMined}`);
      const uptime = colors.dim(getUptime());
      const sep = colors.muted("│");

      console.log(
        `  ${colors.success("  ✓")} ${ts}  ${blk}  ${sep}  ${hash}  ${sep}  ${mined}  ${sep}  ${uptime}`,
      );
    }
  } catch (err) {
    errors++;
    const ts = colors.muted(getTimestamp());
    const errMsg = err.message || "Connection failed";
    const shortErr =
      errMsg.length > 40 ? errMsg.substring(0, 40) + "..." : errMsg;
    console.log(
      `  ${colors.error("  ✗")} ${ts}  ${colors.error(`Error: ${shortErr}`)}  ${colors.muted("│")}  ${colors.error(`Errors: ${errors}`)}`,
    );
  }
}

// ── Graceful Shutdown ────────────────────────────────────────
function showSummary() {
  console.log("");
  console.log("");
  const sep = colors.muted("━".repeat(68));
  console.log(`  ${sep}`);
  console.log(`  ${colors.secondary.bold("  ■ MINING STOPPED")}`);
  console.log(`  ${sep}`);
  console.log("");
  console.log(
    `  ${colors.info("  ├─")} ${colors.white("Blocks Mined")}  ${colors.muted("│")} ${colors.success(String(blocksMined))}`,
  );
  console.log(
    `  ${colors.info("  ├─")} ${colors.white("Errors")}        ${colors.muted("│")} ${colors.error(String(errors))}`,
  );
  console.log(
    `  ${colors.info("  └─")} ${colors.white("Uptime")}        ${colors.muted("│")} ${colors.secondary(getUptime())}`,
  );
  console.log("");
  console.log(`  ${colors.muted("  Goodbye! ₿")}`);
  console.log("");
  process.exit(0);
}

process.on("SIGINT", showSummary);
process.on("SIGTERM", showSummary);

// ── Address Input Prompt ─────────────────────────────────────
async function promptAddress() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = `  ${colors.info("  ?")} ${colors.white("Miner address")} ${colors.muted(`(${ADDRESS})`)}${colors.white(":")} `;

    rl.question(prompt, (answer) => {
      rl.close();
      const trimmed = (answer || "").trim();
      resolve(trimmed || null);
    });
  });
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  // Render the banner
  renderBanner();

  // Brief animated subtitle
  const anim = chalkAnimation.pulse(
    "           ₿  Bitcoin Miner — Powering the Regtest Network  ₿",
  );
  await sleep(2000);
  anim.stop();

  // Render configuration
  renderConfig();

  // Prompt for address override
  const inputAddress = await promptAddress();
  if (inputAddress) {
    // Override the address (we reassign via a mutable wrapper)
    Object.defineProperty(global, "__MINER_ADDRESS__", { value: inputAddress });
  }
  const MINING_ADDRESS = inputAddress || ADDRESS;

  console.log("");
  console.log(
    `  ${colors.info("  ▸")} ${colors.white("Starting miner...")}  ${colors.muted(`→ ${MINING_ADDRESS}`)}`,
  );
  console.log("");

  // Test connection
  try {
    const info = await client.getBlockchainInfo();
    console.log(
      `  ${colors.success("  ✓")} ${colors.white("Connected to Bitcoin Core")} ${colors.muted(`(${info.chain}, height: ${info.blocks})`)}`,
    );
    console.log("");
  } catch (err) {
    console.log(
      `  ${colors.error("  ✗")} ${colors.white(`Failed to connect to Bitcoin Core at ${RPCHOST}`)}`,
    );
    console.log(`  ${colors.muted(`    Error Detail: ${err.message}`)}`);
    if (err.code === "ECONNREFUSED") {
      console.log(
        `  ${colors.muted("    Make sure bitcoind is running with -regtest flag and -server=1")}`,
      );
    }
    console.log("");
    process.exit(1);
  }

  // Mining header
  renderMiningHeader();

  // Override address for the mining function
  const originalGenerateToAddress = client.generateToAddress.bind(client);
  client.generateToAddress = (nblocks, _addr, ...rest) => {
    return originalGenerateToAddress(nblocks, MINING_ADDRESS, ...rest);
  };

  // Start mining loop
  const mine = async () => {
    await mineBlock();
  };

  // Initial mine
  await mine();

  // Continue on interval
  miningInterval = setInterval(async () => {
    await mine();
  }, INTERVAL);
}

// ── Run ──────────────────────────────────────────────────────
main().catch((err) => {
  console.error(colors.error(`\n  Fatal: ${err.message}\n`));
  process.exit(1);
});
