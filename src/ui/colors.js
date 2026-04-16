// ══════════════════════════════════════════════════════════════
//  Shared Color Palette
// ══════════════════════════════════════════════════════════════

const chalk = require("chalk");

const colors = {
  primary: chalk.hex("#F7931A"),    // Bitcoin orange
  secondary: chalk.hex("#FFD700"),  // Gold
  success: chalk.hex("#00E676"),    // Bright green
  error: chalk.hex("#FF5252"),      // Red
  warning: chalk.hex("#FFB74D"),    // Amber
  info: chalk.hex("#40C4FF"),       // Light blue
  muted: chalk.hex("#6B7280"),      // Gray
  white: chalk.hex("#F8F9FA"),      // Off-white
  accent: chalk.hex("#BB86FC"),     // Purple
  dim: chalk.hex("#4A4A4A"),        // Dark gray
  cyan: chalk.hex("#00BCD4"),       // Cyan
  separator: chalk.hex("#333333"),  // Dark separator
  pink: chalk.hex("#FF6EC7"),       // Hot pink
  lime: chalk.hex("#76FF03"),       // Lime green
};

module.exports = colors;
