import { expect } from 'chai'
import { Chance } from 'chance'
import { ethers } from 'hardhat'
import { expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers'
import { contractDeployer } from '../../utils/ContractDeployer'

const chance = new Chance()

describe('UNIT TEST: DTKStore - deployment', () => {
  it('should set authed signer address & sigValidBlockNum', async () => {
    const [owner, authedSigner] = await ethers.getSigners()
    const sigValidBlockNum = chance.integer({ min: 12, max: 200 })
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
      authedSignerAddress: authedSigner.address,
      sigValidBlockNum,
    })

    expect(await dtkStore.authedSigner()).to.equal(authedSigner.address)
    expect((await dtkStore.sigValidBlockNum()).toNumber()).to.equal(
      sigValidBlockNum,
    )
  })
  it('should throw error if the authedSigner is invalid', async () => {
    const [owner] = await ethers.getSigners()
    const sigValidBlockNum = chance.integer({ min: 12, max: 200 })

    await expectRevert(
      contractDeployer.DTKStore({
        owner,
        authedSignerAddress: ZERO_ADDRESS,
        sigValidBlockNum,
      }),
      'DTKStore:InvalidSigner',
    )
  })
})
