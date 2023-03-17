import { ethers } from 'hardhat'
import {
  expectFnReturnChange,
  expectRevert,
} from '../../../ethers-test-helpers'
import { contractDeployer } from '../../utils/ContractDeployer'

describe('UNIT TEST: DTKStore - setAuthedSigner', () => {
  it('should update the authed signer', async () => {
    const [owner, authedSigner, newAuthedSigner] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
      authedSignerAddress: authedSigner.address,
    })

    await expectFnReturnChange(
      dtkStore.connect(owner).setAuthedSigner,
      [newAuthedSigner.address],
      {
        contract: dtkStore,
        functionSignature: 'authedSigner',
        params: [],
        expectedBefore: authedSigner.address,
        expectedAfter: newAuthedSigner.address,
      },
    )
  })
  it('should throw error if the caller is not owner', async () => {
    const [owner, notOwner] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })

    await expectRevert(
      dtkStore.connect(notOwner).setAuthedSigner(notOwner.address),
      'Ownable: caller is not the owner',
    )
  })
})
