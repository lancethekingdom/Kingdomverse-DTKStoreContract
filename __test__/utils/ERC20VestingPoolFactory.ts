import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import Chance from 'chance'
import { BigNumber, BigNumberish } from 'ethers'
import { ethers } from 'hardhat'
import { VestingScheduleConfigStruct } from '../../types/contracts/ERC20VestingPool'
import { deployERC20VestingPool } from './deployERC20VestingPool'
import { UnitParser } from './UnitParser'
const chance = new Chance()

export const ERC20VestingPoolFactory = {
  generateVestingScheduleConfig({
    beneficiaryAddress,
    lockupDurationInDays = 0,
    lockupAmount = chance.integer({ min: 1, max: 2000000 }),
    vestingDurationInDays = 0,
    vestingAmount = chance.integer({ min: 1, max: 2000000 }),
  }: {
    beneficiaryAddress: string
    lockupDurationInDays?: number
    lockupAmount?: BigNumberish
    vestingDurationInDays?: number
    vestingAmount?: BigNumberish
  }) {
    return {
      beneficiaryAddress,
      lockupDuration: lockupDurationInDays * 60 * 60 * 24,
      lockupAmount: BigNumber.from(lockupAmount),
      vestingDuration: vestingDurationInDays * 60 * 60 * 24,
      vestingAmount: BigNumber.from(vestingAmount),
    } as VestingScheduleConfigStruct
  },
  async utilVestingScheduleCreated({
    owner,
    vestingScheduleConfigs = [],
  }: {
    owner?: SignerWithAddress
    vestingScheduleConfigs?: VestingScheduleConfigStruct[]
  } = {}) {
    const [defaultOwner, beneficiaryA] = await ethers.getSigners()

    const targetOwner = owner ?? defaultOwner
    const targetVestingScheduleConfigs = vestingScheduleConfigs.length
      ? vestingScheduleConfigs
      : [
          this.generateVestingScheduleConfig({
            beneficiaryAddress: beneficiaryA.address,
          }),
        ]

    const [vestingPool, token, __, vestingTs] = await deployERC20VestingPool({
      owner: targetOwner,
    })

    const totalVestingAmount = targetVestingScheduleConfigs.reduce(
      (prev, curr) => {
        return (curr.lockupAmount as BigNumber)
          .add(curr.vestingAmount as BigNumber)
          .add(prev)
      },
      BigNumber.from(0),
    )

    await token
      .connect(targetOwner)
      .approve(vestingPool.address, totalVestingAmount)

    const addVestingScheduleTx = await vestingPool
      .connect(targetOwner)
      .addVestingSchedules(targetVestingScheduleConfigs)

    return {
      vestingPool,
      addVestingScheduleTx,
      token,
      vestingScheduleConfigs: targetVestingScheduleConfigs,
      owner: targetOwner,
      vestingTs
    }
  },
}
