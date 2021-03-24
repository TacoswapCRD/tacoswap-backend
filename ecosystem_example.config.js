module.exports = {
    apps : [{
      name: "tacoswap-backend",
      script: "./server.js",
      env: {
        NODE_ENV: "staging",
        INFURA_URL: "wss://mainnet.infura.io/ws/v3/1298egwsqh71o2ytwf812",
        MASTER_CONTRACT_ADDRESS: "",
        WETH: "",
        PORT: "3000",
        DEBUG: "farm-explorer:server",
      },
    }]
  }
