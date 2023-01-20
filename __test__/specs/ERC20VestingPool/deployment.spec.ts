import { expect, assert } from 'chai'
import { ethers } from 'hardhat'
import { deployERC20VestingPool } from '../../utils/deployERC20VestingPool'
import { deployMintableToken } from '../../utils/deployMintableToken'
describe('UNIT TEST: ERC20VestingPool - deployment', () => {
  it('should return correct token address when the vesting pool is deployed', async () => {
    const [token] = await deployMintableToken()
    const [vestingPool] = await deployERC20VestingPool({
      token,
    })

    expect(await vestingPool.getKingTokenAddress()).to.equal(token.address)
  })

  it('should set correct launchTime when vesting pool is deployed', async () => {
    const [token] = await deployMintableToken()
    const [vestingPool] = await deployERC20VestingPool({
      token,
    })
    const provider = await ethers.provider
    const latestBlockNumber = await provider.getBlockNumber()
    const lastestBlock = await provider.getBlock(latestBlockNumber)

    const vestingPoolLaunchTime = await vestingPool.launchTime()

    expect(vestingPoolLaunchTime).to.be.lessThanOrEqual(lastestBlock.timestamp)
  })
})
