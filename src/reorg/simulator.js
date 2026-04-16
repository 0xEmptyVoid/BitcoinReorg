// ══════════════════════════════════════════════════════════════
//  Reorg Simulator — Core Simulation Logic
// ══════════════════════════════════════════════════════════════

const client = require("../rpc");
const config = require("../config");
const colors = require("../ui/colors");
const logger = require("../ui/logger");
const { promptInput, promptConfirm } = require("../ui/menu");
const inspector = require("./chain_inspector");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mine Blocks ─────────────────────────────────────────────
async function mineBlocks(count, address) {
  const addr = address || config.ADDRESS;
  const n = parseInt(count, 10);

  if (isNaN(n) || n < 1) {
    logger.error("Invalid block count. Must be >= 1.");
    return [];
  }

  logger.heading("⛏ ", "MINING BLOCKS");
  logger.info(`Mining ${colors.secondary.bold(String(n))} block(s) to ${colors.accent(addr)}`);
  logger.blank();

  const hashes = [];

  for (let i = 0; i < n; i++) {
    try {
      const result = await client.generateToAddress(1, addr);
      if (result && result.length > 0) {
        const hash = result[0];
        hashes.push(hash);

        let height = "?";
        try {
          height = await client.getBlockCount();
        } catch (_) {}

        const ts = colors.muted(logger.timestamp());
        const blk = `${colors.white("Block")} ${colors.white.bold(`#${height}`)}`;
        const hashStr = colors.cyan(logger.shortHash(hash));

        console.log(`  ${colors.success("  ✓")} ${ts}  ${blk}  ${colors.muted("│")}  ${hashStr}`);
      }
    } catch (err) {
      logger.error(`Mining failed: ${err.message}`);
    }
  }

  logger.blank();
  logger.success(`Mined ${colors.secondary.bold(String(hashes.length))} block(s) successfully`);
  logger.blank();

  return hashes;
}

// ── Invalidate Block ────────────────────────────────────────
async function invalidateBlock(hashOrHeight) {
  let blockHash = hashOrHeight;

  // If height, resolve to hash
  if (/^\d+$/.test(hashOrHeight)) {
    try {
      blockHash = await client.getBlockHash(parseInt(hashOrHeight, 10));
    } catch (err) {
      logger.error(`Cannot find block at height ${hashOrHeight}: ${err.message}`);
      return false;
    }
  }

  logger.heading("❌", "INVALIDATE BLOCK");

  try {
    // Get block info before invalidation
    let blockInfo = null;
    try {
      blockInfo = await client.getBlock(blockHash);
    } catch (_) {}

    await client.command("invalidateblock", blockHash);

    logger.success(`Block invalidated successfully`);
    logger.keyValue("Hash", colors.error(logger.shortHash(blockHash)));
    if (blockInfo) {
      logger.keyValue("Height", colors.error(String(blockInfo.height)));
    }

    // Show new chain state
    const newHeight = await client.getBlockCount();
    const newBest = await client.getBestBlockHash();
    logger.keyValue("New Height", colors.success(String(newHeight)));
    logger.keyValue("New Tip", colors.success(logger.shortHash(newBest)), "└─");
    logger.blank();

    return true;
  } catch (err) {
    logger.error(`Failed to invalidate block: ${err.message}`);
    logger.blank();
    return false;
  }
}

// ── Reconsider Block ────────────────────────────────────────
async function reconsiderBlock(hashOrHeight) {
  let blockHash = hashOrHeight;

  if (/^\d+$/.test(hashOrHeight)) {
    try {
      blockHash = await client.getBlockHash(parseInt(hashOrHeight, 10));
    } catch (err) {
      logger.error(`Cannot find block at height ${hashOrHeight}: ${err.message}`);
      return false;
    }
  }

  logger.heading("✅", "RECONSIDER BLOCK");

  try {
    await client.command("reconsiderblock", blockHash);

    logger.success(`Block reconsidered successfully`);
    logger.keyValue("Hash", colors.success(logger.shortHash(blockHash)));

    // Show new chain state
    const newHeight = await client.getBlockCount();
    const newBest = await client.getBestBlockHash();
    logger.keyValue("New Height", colors.secondary.bold(String(newHeight)));
    logger.keyValue("New Tip", colors.success(logger.shortHash(newBest)), "└─");
    logger.blank();

    return true;
  } catch (err) {
    logger.error(`Failed to reconsider block: ${err.message}`);
    logger.blank();
    return false;
  }
}

// ── Full Reorg Simulation ───────────────────────────────────
async function simulateReorg() {
  const W = 68;
  const border = "═".repeat(W);

  console.log("");
  console.log(colors.primary(`  ╔${border}╗`));
  console.log(
    colors.primary("  ║") +
      " ".repeat(Math.floor((W - 32) / 2)) +
      colors.secondary.bold("🔄 REORG SIMULATION WIZARD 🔄") +
      " ".repeat(W - Math.floor((W - 32) / 2) - 32) +
      colors.primary("║")
  );
  console.log(colors.primary(`  ╚${border}╝`));
  console.log("");

  // ── Step 1: Snapshot ──────────────────────────────────────
  logger.step(1, 6, "Snapshot current chain state");
  console.log("");

  const preInfo = await client.getBlockchainInfo();
  const preBestHash = await client.getBestBlockHash();
  const preHeight = preInfo.blocks;

  logger.keyValue("Height", colors.secondary.bold(String(preHeight)));
  logger.keyValue("Tip", colors.cyan(logger.shortHash(preBestHash)), "└─");
  console.log("");

  // ── Step 2: Configure ─────────────────────────────────────
  logger.step(2, 6, "Configure reorg parameters");
  console.log("");

  const preReorgCount = await promptInput(
    "Blocks to mine on current chain (pre-reorg)",
    "3"
  );
  if (preReorgCount === null) return;

  const altChainCount = await promptInput(
    "Blocks to mine on alternate chain (must be > pre-reorg to trigger reorg)",
    "5"
  );
  if (altChainCount === null) return;

  const intervalSec = await promptInput(
    "Mining interval/delay between blocks (seconds)",
    "2"
  );
  if (intervalSec === null) return;

  const mineAddress = await promptInput(
    "Mining address",
    config.ADDRESS
  );
  if (mineAddress === null) return;

  const nPreReorg = parseInt(preReorgCount, 10);
  const nAltChain = parseInt(altChainCount, 10);
  const nIntervalMs = parseInt(intervalSec, 10) * 1000;

  if (isNaN(nPreReorg) || nPreReorg < 1 || isNaN(nAltChain) || nAltChain < 1 || isNaN(nIntervalMs)) {
    logger.error("Invalid parameters. Must be positive integers.");
    return;
  }

  if (nAltChain <= nPreReorg) {
    logger.warn(
      `Alt chain (${nAltChain}) should be longer than pre-reorg (${nPreReorg}) to trigger reorg.`
    );
    const proceed = await promptConfirm("Continue anyway?");
    if (proceed === null || !proceed) {
      logger.info("Simulation cancelled.");
      return;
    }
  }

  console.log("");

  // ── Step 3: Mine pre-reorg blocks ─────────────────────────
  logger.step(3, 6, `Mining ${nPreReorg} pre-reorg block(s)...`);
  console.log("");

  const preReorgHashes = [];
  for (let i = 0; i < nPreReorg; i++) {
    if (i > 0) await sleep(nIntervalMs);
    try {
      const result = await client.generateToAddress(1, mineAddress);
      if (result && result.length > 0) {
        preReorgHashes.push(result[0]);
        const height = await client.getBlockCount();
        console.log(
          `  ${colors.success("  ✓")} ${colors.muted(logger.timestamp())}  ${colors.white("Block")} ${colors.white.bold(`#${height}`)}  ${colors.muted("│")}  ${colors.cyan(logger.shortHash(result[0]))}`
        );
      }
    } catch (err) {
      logger.error(`Mining error: ${err.message}`);
    }
  }

  console.log("");

  const forkHeight = preHeight; // The point where we'll fork
  const oldTipHash = await client.getBestBlockHash();
  const oldHeight = await client.getBlockCount();

  logger.info(
    `Pre-reorg chain: height ${colors.secondary(String(preHeight))} → ${colors.secondary.bold(String(oldHeight))}`
  );
  console.log("");

  // ── Step 4: Invalidate to create fork ─────────────────────
  logger.step(4, 6, "Invalidating blocks to create fork point...");
  console.log("");

  // Invalidate the first pre-reorg block (at forkHeight + 1)
  const forkBlockHash = preReorgHashes[0];

  try {
    await client.command("invalidateblock", forkBlockHash);

    const newHeightAfterInvalidate = await client.getBlockCount();
    logger.success(
      `Invalidated block at height ${colors.error(String(forkHeight + 1))}`
    );
    logger.keyValue("Invalidated", colors.error(logger.shortHash(forkBlockHash)));
    logger.keyValue("Chain height", colors.warning(String(newHeightAfterInvalidate)), "└─");
    console.log("");
    
    // Give the node a moment to settle after invalidation
    logger.info("Waiting for node to settle chain state...");
    await sleep(1000);
    console.log("");
  } catch (err) {
    logger.error(`Failed to invalidate: ${err.message}`);
    return;
  }

  // ── Step 5: Mine alternate chain ──────────────────────────
  logger.step(5, 6, `Mining ${nAltChain} block(s) on alternate chain...`);
  console.log("");

  const altHashes = [];
  for (let i = 0; i < nAltChain; i++) {
    if (i > 0) await sleep(nIntervalMs);
    try {
      const result = await client.generateToAddress(1, mineAddress);
      if (result && result.length > 0) {
        altHashes.push(result[0]);
        const height = await client.getBlockCount();
        console.log(
          `  ${colors.lime("  ✓")} ${colors.muted(logger.timestamp())}  ${colors.white("Block")} ${colors.lime(`#${height}'`)}  ${colors.muted("│")}  ${colors.cyan(logger.shortHash(result[0]))}`
        );
      }
    } catch (err) {
      logger.error(`Mining error: ${err.message}`);
    }
  }

  console.log("");

  // ── Step 6: Summary ───────────────────────────────────────
  logger.step(6, 6, "Reorg Complete!");
  console.log("");

  const newTipHash = await client.getBestBlockHash();
  const newHeight = await client.getBlockCount();

  // Summary box
  const S = 84;
  const sBorder = "═".repeat(S);

  console.log(colors.secondary(`  ╔${sBorder}╗`));

  const summaryTitle = "REORG SUMMARY";
  const stPad = Math.floor((S - summaryTitle.length) / 2);
  console.log(
    colors.secondary("  ║") +
      " ".repeat(stPad) +
      colors.secondary.bold(summaryTitle) +
      " ".repeat(S - stPad - summaryTitle.length) +
      colors.secondary("║")
  );

  console.log(colors.secondary(`  ╠${sBorder}╣`));

  function summaryRow(label, value) {
    const paddedLabel = label.padEnd(16);
    const content = `  ${paddedLabel} │ ${value}`;
    const stripped = content.replace(/\x1B\[[0-9;]*m/g, "");
    const rPad = Math.max(0, S - stripped.length);
    console.log(
      colors.secondary("  ║") +
        `  ${colors.white(paddedLabel)} ${colors.muted("│")} ${value}` +
        " ".repeat(rPad) +
        colors.secondary("║")
    );
  }

  summaryRow("Fork Height", colors.secondary.bold(String(forkHeight)));
  summaryRow("Old Chain", colors.error(`${oldHeight} (${nPreReorg} blocks)`));
  summaryRow("New Chain", colors.success(`${newHeight} (${nAltChain} blocks)`));
  summaryRow("Depth", colors.warning.bold(`${nPreReorg} block(s) replaced`));
  summaryRow("Old Tip", colors.error(logger.shortHash(oldTipHash)));
  summaryRow("New Tip", colors.success(logger.shortHash(newTipHash)));

  console.log(colors.secondary(`  ╚${sBorder}╝`));
  console.log("");

  // View chain tips
  const viewTips = await promptConfirm("View chain tips?");
  if (viewTips === null) return;
  if (viewTips) {
    await inspector.getChainTips();
  }

  // Offer to reconsider
  const doReconsider = await promptConfirm("Reconsider invalidated blocks (restore original chain)?");
  if (doReconsider === null) return;
  if (doReconsider) {
    try {
      await client.command("reconsiderblock", forkBlockHash);
      logger.success("Invalidated blocks reconsidered — original chain restored if longer.");

      const finalHeight = await client.getBlockCount();
      const finalTip = await client.getBestBlockHash();
      logger.keyValue("Final Height", colors.secondary.bold(String(finalHeight)));
      logger.keyValue("Final Tip", colors.success(logger.shortHash(finalTip)), "└─");
      logger.blank();
    } catch (err) {
      logger.error(`Reconsider failed: ${err.message}`);
    }
  }
}

module.exports = {
  mineBlocks,
  invalidateBlock,
  reconsiderBlock,
  simulateReorg,
};
