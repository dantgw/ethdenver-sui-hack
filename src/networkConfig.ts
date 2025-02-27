import { createNetworkConfig } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import {
  DEVNET_COUNTER_PACKAGE_ID,
  MAINNET_COUNTER_PACKAGE_ID,
  TESTNET_COUNTER_PACKAGE_ID,
  TESTNET_GAME_STORE_PACKAGE_ID,
} from "./constants.ts";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        counterPackageId: DEVNET_COUNTER_PACKAGE_ID,
        gameStorePackageId: "0xTODO", // Add your devnet package ID here
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        counterPackageId: TESTNET_COUNTER_PACKAGE_ID,
        gameStorePackageId: TESTNET_GAME_STORE_PACKAGE_ID,
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        counterPackageId: MAINNET_COUNTER_PACKAGE_ID,
        gameStorePackageId: "0xTODO", // Add your mainnet package ID here
      },
    },
  });

export { networkConfig, useNetworkVariable, useNetworkVariables };
