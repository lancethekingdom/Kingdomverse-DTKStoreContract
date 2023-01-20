import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ERC20VestingPool } from '../../types/contracts/ERC20VestingPool'
// @ts-ignore
import { ethers } from 'hardhat'
import { MintableERC20 } from '../../types/contracts/MintableERC20'
import { deployMintableToken } from './deployMintableToken'
import { King } from '../../types/contracts/King'

export const deployERC20VestingPool = async ({
  owner,
  token,
}: {
  owner?: SignerWithAddress
  token?: King | MintableERC20
} = {}) => {
  const [defaultOwner] = await ethers.getSigners()
  const targetOwner = owner ?? defaultOwner

  const targetToken =
    token ?? (await deployMintableToken({ owner: targetOwner }))[0]

  const VestingContractFactory = await ethers.getContractFactory(
    'ERC20VestingPool',
  )

  const vestingPool = await VestingContractFactory.connect(targetOwner).deploy(
    targetToken.address,
  )

  return [vestingPool, targetToken, targetOwner] as [
    ERC20VestingPool,
    MintableERC20,
    SignerWithAddress,
  ]
}
