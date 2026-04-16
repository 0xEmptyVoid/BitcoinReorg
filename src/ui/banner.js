// ══════════════════════════════════════════════════════════════
//  ASCII Banner — REORG SIM
// ══════════════════════════════════════════════════════════════

const colors = require("./colors");

function renderBanner() {
  console.clear();

  const W = 110; // Expanded width for the new title
  const border = "═".repeat(W);
  
  // ASCII for BITCOIN REORG
  const titleLines = [
    " ██████╗ ██╗████████╗ ██████╗  ██████╗ ██╗███╗   ██╗    ██████╗ ███████╗ ██████╗ ██████╗  ██████╗ ",
    " ██╔══██╗██║╚══██╔══╝██╔════╝ ██╔═══██╗██║████╗  ██║    ██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝ ",
    " ██████╔╝██║   ██║   ██║      ██║   ██║██║██╔██╗ ██║    ██████╔╝█████╗  ██║   ██║██████╔╝██║  ███╗",
    " ██╔══██╗██║   ██║   ██║      ██║   ██║██║██║╚██╗██║    ██╔══██╗██╔══╝  ██║   ██║██╔══██╗██║   ██║",
    " ██████╔╝██║   ██║   ╚██████╗ ╚██████╔╝██║██║ ╚████║    ██║  ██║███████╗╚██████╔╝██║  ██║╚██████╔╝",
    " ╚═════╝ ╚═╝   ╚═╝    ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ",
  ];

  const subtitle = "⚡ Bitcoin Regtest Reorg Simulator v1.0.0 ⚡";

  console.log("");
  console.log(colors.primary(`  ╔${border}╗`));

  // Top padding
  console.log(colors.primary("  ║") + " ".repeat(W) + colors.primary("║"));

  // Title lines with precise centering
  for (const line of titleLines) {
    const textLen = line.length;
    const leftPad = Math.floor((W - textLen) / 2);
    const rightPad = W - textLen - leftPad;

    console.log(
      colors.primary("  ║") +
        " ".repeat(leftPad) +
        colors.secondary.bold(line) +
        " ".repeat(rightPad) +
        colors.primary("║"),
    );
  }

  // Middle padding
  console.log(colors.primary("  ║") + " ".repeat(W) + colors.primary("║"));

  // Subtitle with precise centering
  {
    const textLen = subtitle.length;
    const leftPad = Math.floor((W - textLen) / 2);
    const rightPad = W - textLen - leftPad - 2;

    console.log(
      colors.primary("  ║") +
        " ".repeat(leftPad) +
        colors.info(subtitle) +
        " ".repeat(rightPad) +
        colors.primary("║"),
    );
  }

  // Bottom padding
  console.log(colors.primary("  ║") + " ".repeat(W) + colors.primary("║"));

  console.log(colors.primary(`  ╚${border}╝`));
  console.log("");
}

module.exports = { renderBanner };
