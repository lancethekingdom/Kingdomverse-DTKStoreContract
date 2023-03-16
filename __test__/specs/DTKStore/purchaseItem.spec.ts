import { UnitParser } from './../../utils/UnitParser'
import { ethers } from 'hardhat'
import {
  expectEvent,
  expectFnReturnChange,
  expectRevert,
  MAX_UINT256,
  ZERO_ADDRESS,
} from '../../../ethers-test-helpers'
import {
  generateSignature,
  getCurrentBlock,
} from '../../../hardhat-test-helpers'
import { contractDeployer } from '../../utils/ContractDeployer'
import { Chance } from 'chance'

const chance = new Chance()

describe('UNIT TEST: DTKStore - purchaseItem', () => {
  it(`IF pay with ether
      should emit a purchase item event with correct params 
      `, async () => {
    const [owner, buyer] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()
      // await ethers.provider.send('evm_mine', [beforeBlock.timestamp + 1000])
      // const afterBlock = await getCurrentBlock()

      const billId = 1
      const tokenAddress = ZERO_ADDRESS
      const payment = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
          'uint256',
        ],
        values: [
          'purchaseItem(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectEvent(
        dtkStore.connect(buyer).purchaseItem,
        [
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
          signature,
          { value: UnitParser.toEther(payment) },
        ],
        {
          contract: dtkStore,
          eventSignature: 'PurchaseItem(uint256,address,uint256)',
          eventArgs: {
            billId,
            token: ZERO_ADDRESS,
            payment,
          },
        },
      )
      await ethers.provider.send('evm_mine', [])
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`IF pay with ERC20 token
      should emit a purchase item event with correct params`, async () => {
    const [owner, buyer] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })
    const [king] = await contractDeployer.King({
      owner,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      // mint king token for buyer
      const initialBuyerBalance = chance.integer({ min: 200, max: 10000 })
      await king
        .connect(buyer)
        .mint(buyer.address, UnitParser.toEther(initialBuyerBalance))
      // approve all buyer king to dtkStore
      await king.connect(buyer).approve(dtkStore.address, MAX_UINT256)

      const currentBlock = await getCurrentBlock()

      const billId = 1
      const tokenAddress = king.address
      const payment = initialBuyerBalance / 2
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

      const signature = await generateSignature({
        signer: owner,
        types: [
          'string',
          'address',
          'address',
          'uint256',
          'address',
          'uint256',
          'uint256',
          'uint256',
        ],
        values: [
          'purchaseItem(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectEvent(
        dtkStore.connect(buyer).purchaseItem,
        [
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
          signature,
          { value: UnitParser.toEther(payment) },
        ],
        {
          contract: dtkStore,
          eventSignature: 'PurchaseItem(uint256,address,uint256)',
          eventArgs: {
            billId,
            token: tokenAddress,
            payment,
          },
        },
      )
      await ethers.provider.send('evm_mine', [])
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  // it('should throw error if the caller is not owner', async () => {
  //   const [owner, notOwner] = await ethers.getSigners()
  //   const [dtkStore] = await contractDeployer.DTKStore({
  //     owner,
  //   })

  //   await expectRevert(
  //     dtkStore.connect(notOwner).setAuthedSigner(notOwner.address),
  //     'Ownable: caller is not the owner',
  //   )
  // })
})
