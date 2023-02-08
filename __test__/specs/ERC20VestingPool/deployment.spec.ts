import { expect, assert } from 'chai'
import { deployERC20VestingPool } from '../../utils/deployERC20VestingPool'
import { deployKingToken } from '../../utils/deployKingToken'

import { VEST_START } from '../../utils/config'

describe.skip('UNIT TEST: ERC20VestingPool - deployment', () => {
  it('should return correct token address when the vesting pool is deployed', async () => {
    const [token] = await deployKingToken()
    const [vestingPool] = await deployERC20VestingPool({
      token,
    })

    expect(await vestingPool.getKingTokenAddress()).to.equal(token.address)
  })

  it('should set correct launchTime when vesting pool is deployed', async () => {
    const [token] = await deployKingToken()
    const [vestingPool] = await deployERC20VestingPool({
      token,
    })

    const vestingPoolLaunchTime = await vestingPool.launchTime()
    expect(vestingPoolLaunchTime).to.be.approximately(VEST_START, 10)
  })
})
