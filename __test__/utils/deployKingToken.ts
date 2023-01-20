import { UnitParser } from './UnitParser'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// @ts-ignore
import { ethers } from 'hardhat'
import { King } from '../../types/contracts/King'

export type DeployKingTokenConfig = {
  reserve?: number
  owner?: SignerWithAddress
}

export const deployKingToken = async (
  { reserve = 1000000, owner }: DeployKingTokenConfig = { reserve: 1000000 },
) => {
  const [defaultOwner] = await ethers.getSigners()
  const TokenContractFactory = await ethers.getContractFactory('King')
  const targetOwner = owner ?? defaultOwner
  const token = await TokenContractFactory.connect(targetOwner).deploy(
    UnitParser.toEther(reserve),
  )
  return [token, targetOwner, reserve] as [King, SignerWithAddress, number]
}
