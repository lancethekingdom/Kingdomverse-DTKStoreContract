import { expect } from 'chai'
import Chance from 'chance'
import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { ERC20VestingPoolFactory } from '../utils/ERC20VestingPoolFactory'
import { SafeMath } from '../utils/safeMath'
import { UNIT_VESTING_INTERVAL } from '../utils/config'
import { VestingScheduleConfigStruct } from '../../types/contracts/ERC20VestingPool'

const chance = new Chance()

describe('SCENARIO TEST', () => {
  const totalAmount = chance.integer({ min: 1000000, max: 5000000 })

  const scenarios = [
    // release 0.5% upon listing, 18 months monthly vesting, vesting will start after one month of lockup finished
    {
      lockupAmount: Math.floor(totalAmount * 0.005),
      vestingAmount: totalAmount - Math.floor(totalAmount * 0.005),
      lockupDurationInDays: 0,
      vestingDurationInDays: 18 * 30,
    },
    // release 2% upon listing, 18 months monthly vesting, vesting will start after one month of lockup finished
    {
      lockupAmount: Math.floor(totalAmount * 0.02),
      vestingAmount: totalAmount - Math.floor(totalAmount * 0.02),
      lockupDurationInDays: 0,
      vestingDurationInDays: 18 * 30,
    },
    // release 50% upon listing, 18 months monthly vesting, vesting will start after one month of lockup finished
    {
      lockupAmount: Math.floor(totalAmount * 0.5),
      vestingAmount: totalAmount - Math.floor(totalAmount * 0.5),
      lockupDurationInDays: 0,
      vestingDurationInDays: 18 * 30,
    },
    // 12 months lock-up , first trench 20%, rest 80% 12 months monthly vesting
    {
      lockupAmount: Math.floor(totalAmount * 0.2),
      vestingAmount: totalAmount - Math.floor(totalAmount * 0.2),
      lockupDurationInDays: 12 * 30,
      vestingDurationInDays: 18 * 30,
    },
    // TEAM-1: 12 months lock-up , 12 months monthly vesting
    {
      lockupAmount: 0,
      vestingAmount: totalAmount,
      lockupDurationInDays: 12 * 30,
      vestingDurationInDays: 12 * 30,
    },
  ]

  scenarios.forEach(
    ({
      lockupAmount,
      vestingAmount,
      lockupDurationInDays,
      vestingDurationInDays,
    }) => {
      it('getClaimable: should return zero if no token is released', async () => {
        const [owner, beneficiary] = await ethers.getSigners()

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
          {
            beneficiaryAddress: beneficiary.address,
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

        const claimable = await vestingPool.connect(beneficiary).getClaimable()
        expect(claimable).to.equal(0)
      })

      it('getClaimable: Given not claim yet, should return all lockupAmount if the blocktime is greater than or equal to the launchTime + lockupDuration but less than plus one unit vesting period ', async () => {
        const [owner, beneficiary] = await ethers.getSigners()

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
          {
            beneficiaryAddress: beneficiary.address,
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
          const lockupDuration = lockupDurationInDays * 24 * 60 * 60
          await ethers.provider.send('evm_mine', [
            launchTime + lockupDuration + UNIT_VESTING_INTERVAL / 2,
          ])

          const claimable = await vestingPool
            .connect(beneficiary)
            .getClaimable()
          expect(claimable).to.equal(config.lockupAmount)
        }
        await ethers.provider.send('evm_revert', [snapshot_id])
      })

      it('getClaimable: Given not claim yet, should return all total vesting amount if the blocktime is greater or equals to vestingEndTime', async () => {
        const [owner, beneficiary] = await ethers.getSigners()

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
          {
            beneficiaryAddress: beneficiary.address,
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
          const lockupDuration = lockupDurationInDays * 24 * 60 * 60
          const vestingStartTime =
            launchTime +
            lockupDuration +
            (vestingAmount ? UNIT_VESTING_INTERVAL : 0)

          const vestingDuration = vestingDurationInDays * 24 * 60 * 60
          const vestingEndtime = vestingStartTime + vestingDuration

          await ethers.provider.send('evm_mine', [vestingEndtime])

          const claimable = await vestingPool
            .connect(beneficiary)
            .getClaimable()
          expect(claimable).to.equal(
            (config.vestingAmount as BigNumber).add(
              config.lockupAmount as BigNumber,
            ),
          )
        }
        await ethers.provider.send('evm_revert', [snapshot_id])
      })

      // only execute if there is positive lockup duration
      lockupDurationInDays > 0 &&
        it('getClaimable: Given not claim yet, should return zero if the blocktime is less than launchTime + lockupDuration', async () => {
          const [owner, beneficiary] = await ethers.getSigners()

          const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
            {
              beneficiaryAddress: beneficiary.address,
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
            const lockupDuration = lockupDurationInDays * 24 * 60 * 60

            await ethers.provider.send('evm_mine', [
              launchTime + lockupDuration - 12 * 60 * 60,
            ])

            const claimable = await vestingPool
              .connect(beneficiary)
              .getClaimable()
            expect(claimable).to.equal(0)
          }
          await ethers.provider.send('evm_revert', [snapshot_id])
        })

      it('getClaimable: Given not claim yet, should return lockupAmount only if the blocktime is greater than vestingStartTime but less than one unit vesting interval', async () => {
        const [owner, beneficiary] = await ethers.getSigners()

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
          {
            beneficiaryAddress: beneficiary.address,
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
          const lockupDuration = lockupDurationInDays * 24 * 60 * 60

          const vestingStartTime =
            launchTime +
            lockupDuration +
            (lockupAmount ? UNIT_VESTING_INTERVAL : 0)

          const lessThanOneVestingInterval = UNIT_VESTING_INTERVAL - 1000

          await ethers.provider.send('evm_mine', [
            vestingStartTime + lessThanOneVestingInterval,
          ])

          const claimable = await vestingPool
            .connect(beneficiary)
            .getClaimable()
          expect(claimable).to.equal(config.lockupAmount)
        }
        await ethers.provider.send('evm_revert', [snapshot_id])
      })

      it('getClaimable: Given not claim yet, should return one unitVestingRelease if the blocktime is equals to vestingStartTime + one unit vesting interval', async () => {
        const [owner, beneficiary] = await ethers.getSigners()

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
          {
            beneficiaryAddress: beneficiary.address,
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
          const lockupDuration = lockupDurationInDays * 24 * 60 * 60
          const vestingStartTime =
            launchTime +
            lockupDuration +
            (lockupAmount ? UNIT_VESTING_INTERVAL : 0)

          await ethers.provider.send('evm_mine', [
            vestingStartTime + UNIT_VESTING_INTERVAL,
          ])

          const claimable = await vestingPool
            .connect(beneficiary)
            .getClaimable()
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
        const [owner, beneficiary] = await ethers.getSigners()

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
          {
            beneficiaryAddress: beneficiary.address,
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
          const lockupDuration = lockupDurationInDays * 24 * 60 * 60
          const vestingStartTime =
            launchTime +
            lockupDuration +
            (lockupAmount ? UNIT_VESTING_INTERVAL : 0)

          const numberOfUnitVestingIntervalPassed = chance.integer({
            min: 1,
            max: (config.vestingDuration as number) / UNIT_VESTING_INTERVAL,
          })

          const correspondingNumOfIntervalPassed = SafeMath.mul(
            numberOfUnitVestingIntervalPassed,
            UNIT_VESTING_INTERVAL,
          )

          await ethers.provider.send('evm_mine', [
            vestingStartTime + correspondingNumOfIntervalPassed,
          ])

          const claimable = await vestingPool
            .connect(beneficiary)
            .getClaimable()
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
        const [owner, beneficiary, random] = await ethers.getSigners()
        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
          {
            beneficiaryAddress: beneficiary.address,
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
        const randomGuyClaimable = await vestingPool
          .connect(random)
          .getClaimable()

        expect(randomGuyClaimable).to.equal(0)
      })
    },
  )
})
