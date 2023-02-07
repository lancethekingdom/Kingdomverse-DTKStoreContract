import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ERC20VestingPool } from '../../types/contracts/ERC20VestingPool'
import * as hre from 'hardhat'

import { deployKingToken } from './deployKingToken'
import { King } from '../../types/contracts/King'
import { VEST_START } from './config'
import "hardhat-ethernal"
import { getLastBlock } from './evmUtils'

const { ethers } = hre


export const deployERC20VestingPool = async ({
  owner,
  token,
}: {
  owner?: SignerWithAddress
  token?: King
} = {}) => {
  // hardcode evm time for deployment time, because all evm_increaseTime will be relative to this
  // await ethers.provider.send('evm_mine', [VEST_START - 10000])

  const [defaultOwner] = await ethers.getSigners()
  const targetOwner = owner ?? defaultOwner


  const targetToken =
    token ?? (await deployKingToken({ owner: targetOwner }))[0]

  const VestingContractFactory = await ethers.getContractFactory(
    'ERC20VestingPool',
  )

  const vestingPool = await VestingContractFactory.connect(targetOwner).deploy(
    targetToken.address,
    VEST_START
  )
  await vestingPool.deployed();
  await hre.ethernal.push({ name: 'ERC20VestingPool', address: vestingPool.address});

  const vestingTs = (await getLastBlock(ethers.provider)).timestamp;

  return [vestingPool, targetToken, targetOwner, vestingTs] as [
    ERC20VestingPool,
    King,
    SignerWithAddress,
    number
  ]
}
