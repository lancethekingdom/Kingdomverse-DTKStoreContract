import { UnitParser } from '../../utils/UnitParser'
import { ethers } from 'hardhat'
import { expectRevert } from '../../../ethers-test-helpers'
import { contractDeployer } from '../../utils/ContractDeployer'
import { Chance } from 'chance'
import { expect } from 'chai'

const chance = new Chance()

describe('UNIT TEST: DTKStore - withdrawEther', () => {
  it(`should throw error if the caller is not owner
      `, async () => {
    const [owner, recepient, vault, notOwner] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })
    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance / 2
    await vault.sendTransaction({
      value: UnitParser.toEther(initialBalance),
      to: dtkStore.address,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await expectRevert(
        dtkStore
          .connect(notOwner)
          .withdrawEther(recepient.address, UnitParser.toEther(withdrawAmount)),
        'Ownable: caller is not the owner',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should decrement the store contract balance
      `, async () => {
    const [owner, recepient, vault] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })
    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance / 2
    await vault.sendTransaction({
      value: UnitParser.toEther(initialBalance),
      to: dtkStore.address,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const beforeBalance = UnitParser.fromEther(
        await ethers.provider.getBalance(dtkStore.address),
      )

      await dtkStore
        .connect(owner)
        .withdrawEther(recepient.address, UnitParser.toEther(withdrawAmount))

      const afterBalance = UnitParser.fromEther(
        await ethers.provider.getBalance(dtkStore.address),
      )
      expect(afterBalance).to.equal(beforeBalance - withdrawAmount)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should increment the recepient balance
      `, async () => {
    const [owner, recepient, vault] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })
    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance / 2
    await vault.sendTransaction({
      value: UnitParser.toEther(initialBalance),
      to: dtkStore.address,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const beforeBalance = UnitParser.fromEther(
        await ethers.provider.getBalance(recepient.address),
      )

      await dtkStore
        .connect(owner)
        .withdrawEther(recepient.address, UnitParser.toEther(withdrawAmount))

      const afterBalance = UnitParser.fromEther(
        await ethers.provider.getBalance(recepient.address),
      )
      expect(afterBalance).to.equal(beforeBalance + withdrawAmount)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the withdraw amount exceed contract balance
      `, async () => {
    const [owner, recepient, vault] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })
    const initialBalance = chance.integer({ min: 0.02, max: 2000 })
    const withdrawAmount = initialBalance * 2
    await vault.sendTransaction({
      value: UnitParser.toEther(initialBalance),
      to: dtkStore.address,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      await expectRevert(
        dtkStore
          .connect(owner)
          .withdrawEther(recepient.address, UnitParser.toEther(withdrawAmount)),
        'DTKStore:SendEtherFailed',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
})
