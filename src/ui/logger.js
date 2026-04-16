// ══════════════════════════════════════════════════════════════
//  Formatted Console Logger
// ══════════════════════════════════════════════════════════════

const colors = require("./colors");

function getTimestamp() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function shortHash(hash) {
  return hash || "N/A";
}

const logger = {
  success(msg) {
    console.log(`  ${colors.success("  ✓")} ${colors.white(msg)}`);
  },

  error(msg) {
    console.log(`  ${colors.error("  ✗")} ${colors.white(msg)}`);
  },

  info(msg) {
    console.log(`  ${colors.info("  ▸")} ${colors.white(msg)}`);
  },

  warn(msg) {
    console.log(`  ${colors.warning("  ⚠")} ${colors.white(msg)}`);
  },

  step(stepNum, totalSteps, msg) {
    const label = colors.secondary(`  Step ${stepNum}/${totalSteps}`);
    console.log(`  ${label}  ${colors.white(msg)}`);
  },

  separator() {
    console.log(`  ${colors.muted("━".repeat(68))}`);
  },

  heading(icon, text) {
    const sep = colors.muted("━".repeat(68));
    console.log(`  ${sep}`);
    console.log(`  ${colors.white.bold(`  ${icon}  ${text}`)}`);
    console.log(`  ${sep}`);
    console.log("");
  },

  keyValue(key, value, icon = "├─") {
    const paddedKey = key.padEnd(14);
    console.log(
      `  ${colors.info(`  ${icon}`)} ${colors.white(paddedKey)} ${colors.muted("│")} ${value}`
    );
  },

  blank() {
    console.log("");
  },

  timestamp: getTimestamp,
  shortHash,
};

module.exports = logger;
