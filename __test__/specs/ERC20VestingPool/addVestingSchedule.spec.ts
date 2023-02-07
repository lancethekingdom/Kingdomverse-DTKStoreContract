import { expect, assert } from 'chai'
import { ethers } from 'hardhat'
import { SafeMath } from '../../utils/safeMath'
import { deployERC20VestingPool } from '../../utils/deployERC20VestingPool'
import { UnitParser } from '../../utils/UnitParser'
import { BigNumber } from 'ethers'
import { ERC20VestingPoolFactory } from '../../utils/ERC20VestingPoolFactory'

describe('UNIT TEST: ERC20VestingPool - addVestingSchedule', () => {
  it('should throw error if not the owner calling this function', async () => {
    const [owner, notOwner] = await ethers.getSigners()
    const [vestingPool] = await deployERC20VestingPool({ owner })

    const config = ERC20VestingPoolFactory.generateVestingScheduleConfig({
      beneficiaryAddress: notOwner.address,
    })
    return vestingPool
      .connect(notOwner)
      .addVestingSchedule(config)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Ownable: caller is not the owner')
      })
  })

  it('should throw error if the beneficiary is an empty address', async () => {
    const [owner] = await ethers.getSigners()

    const config = ERC20VestingPoolFactory.generateVestingScheduleConfig({
      beneficiaryAddress: '0x0000000000000000000000000000000000000000',
    })

    const [vestingPool] = await deployERC20VestingPool({
      owner,
    })

    return vestingPool
      .connect(owner)
      .addVestingSchedule(config)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Beneficiary is zero address')
      })
  })

  it('should transfer corresponding token from caller to vesting pool & create vestingSchedule', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const configA = ERC20VestingPoolFactory.generateVestingScheduleConfig({
      beneficiaryAddress: beneficiaryA.address,
    })

    const [vestingPool, token] = await deployERC20VestingPool({ owner })

    await token
      .connect(owner)
      .approve(
        vestingPool.address,
        (configA.lockupAmount as BigNumber).add(
          configA.vestingAmount as BigNumber,
        ),
      )

    const amount = BigNumber.from(configA.lockupAmount).add(BigNumber.from(configA.vestingAmount))
    await expect(
      () => vestingPool.connect(owner).addVestingSchedule(configA)
    ).to.changeTokenBalances(token, [owner, vestingPool], [amount.mul(-1), amount]);
  })

  it('should create vestingSchedule for the beneficary', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const configA = ERC20VestingPoolFactory.generateVestingScheduleConfig({
      beneficiaryAddress: beneficiaryA.address,
    })

    const [vestingPool, token] = await deployERC20VestingPool({
      owner,
    })

    await token
      .connect(owner)
      .approve(
        vestingPool.address,
        (configA.lockupAmount as BigNumber).add(
          configA.vestingAmount as BigNumber,
        ),
      )

    await vestingPool.connect(owner).addVestingSchedule(configA)

    const createdVestingSchedule = await vestingPool
      .connect(owner)
      .getVestingSchedule(configA.beneficiaryAddress)

    expect(createdVestingSchedule.valid).to.be.true
    expect(createdVestingSchedule.lockupAmount).to.equal(configA.lockupAmount)
    expect(createdVestingSchedule.vestingAmount).to.equal(configA.vestingAmount)
    expect(createdVestingSchedule.lockupDuration).to.equal(
      configA.lockupDuration,
    )
    expect(createdVestingSchedule.vestingDuration).to.equal(
      configA.vestingDuration,
    )
  })

  it('should throw error if the beneficiary has already been scheduled', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const configA = ERC20VestingPoolFactory.generateVestingScheduleConfig({
      beneficiaryAddress: beneficiaryA.address,
    })

    const [vestingPool, token] = await deployERC20VestingPool({
      owner,
    })

    await token
      .connect(owner)
      .approve(
        vestingPool.address,
        (configA.lockupAmount as BigNumber).add(
          configA.vestingAmount as BigNumber,
        ),
      )
    await vestingPool.connect(owner).addVestingSchedule(configA)
    return vestingPool
      .connect(owner)
      .addVestingSchedule(configA)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Vesting schedule already exists')
      })
  })
})
