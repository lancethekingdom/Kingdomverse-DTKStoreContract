import { expect } from 'chai'
import Chance from 'chance'
import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { ERC20VestingPoolFactory } from '../../utils/ERC20VestingPoolFactory'
import { getLastBlock } from '../../utils/evmUtils'
import { SafeMath } from '../../utils/safeMath'
import { UNIT_VESTING_INTERVAL } from '../../utils/config'
import { VestingScheduleConfigStruct } from '../../../types/contracts/ERC20VestingPool'

const chance = new Chance()

describe.skip('UNIT TEST: ERC20VestingPool - getClaimable', () => {
  it('should return zero if no token is released', async () => {
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
      vestingTs
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
    expect(claimable).to.equal(0)
  })

  it('Given not claim yet, should return all lockupAmount if the blocktime is greater or equal to lockup duration + launchTime', async () => {
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

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(config.lockupAmount)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('Given not claim yet, should return zero if the blocktime is less than lockupDuration + launchTime', async () => {
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
      await ethers.provider.send('evm_mine', [launchTime + twoDays + 10])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(0)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('Given not claim yet, should return all vesting amount if the blocktime is greater or equals to vestingEndTime', async () => {
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
      await ethers.provider.send('evm_mine', [launchTime + sixtyDays])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(config.vestingAmount)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('Given not claim yet, should return zero if the blocktime is greater than vestingStartTime but less than one unit vesting interval', async () => {
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

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(0)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('Given not claim yet, should return one unitVestingRelease if the blocktime is equals to vestingStartTime + one unit vesting interval', async () => {
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

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(
        (config.vestingAmount as BigNumber)
          .mul(UNIT_VESTING_INTERVAL)
          .div(config.vestingDuration as BigNumber),
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('Given claimed one unitVestingRelease, should return one unitVestingRelease if the blocktime is equals to vestingStartTime + two unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: 3,
        vestingDurationInDays: 90,
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

      await vestingPool.connect(beneficiaryA).claim()
      const claimTime = (await getLastBlock(ethers.provider)).timestamp

      // await ethers.provider.send('evm_increaseTime', [oneVestingInterval])
      await ethers.provider.send('evm_mine', [claimTime + UNIT_VESTING_INTERVAL])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      const vestingSchedule = await vestingPool.getVestingSchedule(
        beneficiaryA.address,
      )
      const totalReleased = await vestingPool
        .connect(beneficiaryA)
        .getTotalReleased()

      expect(claimable).to.equal(
        (config.vestingAmount as BigNumber)
          .mul(UNIT_VESTING_INTERVAL)
          .div(config.vestingDuration as BigNumber),
      )
      expect(claimable.add(vestingSchedule.claimed)).to.equal(totalReleased)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('Given not claim yet, should return corresponding number * unitVestingRelease if the blocktime is equals to vestingStartTime + certain number of unit vesting interval', async () => {
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
      max: (config.vestingDuration as number) / UNIT_VESTING_INTERVAL
    })

    const correspondingNumOfIntervalPassed = SafeMath.mul(
      numberOfUnitVestingIntervalPassed,
      UNIT_VESTING_INTERVAL
    )

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()
      await ethers.provider.send('evm_mine', [launchTime + correspondingNumOfIntervalPassed])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      // console.log(`${config.vestingAmount} / ${config.vestingDuration} * ${UNIT_VESTING_INTERVAL} * ${numberOfUnitVestingIntervalPassed}}`)
      // console.log({
      //   config,
      //   numberOfUnitVestingIntervalPassed,
      //   claimable
      // })
      // console.log(`${config.vestingAmount} x ${numberOfUnitVestingIntervalPassed * UNIT_VESTING_INTERVAL} / ${config.vestingDuration}`)
      expect(claimable).to.equal(
        (config.vestingAmount as BigNumber)
          .mul(numberOfUnitVestingIntervalPassed * UNIT_VESTING_INTERVAL)
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
    const randomGuyClaimable = await vestingPool.connect(random).getClaimable()

    expect(randomGuyClaimable).to.equal(0)
  })
})
