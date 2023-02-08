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

describe('SCENARIO TEST - release 2% upon listing, 18 months monthly vesting, vesting will start after one month of lockup finished', () => {
  const totalAmount = chance.integer({ min: 1000000, max: 5000000 })
  const lockupAmount = Math.floor(totalAmount * 0.02)
  const vestingAmount = totalAmount - lockupAmount
  const lockupDurationInDays = 0
  const vestingDurationInDays = 18 * 30

  it('getClaimable: should return all lockup amount upon token launch', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount,
        lockupDurationInDays,
        vestingAmount,
        vestingDurationInDays,
      },
    )

    const {
      vestingPool,
      // vestingTs,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()
      await ethers.provider.send('evm_mine', [launchTime])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(config.lockupAmount)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('getClaimable: Given not claim yet, should return all vesting amount if the blocktime is greater or equals to vestingEndTime', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount,
        lockupDurationInDays,
        vestingAmount,
        vestingDurationInDays,
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
      const vestingDuration = vestingDurationInDays * 24 * 60 * 60
      await ethers.provider.send('evm_mine', [
        launchTime +
          vestingDuration +
          (lockupAmount ? UNIT_VESTING_INTERVAL : 0),
      ])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(
        (config.vestingAmount as BigNumber).add(
          config.lockupAmount as BigNumber,
        ),
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('getClaimable: Given not claim yet, should return lockupAmount only if the blocktime is greater than vestingStartTime but less than one unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount,
        lockupDurationInDays,
        vestingAmount,
        vestingDurationInDays,
      },
    )

    const {
      vestingPool,
    } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const lessThanOneVestingInterval =
      UNIT_VESTING_INTERVAL + (lockupAmount ? UNIT_VESTING_INTERVAL : 0) - 1000

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()
      await ethers.provider.send('evm_mine', [
        launchTime + lessThanOneVestingInterval,
      ])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(config.lockupAmount)
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('getClaimable: Given not claim yet, should return one unitVestingRelease if the blocktime is equals to vestingStartTime + one unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount,
        lockupDurationInDays,
        vestingAmount,
        vestingDurationInDays,
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
      await ethers.provider.send('evm_mine', [
        launchTime +
          UNIT_VESTING_INTERVAL +
          (lockupAmount ? UNIT_VESTING_INTERVAL : 0),
      ])

      const claimable = await vestingPool.connect(beneficiaryA).getClaimable()
      expect(claimable).to.equal(
        (config.vestingAmount as BigNumber)
          .mul(UNIT_VESTING_INTERVAL)
          .div(config.vestingDuration as BigNumber)
          .add(config.lockupAmount as BigNumber),
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })

  it('getClaimable: Given not claim yet, should return corresponding number * unitVestingRelease if the blocktime is equals to vestingStartTime + certain number of unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount,
        lockupDurationInDays,
        vestingAmount,
        vestingDurationInDays,
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
      max: (config.vestingDuration as number) / UNIT_VESTING_INTERVAL,
    })

    const correspondingNumOfIntervalPassed = SafeMath.mul(
      numberOfUnitVestingIntervalPassed,
      UNIT_VESTING_INTERVAL,
    )

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const launchTime = (await vestingPool.launchTime()).toNumber()
      await ethers.provider.send('evm_mine', [
        launchTime +
          correspondingNumOfIntervalPassed +
          (lockupAmount ? UNIT_VESTING_INTERVAL : 0),
      ])

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
          .add(config.lockupAmount as BigNumber),
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
