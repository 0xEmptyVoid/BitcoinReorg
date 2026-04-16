// ══════════════════════════════════════════════════════════════
//  Bitcoin Core RPC Client Factory
// ══════════════════════════════════════════════════════════════

const Client = require("bitcoin-core");
const config = require("./config");

const client = new Client({
  host: config.RPCHOST,
  username: config.RPCUSER,
  password: config.RPCPASSWORD,
});

module.exports = client;
