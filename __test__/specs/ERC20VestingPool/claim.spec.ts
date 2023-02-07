import { expect, assert } from 'chai'
import { ethers } from 'hardhat'
import { VestingScheduleConfigStruct } from '../../../types/contracts/ERC20VestingPool'
import { ERC20VestingPoolFactory } from '../../utils/ERC20VestingPoolFactory'
import { UNIT_VESTING_INTERVAL } from '../../utils/config'

describe('UNIT TEST: ERC20VestingPool - claim', () => {
  it('should throw error if sender claimable balance is 0', async () => {
    const [owner, beneficiaryA, nonVestee] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupDurationInDays: 1,
        vestingAmount: 0,
        vestingDurationInDays: 0,
      },
    )

    const {
      vestingPool,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    return vestingPool
      .connect(nonVestee)
      .claim()
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'No claimable balance')
      })
  })

  it('should increment schedule.claimed based on the claimable amount', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: 2,
        vestingDurationInDays: 60,
      },
    )

    const {
      vestingPool,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const launchTime = (await vestingPool.launchTime()).toNumber()
    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await ethers.provider.send('evm_mine', [launchTime + UNIT_VESTING_INTERVAL])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()

      const vestingScheduleBefore = await vestingPool.getVestingSchedule(
        beneficiaryA.address,
      )
      await vestingPool.connect(beneficiaryA).claim()
      const vestingScheduleAfter = await vestingPool.getVestingSchedule(
        beneficiaryA.address,
      )

      expect(vestingScheduleAfter.claimed).to.be.ok

      expect(vestingScheduleAfter.claimed).to.equal(
        vestingScheduleBefore.claimed.add(claimable),
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('should transfer corresponding amount of token based on the claimable amount', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: 2,
        vestingDurationInDays: 60,
      },
    )

    const {
      vestingPool,
      token,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {

      const launchTime = (await vestingPool.launchTime()).toNumber()
      await ethers.provider.send('evm_mine', [launchTime + UNIT_VESTING_INTERVAL])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()

      const vestingPoolBalanceBefore = await token.balanceOf(vestingPool.address)
      const beneficiaryBalanceBefore = await token.balanceOf(beneficiaryA.address)

      await vestingPool.connect(beneficiaryA).claim()

      const vestingPoolBalanceAfter = await token.balanceOf(vestingPool.address)
      const beneficiaryBalanceAfter = await token.balanceOf(beneficiaryA.address)

      expect(vestingPoolBalanceBefore.sub(vestingPoolBalanceAfter)).to.equal(
        claimable,
      )
      expect(vestingPoolBalanceBefore.sub(vestingPoolBalanceAfter)).to.equal(
        beneficiaryBalanceAfter.sub(beneficiaryBalanceBefore),
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
})
