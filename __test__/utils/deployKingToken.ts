import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import hre from 'hardhat'
import "hardhat-ethernal"
import { King } from '../../types'

const { ethers } = hre

export const deployKingToken = async ({
  owner,
}: {
  owner?: SignerWithAddress
} = {}) => {
  const [defaultOwner] = await ethers.getSigners()
  const TokenContractFactory = await ethers.getContractFactory('King')
  const targetOwner = owner ?? defaultOwner
  const token = await TokenContractFactory.connect(targetOwner).deploy()
  await token.deployed();
  await hre.ethernal.push({ name: 'King', address: token.address});
  return [token, targetOwner] as [King, SignerWithAddress]
}
