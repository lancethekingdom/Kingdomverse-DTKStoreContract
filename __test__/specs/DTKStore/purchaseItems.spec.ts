import { UnitParser } from '../../utils/UnitParser'
import { ethers } from 'hardhat'
import {
  expectEvent,
  expectFnReturnChange,
  expectRevert,
  MAX_UINT256,
  ParseNumberTypeEnum,
  ZERO_ADDRESS,
} from '../../../ethers-test-helpers'
import {
  generateSignature,
  getCurrentBlock,
} from '../../../hardhat-test-helpers'
import { contractDeployer } from '../../utils/ContractDeployer'
import { Chance } from 'chance'
import { expect } from 'chai'

const chance = new Chance()

describe('UNIT TEST: DTKStore - purchaseItems', () => {
  it(`should throw error when the input nonce has already been consumed`, async () => {
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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await dtkStore
        .connect(buyer)
        .purchaseItems(
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
          signature,
          { value: UnitParser.toEther(payment) },
        )

      await expectRevert(
        dtkStore
          .connect(buyer)
          .purchaseItems(
            billId,
            tokenAddress,
            UnitParser.toEther(payment),
            nonce,
            sigExpireBlockNum,
            signature,
            { value: UnitParser.toEther(payment) },
          ),
        'DTKStore:InvalidNonce',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should update the user nonce comsumption status
      `, async () => {
    const [owner, buyer] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectFnReturnChange(
        dtkStore.connect(buyer).purchaseItems,
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
          functionSignature: 'nonce',
          params: [buyer.address, nonce],
          expectedBefore: false,
          expectedAfter: true,
        },
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the message hash signer is not the authedSigner`, async () => {
    const [
      owner,
      authedSigner,
      buyer,
      unauthenticatedSigner,
    ] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
      authedSignerAddress: authedSigner.address,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const billId = 1
      const tokenAddress = ZERO_ADDRESS
      const payment = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

      const signature = await generateSignature({
        signer: unauthenticatedSigner,
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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        dtkStore
          .connect(buyer)
          .purchaseItems(
            billId,
            tokenAddress,
            UnitParser.toEther(payment),
            nonce,
            sigExpireBlockNum,
            signature,
            { value: UnitParser.toEther(payment) },
          ),
        'DTKStore:InvalidSigner',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`should throw error if the message hash has already been expired`, async () => {
    const [owner, authedSigner, buyer] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
      authedSignerAddress: authedSigner.address,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

      const billId = 1
      const tokenAddress = ZERO_ADDRESS
      const payment = chance.integer({ min: 0.02, max: 2000 })
      const nonce = 0
      const sigExpireBlockNum = currentBlock.number + 1

      const signature = await generateSignature({
        signer: authedSigner,
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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
        ],
      })
      await ethers.provider.send('evm_mine', [])
      await ethers.provider.send('evm_mine', [])

      expect((await getCurrentBlock()).number).to.be.greaterThan(
        sigExpireBlockNum,
      )
      await expectRevert(
        dtkStore
          .connect(buyer)
          .purchaseItems(
            billId,
            tokenAddress,
            UnitParser.toEther(payment),
            nonce,
            sigExpireBlockNum,
            signature,
            { value: UnitParser.toEther(payment) },
          ),
        'DTKStore:SignatureExpired',
      )
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`IF pay with ether
      should emit a purchase item event with correct params `, async () => {
    const [owner, buyer] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
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
        dtkStore.connect(buyer).purchaseItems,
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
          eventSignature: 'PurchaseItems(uint256,address,uint256)',
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
  it(`IF pay with ether
      should increment the store contract balance of base ether
      `, async () => {
    const [owner, buyer] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })

    const snapshot_id = await ethers.provider.send('evm_snapshot', [])
    {
      const currentBlock = await getCurrentBlock()

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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
        ],
      })

      const beforeBalance = UnitParser.fromEther(
        await ethers.provider.getBalance(dtkStore.address),
      )

      await dtkStore
        .connect(buyer)
        .purchaseItems(
          billId,
          tokenAddress,
          UnitParser.toEther(payment),
          nonce,
          sigExpireBlockNum,
          signature,
          { value: UnitParser.toEther(payment) },
        )

      const afterBalance = UnitParser.fromEther(
        await ethers.provider.getBalance(dtkStore.address),
      )
      expect(afterBalance).to.equal(beforeBalance + payment)
    }

    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`IF pay with ERC20 token
      should emit a purchase item event with correct tokenAddress & payment params`, async () => {
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
        .mint(
          buyer.address,
          UnitParser.toBigNumber(initialBuyerBalance, await king.decimals()),
        )
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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toBigNumber(payment, await king.decimals()),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectEvent(
        dtkStore.connect(buyer).purchaseItems,
        [
          billId,
          tokenAddress,
          UnitParser.toBigNumber(payment, await king.decimals()),
          nonce,
          sigExpireBlockNum,
          signature,
        ],
        {
          contract: dtkStore,
          eventSignature: 'PurchaseItems(uint256,address,uint256)',
          eventArgs: {
            token: tokenAddress,
            payment,
          },
        },
        {
          type: ParseNumberTypeEnum.BIGNUMBER,
          decimal: await king.decimals(),
        },
      )
      await ethers.provider.send('evm_mine', [])
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`IF pay with ERC20 token
      should emit a purchase item event with correct billId params`, async () => {
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
        .mint(
          buyer.address,
          UnitParser.toBigNumber(initialBuyerBalance, await king.decimals()),
        )
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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toBigNumber(payment, await king.decimals()),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectEvent(
        dtkStore.connect(buyer).purchaseItems,
        [
          billId,
          tokenAddress,
          UnitParser.toBigNumber(payment, await king.decimals()),
          nonce,
          sigExpireBlockNum,
          signature,
        ],
        {
          contract: dtkStore,
          eventSignature: 'PurchaseItems(uint256,address,uint256)',
          eventArgs: {
            billId,
          },
        },
      )
      await ethers.provider.send('evm_mine', [])
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`IF pay with ERC20 token
      should increment the erc20 balance of the store contract`, async () => {
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
        .mint(
          buyer.address,
          UnitParser.toBigNumber(initialBuyerBalance, await king.decimals()),
        )
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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toBigNumber(payment, await king.decimals()),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectFnReturnChange(
        dtkStore.connect(buyer).purchaseItems,
        [
          billId,
          tokenAddress,
          UnitParser.toBigNumber(payment, await king.decimals()),
          nonce,
          sigExpireBlockNum,
          signature,
        ],
        {
          contract: king,
          functionSignature: 'balanceOf',
          params: [dtkStore.address],
          expectedBefore: 0,
          expectedAfter: payment,
        },
        {
          type: ParseNumberTypeEnum.ETHER,
        },
      )
      await ethers.provider.send('evm_mine', [])
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`IF pay with ERC20 token
      should throw error if the input erc20 address is not a contract`, async () => {
    const [owner, buyer, invalidErc20] = await ethers.getSigners()
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
        .mint(
          buyer.address,
          UnitParser.toBigNumber(initialBuyerBalance, await king.decimals()),
        )
      // approve all buyer king to dtkStore
      await king.connect(buyer).approve(dtkStore.address, MAX_UINT256)

      const currentBlock = await getCurrentBlock()

      const billId = 1
      const tokenAddress = invalidErc20.address
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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toBigNumber(payment, await king.decimals()),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        dtkStore
          .connect(buyer)
          .purchaseItems(
            billId,
            tokenAddress,
            UnitParser.toBigNumber(payment, await king.decimals()),
            nonce,
            sigExpireBlockNum,
            signature,
          ),
        'Address: call to non-contract',
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
  it(`IF pay with ERC20 token
      should throw error if the input erc20 address is not an valid erc20 contract`, async () => {
    const [owner, buyer] = await ethers.getSigners()
    const [dtkStore] = await contractDeployer.DTKStore({
      owner,
    })
    const [invalidErc20] = await contractDeployer.DTKStore({
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
        .mint(
          buyer.address,
          UnitParser.toBigNumber(initialBuyerBalance, await king.decimals()),
        )
      // approve all buyer king to dtkStore
      await king.connect(buyer).approve(dtkStore.address, MAX_UINT256)

      const currentBlock = await getCurrentBlock()

      const billId = 1
      const tokenAddress = invalidErc20.address
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
          'purchaseItems(uint256,address,uint256,uint256,uint256,bytes)',
          dtkStore.address,
          buyer.address,
          billId,
          tokenAddress,
          UnitParser.toBigNumber(payment, await king.decimals()),
          nonce,
          sigExpireBlockNum,
        ],
      })

      await expectRevert(
        dtkStore
          .connect(buyer)
          .purchaseItems(
            billId,
            tokenAddress,
            UnitParser.toBigNumber(payment, await king.decimals()),
            nonce,
            sigExpireBlockNum,
            signature,
          ),
        'assert.fail()',
      )
    }
    await ethers.provider.send('evm_revert', [snapshot_id])
  })
})
