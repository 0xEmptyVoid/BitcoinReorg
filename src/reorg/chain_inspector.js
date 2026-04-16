// ══════════════════════════════════════════════════════════════
//  Chain Inspector — Blockchain State Utilities
// ══════════════════════════════════════════════════════════════

const client = require("../rpc");
const colors = require("../ui/colors");
const logger = require("../ui/logger");

async function getChainStatus() {
  const info = await client.getBlockchainInfo();
  const bestHash = await client.getBestBlockHash();

  logger.heading("📊", "CHAIN STATUS");

  logger.keyValue("Chain", colors.success(info.chain));
  logger.keyValue("Height", colors.secondary.bold(String(info.blocks)));
  logger.keyValue("Best Block", colors.cyan(logger.shortHash(bestHash)));
  logger.keyValue("Difficulty", colors.accent(String(info.difficulty)));
  logger.keyValue("Median Time", colors.muted(new Date(info.mediantime * 1000).toLocaleString()));
  logger.keyValue("Chain Work", colors.dim(logger.shortHash(info.chainwork)), "└─");
  logger.blank();

  return info;
}

async function getBlockDetails(hashOrHeight) {
  let blockHash = hashOrHeight;

  // If it's a number, treat as height
  if (/^\d+$/.test(hashOrHeight)) {
    blockHash = await client.getBlockHash(parseInt(hashOrHeight, 10));
  }

  const block = await client.getBlock(blockHash);

  logger.heading("🔍", "BLOCK DETAILS");

  logger.keyValue("Hash", colors.cyan(logger.shortHash(block.hash)));
  logger.keyValue("Height", colors.secondary.bold(String(block.height)));
  logger.keyValue("Confirmations", colors.success(String(block.confirmations)));
  logger.keyValue("Version", colors.muted(String(block.version)));
  logger.keyValue("Timestamp", colors.muted(new Date(block.time * 1000).toLocaleString()));
  logger.keyValue("Nonce", colors.accent(String(block.nonce)));
  logger.keyValue("Bits", colors.dim(block.bits));
  logger.keyValue("Difficulty", colors.accent(String(block.difficulty)));
  logger.keyValue("Tx Count", colors.info(String(block.nTx || block.tx.length)));
  logger.keyValue("Size", colors.muted(`${block.size} bytes`));
  logger.keyValue("Weight", colors.muted(`${block.weight} WU`));

  if (block.previousblockhash) {
    logger.keyValue("Prev Hash", colors.dim(logger.shortHash(block.previousblockhash)));
  }
  if (block.nextblockhash) {
    logger.keyValue("Next Hash", colors.dim(logger.shortHash(block.nextblockhash)), "└─");
  } else {
    logger.keyValue("Next Hash", colors.muted("(chain tip)"), "└─");
  }

  logger.blank();
  return block;
}

async function getChainTips() {
  const tips = await client.getChainTips();

  logger.heading("📋", "CHAIN TIPS");

  // Table header
  const hdr =
    `  ${colors.muted("  ┌─────────────┬────────┬──────────┬──────────────────────────────────────────────────────────────────┐")}`;
  const hdrRow =
    `  ${colors.muted("  │")} ${colors.white.bold("Status".padEnd(11))} ${colors.muted("│")} ${colors.white.bold("Height".padEnd(6))} ${colors.muted("│")} ${colors.white.bold("Branches".padEnd(8))} ${colors.muted("│")} ${colors.white.bold("Block Hash".padEnd(64))} ${colors.muted("│")}`;
  const hdrSep =
    `  ${colors.muted("  ├─────────────┼────────┼──────────┼──────────────────────────────────────────────────────────────────┤")}`;

  console.log(hdr);
  console.log(hdrRow);
  console.log(hdrSep);

  for (const tip of tips) {
    let statusColor = colors.muted;
    if (tip.status === "active") statusColor = colors.success;
    else if (tip.status === "valid-fork") statusColor = colors.info;
    else if (tip.status === "valid-headers") statusColor = colors.warning;
    else if (tip.status === "invalid") statusColor = colors.error;

    const status = statusColor(tip.status.padEnd(11));
    const height = colors.secondary(String(tip.height).padEnd(6));
    const branches = colors.accent(String(tip.branchlen).padEnd(8));
    const hash = colors.cyan(logger.shortHash(tip.hash).padEnd(64));

    console.log(
      `  ${colors.muted("  │")} ${status} ${colors.muted("│")} ${height} ${colors.muted("│")} ${branches} ${colors.muted("│")} ${hash} ${colors.muted("│")}`
    );
  }

  const footer =
    `  ${colors.muted("  └─────────────┴────────┴──────────┴──────────────────────────────────────────────────────────────────┘")}`;
  console.log(footer);
  logger.blank();

  return tips;
}

async function compareChains(oldTipHash, newTipHash, forkHeight) {
  const sep = colors.muted("━".repeat(68));
  console.log(`  ${sep}`);
  console.log(`  ${colors.white.bold("  📊  CHAIN COMPARISON")}`);
  console.log(`  ${sep}`);
  console.log("");

  let oldBlock = null;
  let newBlock = null;

  try {
    oldBlock = await client.getBlock(oldTipHash);
  } catch (_) {
    // Block may be invalidated
  }

  try {
    newBlock = await client.getBlock(newTipHash);
  } catch (_) {}

  logger.keyValue("Fork Height", colors.secondary.bold(String(forkHeight)));
  logger.keyValue("Old Tip", colors.error(logger.shortHash(oldTipHash)));
  
  if (oldBlock) {
    logger.keyValue("Old Height", colors.error(String(oldBlock.height)));
  }

  logger.keyValue("New Tip", colors.success(logger.shortHash(newTipHash)));
  
  if (newBlock) {
    logger.keyValue("New Height", colors.success(String(newBlock.height)));
    const depth = newBlock.height - forkHeight;
    logger.keyValue("Reorg Depth", colors.warning.bold(`${depth} blocks`), "└─");
  }

  logger.blank();
}

async function getTransactionDetails(txid) {
  let tx = null;
  let methodUsed = "getrawtransaction";

  try {
    // 1. Try getrawtransaction (standard, works for all txs if txindex=1)
    tx = await client.getRawTransaction(txid, true);
  } catch (err) {
    const errMsg = err.message || "";
    
    // 2. If it fails due to txindex, try gettransaction (works for wallet txs without txindex)
    if (errMsg.includes("Use -txindex") || errMsg.includes("No such mempool transaction")) {
      try {
        const walletTx = await client.getTransaction(txid);
        if (walletTx && walletTx.hex) {
          // Decode the hex to get the same structure as getrawtransaction
          const decoded = await client.decodeRawTransaction(walletTx.hex);
          tx = {
            ...decoded,
            confirmations: walletTx.confirmations,
            blockhash: walletTx.blockhash,
            time: walletTx.time,
            blocktime: walletTx.blocktime
          };
          methodUsed = "gettransaction + decoderawtransaction";
        }
      } catch (innerErr) {
        // If both fail, throw the original error or a combined one
        if (innerErr.message.includes("Invalid or non-wallet transaction id")) {
           // Fall through to original error handling
        } else {
          logger.error(`Fallback failed: ${innerErr.message}`);
        }
      }
    }

    if (!tx) {
      if (errMsg.includes("No such mempool or blockchain transaction")) {
        logger.error("Transaction not found.");
        console.log(`  ${colors.muted("    (Tip: If this is an old non-wallet transaction, you need 'txindex=1' in bitcoind.conf)")}`);
      } else {
        logger.error(`Failed to get transaction: ${errMsg}`);
      }
      logger.blank();
      return null;
    }
  }

  logger.heading("📑", "TRANSACTION DETAILS");

  logger.keyValue("TXID", colors.cyan(logger.shortHash(tx.txid)));
  logger.keyValue("Method", colors.dim(methodUsed));
  logger.keyValue("Size", colors.muted(`${tx.size || tx.vsize} bytes`));
  logger.keyValue("VSize", colors.muted(`${tx.vsize} vbytes`));
  logger.keyValue("Weight", colors.muted(`${tx.weight || "(unknown)"} WU`));
  logger.keyValue("Version", colors.muted(String(tx.version)));
  logger.keyValue("Locktime", colors.muted(String(tx.locktime)));

  if (tx.blockhash) {
    logger.keyValue("In Block", colors.info(logger.shortHash(tx.blockhash)));
    logger.keyValue("Confirmations", colors.success(String(tx.confirmations)));
    logger.keyValue("Time", colors.muted(new Date(tx.time * 1000).toLocaleString()));
  } else {
    logger.keyValue("Status", colors.warning("In Mempool (0 confirmations)"));
  }

  // Inputs (vin)
  console.log(`\n  ${colors.white.bold("  📥  INPUTS")} ${colors.muted(`(${tx.vin.length})`)}`);
  tx.vin.forEach((vin, i) => {
    const label = `Input ${i}`;
    if (vin.coinbase) {
      logger.keyValue(label, colors.accent("Coinbase"), "├─");
    } else {
      logger.keyValue(label, colors.dim(`${logger.shortHash(vin.txid)} [${vin.vout}]`), "├─");
    }
  });

  // Outputs (vout)
  console.log(`\n  ${colors.white.bold("  📤  OUTPUTS")} ${colors.muted(`(${tx.vout.length})`)}`);
  let totalValue = 0;
  tx.vout.forEach((vout, i) => {
    const label = `Output ${i}`;
    const value = vout.value;
    totalValue += value;
    
    let address = "N/A";
    if (vout.scriptPubKey.address) address = vout.scriptPubKey.address;
    else if (vout.scriptPubKey.addresses) address = vout.scriptPubKey.addresses[0];

    logger.keyValue(label, `${colors.success(value.toFixed(8))} BTC ${colors.muted("→")} ${colors.accent(address)}`, i === tx.vout.length - 1 ? "└─" : "├─");
  });

  console.log(`\n  ${colors.info("  Σ")} ${colors.white("Total Out ")} ${colors.muted("│")} ${colors.success.bold(totalValue.toFixed(8))} BTC`);
  logger.blank();

  return tx;
}

module.exports = {
  getChainStatus,
  getBlockDetails,
  getChainTips,
  compareChains,
  getTransactionDetails,
};
