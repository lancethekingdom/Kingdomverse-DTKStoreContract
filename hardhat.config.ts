import { HardhatUserConfig } from 'hardhat/config'
import '@typechain/hardhat'
import '@nomicfoundation/hardhat-toolbox'
import '@nomiclabs/hardhat-ethers'
import 'hardhat-gas-reporter'
import "hardhat-ethernal"

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      gas: 2100000,
      gasPrice: 8000000000,
      loggingEnabled: false,
      initialDate: '2021-01-01T00:00:00Z',
    },
    localhost: {
      allowUnlimitedContractSize: true,
      gas: 2100000,
      gasPrice: 8000000000,
    },
  },
  paths: {
    sources: './contracts',
    tests: './__test__/specs',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: './types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false,
    externalArtifacts: ['externalArtifacts/*.json'],
    dontOverrideCompile: false,
  },
  gasReporter: {
    enabled: true,
  },
  ethernal: {
    uploadAst: true,
    resetOnStart: 'Test',
    disableSync: false,
    disableTrace: false,
    disabled: true
  }
}

export default config
