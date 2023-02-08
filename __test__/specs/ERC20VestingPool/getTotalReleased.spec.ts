import { expect } from 'chai'
import Chance from 'chance'
import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { VestingScheduleConfigStruct } from '../../../types/contracts/ERC20VestingPool'
import { UNIT_VESTING_INTERVAL } from '../../utils/config'
import { ERC20VestingPoolFactory } from '../../utils/ERC20VestingPoolFactory'
import { SafeMath } from '../../utils/safeMath'

const chance = new Chance()

describe.skip('UNIT TEST: ERC20VestingPool - getTotalReleased', () => {
  it('_getLockupReleased: should return zero if the blocktime is less than lockup duration + launchTime', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

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

    const totalReleased = await vestingPool
      .connect(beneficiaryA)
      .getTotalReleased()

    expect(totalReleased).to.equal(0)
  })

  it('_getLockupReleased: should return all lockupAmount if the blocktime is greater or equal to lockup duration + launchTime', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

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

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()
      const twoDays = 2 * 24 * 60 * 60
      await ethers.provider.send('evm_mine', [launchTime + twoDays])

      const totalReleased = await vestingPool
        .connect(beneficiaryA)
        .getTotalReleased()
      expect(totalReleased).to.equal(config.lockupAmount)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('_getVestingReleased: should return zero if the blocktime is less than lockupDuration + launchTime', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 30,
        vestingAmount: 1,
        vestingDurationInDays: 30,
      },
    )

    const {
      vestingPool,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()
      const twoDays = 2 * 24 * 60 * 60
      await ethers.provider.send('evm_mine', [launchTime + twoDays])

      const totalReleased = await vestingPool
        .connect(beneficiaryA)
        .getTotalReleased()
      expect(totalReleased).to.equal(0)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('_getVestingReleased: should return all vesting amount if the blocktime is greater or equals to vestingEndTime', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 30,
        vestingAmount: 1,
        vestingDurationInDays: 30,
      },
    )

    const {
      vestingPool,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()
      const sixtyDays = 60 * 24 * 60 * 60
      // await ethers.provider.send('evm_increaseTime', [sixtyDays])
      await ethers.provider.send('evm_mine', [launchTime + sixtyDays])

      const totalReleased = await vestingPool
        .connect(beneficiaryA)
        .getTotalReleased()
      expect(totalReleased).to.equal(config.vestingAmount)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('_getVestingReleased: should return zero if the blocktime is greater than vestingStartTime but less than one unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: 1,
        vestingDurationInDays: 60,
      },
    )

    const {
      vestingPool,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const lessThanOneVestingInterval = UNIT_VESTING_INTERVAL - 1000

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()
      await ethers.provider.send('evm_mine', [launchTime + lessThanOneVestingInterval])

      const totalReleased = await vestingPool
        .connect(beneficiaryA)
        .getTotalReleased()
      expect(totalReleased).to.equal(0)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('_getVestingReleased: should return one unitVestingRelease if the blocktime is equals to vestingStartTime + one unit vesting interval', async () => {
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

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()

      await ethers.provider.send('evm_mine', [launchTime + UNIT_VESTING_INTERVAL])

      const totalReleased = await vestingPool
        .connect(beneficiaryA)
        .getTotalReleased()
      expect(totalReleased).to.equal(
        (config.vestingAmount as BigNumber)
          .mul(UNIT_VESTING_INTERVAL)
          .div(config.vestingDuration as BigNumber),
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('_getVestingReleased: should return corresponding number * unitVestingRelease if the blocktime is equals to vestingStartTime + certain number of unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: chance.integer({ min: 1, max: 200000 }),
        vestingDurationInDays:
          chance.integer({
            min: 1,
            max: 24,
          }) * 30,
      },
    )

    const {
      vestingPool,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const numberOfUnitVestingIntervalPassed = chance.integer({
      min: 1,
      max: SafeMath.div(
        (config.vestingDuration as any) as any,
        UNIT_VESTING_INTERVAL,
      ),
    })

    const launchTime = (await vestingPool.launchTime()).toNumber()
    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await ethers.provider.send('evm_mine', [launchTime + numberOfUnitVestingIntervalPassed * UNIT_VESTING_INTERVAL])

      const totalReleased = await vestingPool
        .connect(beneficiaryA)
        .getTotalReleased()
      expect(totalReleased).to.equal(
        (config.vestingAmount as BigNumber)
          .mul(UNIT_VESTING_INTERVAL * numberOfUnitVestingIntervalPassed)
          .div(config.vestingDuration as BigNumber)
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('should return zero if random people calling this function', async () => {
    const [owner, beneficiaryA, random] = await ethers.getSigners()
    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: chance.integer({ min: 1, max: 200000 }),
        vestingDurationInDays:
          chance.integer({
            min: 1,
            max: 24,
          }) * 30,
      },
    )
    const {
      vestingPool,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })
    const randomGuyTotalReleased = await vestingPool
      .connect(random)
      .getTotalReleased()

    expect(randomGuyTotalReleased).to.equal(0)
  })
})
