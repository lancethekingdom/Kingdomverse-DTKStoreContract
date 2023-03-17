import { expect } from 'chai'
import { ethers } from 'hardhat'
import { expectRevert, ZERO_ADDRESS } from '../../../ethers-test-helpers'
import { contractDeployer } from '../../utils/ContractDeployer'

describe('UNIT TEST: DTKStore - deployment', () => {
  it('should set authed signer address', async () => {
    const [owner, authedSigner] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
      authedSignerAddress: authedSigner.address,
    })
    
    expect(await dtkStore.authedSigner()).to.equal(authedSigner.address)
  })
  it('should throw error if the authedSigner is invalid', async () => {
    const [owner] = await ethers.getSigners()

    await expectRevert(
      contractDeployer.DTKStore({
        owner,
        authedSignerAddress: ZERO_ADDRESS,
      }),
      'DTKStore:InvalidSigner',
    )
  })
})
