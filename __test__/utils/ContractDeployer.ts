import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import Chance from 'chance'
import { LogLevel } from '@ethersproject/logger'
import { DTKStore, TestKing } from '../../types'

ethers.utils.Logger.setLogLevel(LogLevel.ERROR)

type ContractDeploymentBaseConfig = {
  owner?: SignerWithAddress
}

type TestKingDeploymentConfig = ContractDeploymentBaseConfig

type DtkStoreDeploymentConfig = ContractDeploymentBaseConfig & {
  authedSignerAddress?: string
  sigValidBlockNum?: number
}

class ContractDeployer {
  async King({ owner }: TestKingDeploymentConfig = {}) {
    const [defaultOwner] = await ethers.getSigners()
    const contractFactory = await ethers.getContractFactory('TestKing')
    const targetOwner = owner ?? defaultOwner
    const testKing = await contractFactory.connect(targetOwner).deploy()
    return [testKing, targetOwner] as [TestKing, SignerWithAddress]
  }
  async DTKStore({
    owner,
    authedSignerAddress,
    sigValidBlockNum = 12,
  }: DtkStoreDeploymentConfig = {}) {
    const [defaultOwner] = await ethers.getSigners()
    const contractFactory = await ethers.getContractFactory('DTKStore', {})
    const targetOwner = owner ?? defaultOwner
    const targetAuthedSignerAddress = authedSignerAddress ?? targetOwner.address
    const dtkStore = await contractFactory
      .connect(targetOwner)
      .deploy(targetAuthedSignerAddress, sigValidBlockNum)
    return [dtkStore, targetAuthedSignerAddress, targetOwner] as [
      DTKStore,
      string,
      SignerWithAddress,
    ]
  }
}

export const contractDeployer = new ContractDeployer()
