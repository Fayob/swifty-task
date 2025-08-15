import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    "mantle-testnet": {
      url: process.env.MANTLE_RPC_URL || "https://rpc.testnet.mantle.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: process.env.MANTLE_RPC_URL ? 5003 : 5001,
    }
  }
};

export default config;
