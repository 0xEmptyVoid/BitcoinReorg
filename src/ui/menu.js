// ══════════════════════════════════════════════════════════════
//  Interactive Menu System
// ══════════════════════════════════════════════════════════════

const readline = require("readline");
const colors = require("./colors");

const MENU_ITEMS = [
  {
    key: "1",
    label: "Chain Status",
    icon: "📊",
    desc: "View current blockchain info",
  },
  {
    key: "2",
    label: "Mine Blocks",
    icon: "⛏ ",
    desc: "Mine N blocks to an address",
  },
  {
    key: "3",
    label: "Start Auto Miner",
    icon: "🚀",
    desc: "Run mining in background",
  },
  {
    key: "4",
    label: "Stop Auto Miner",
    icon: "🛑",
    desc: "Stop background mining",
  },
  {
    key: "5",
    label: "Auto Miner Logs",
    icon: "📋",
    desc: "View background mining logs",
  },
  {
    key: "6",
    label: "Simulate Reorg",
    icon: "🔄",
    desc: "Guided reorg simulation",
  },
  {
    key: "7",
    label: "Invalidate Block",
    icon: "❌",
    desc: "Invalidate a block by hash/height",
  },
  {
    key: "8",
    label: "Reconsider Block",
    icon: "✅",
    desc: "Reconsider an invalidated block",
  },
  {
    key: "9",
    label: "View Chain Tips",
    icon: "📋",
    desc: "Show all chain tips",
  },
  { key: "10", label: "Inspect Block", icon: "🔍", desc: "View block details" },
  {
    key: "11",
    label: "View Transaction",
    icon: "📑",
    desc: "View transaction details",
  },
  { key: "0", label: "Exit", icon: "🚪", desc: "Quit the simulator" },
];

function renderMenu() {
  const sep = colors.muted("━".repeat(68));
  console.log(`  ${sep}`);
  console.log(`  ${colors.white.bold("  ₿  MAIN MENU")}`);
  console.log(`  ${sep}`);
  console.log("");

  for (const item of MENU_ITEMS) {
    const paddedKey = item.key.padStart(2);
    const keyStr = colors.secondary.bold(`  [${paddedKey}]`);
    const icon = item.icon;
    const label = colors.white.bold(item.label.padEnd(21)); // Increased padding for icons
    const desc = colors.muted(item.desc);
    console.log(`  ${keyStr}  ${icon} ${label} ${desc}`);
  }

  console.log("");
  console.log(`  ${sep}`);
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    let isResolved = false;

    // Handle Ctrl+C (SIGINT)
    rl.on("SIGINT", () => {
      isResolved = true;
      rl.close();
      console.log(colors.muted(" (Cancelled)"));
      resolve(null);
    });

    // Handle Ctrl+D (Close/EOF)
    rl.on("close", () => {
      // If we haven't resolved yet, it means EOF (Ctrl+D) was pressed
      if (!isResolved) {
        console.log("");
        console.log(`  ${colors.muted("  EOF received. Goodbye! ₿")}`);
        process.exit(0);
      }
    });

    rl.question(question, (answer) => {
      isResolved = true;
      rl.close();
      resolve((answer || "").trim());
    });
  });
}

async function promptMenuChoice() {
  const answer = await prompt(
    `  ${colors.info("  ?")} ${colors.white("Select option")}${colors.white(":")} `,
  );
  return answer;
}

async function promptInput(label, defaultValue) {
  const defText = defaultValue ? colors.muted(` (${defaultValue})`) : "";
  const answer = await prompt(
    `  ${colors.info("  ?")} ${colors.white(label)}${defText}${colors.white(":")} `,
  );
  return answer || defaultValue || "";
}

async function promptConfirm(label) {
  const answer = await prompt(
    `  ${colors.warning("  ?")} ${colors.white(label)} ${colors.muted("(y/n)")}${colors.white(":")} `,
  );
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

module.exports = {
  MENU_ITEMS,
  renderMenu,
  prompt,
  promptMenuChoice,
  promptInput,
  promptConfirm,
};
