
// import { HardhatUserConfig } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";
// import "@openzeppelin/hardhat-upgrades";
// const config: HardhatUserConfig = {
//   solidity: "0.8.17",
// };

// export default config;


import { HardhatUserConfig, task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-toolbox";
// import "@nomiclabs/hardhat-waffle";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      // url: 'http://127.0.0.1:5500/', // YOUR RPC URL
      // accounts: ['0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'] // YOUR PRIVATE KEY
    }
  }
};
