import { expect } from 'chai'
import { BigNumber, BigNumberish, FixedNumber } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat'
import { VestingScheduleConfigStruct } from '../../types/contracts/ERC20VestingPool';
import { UNIT_VESTING_INTERVAL, VEST_START } from '../utils/config';
import { ERC20VestingPoolFactory } from '../utils/ERC20VestingPoolFactory';


describe.skip('Scenarios', async () => {
    it('SEED-1', async () => {
        const [owner, beneficiaryA] = await ethers.getSigners()

        // SEED-1: infinity ventures: 16,666,666 tokens, 6m lockup, 12m vesting
        const totalTokens = parseEther(
            FixedNumber.from('500000').divUnsafe(
                FixedNumber.from('0.03')
            ).toString()
        );
        const lockUpMonths = 6;
        const firstTrenchPerc = 20;
        const restInstallments = 12
        const lockupAmount = totalTokens.mul(firstTrenchPerc).div(100);
        const vestingAmount = totalTokens.sub(lockupAmount);

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
            {
                beneficiaryAddress: beneficiaryA.address,
                lockupDurationInDays: lockUpMonths * UNIT_VESTING_INTERVAL,
                lockupAmount: lockupAmount,
                vestingAmount: vestingAmount,
                vestingDurationInDays: restInstallments * 30, // 12 months
            },
        )

        const {
            vestingPool,
            addVestingScheduleTx,
            token,
        } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
            owner,
            vestingScheduleConfigs: [config],
        })

        // save launchTime for the sub-tests below, they are to be ran sequentially
        const launchTime = (await vestingPool.launchTime()).toNumber()

        // addVestingSchedule moves token into vesting pool
        expect(addVestingScheduleTx).to.changeTokenBalance(token, vestingPool.address, config.lockupAmount)

        // 0m: beneficiary cannot immediately claim tokens
        {
            await expect(
                vestingPool.connect(beneficiaryA).claim()
            ).to.be.revertedWith('No claimable balance')
        }

        // 6m+: beneficiary can claim only locked portion upon lock up period end, not vested portion
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            await ethers.provider.send('evm_mine', [launchTime + (config.lockupDuration as number) + 10])

            const claim_tx = vestingPool.connect(beneficiaryA).claim()
            // should emit event
            await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, config.lockupAmount)
            // lockupAmount should be moved from vestingPool to beneficiaryA
            await expect(claim_tx).to.changeTokenBalances(token,
                [vestingPool.address, beneficiaryA.address],
                [BigNumber.from(config.lockupAmount).mul(-1), config.lockupAmount])

            await ethers.provider.send('evm_revert', [snapshot_id])
        }

        // 7m+: beneficiary can claim locked portion + 1 month of vesting release
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            const numMonthsVested = 2;
            const lockupPlusTwoMonths = launchTime + (config.lockupDuration as number) + (config.vestingDuration as number / restInstallments) * numMonthsVested
            await ethers.provider.send('evm_mine', [lockupPlusTwoMonths])

            // first trench push vesting unlock out for a month
            const unlockedVestingTokens = BigNumber.from(config.vestingAmount).mul(numMonthsVested - 1).div(restInstallments) // having a lockup duration delays unvesting by 1 month
            const expectedClaimable = unlockedVestingTokens.add(config.lockupAmount as number)
            const claim_tx = vestingPool.connect(beneficiaryA).claim()

            // should emit event
            await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

            // lockupAmount should be moved from vestingPool to beneficiaryA
            await expect(claim_tx).to.changeTokenBalances(token,
                [vestingPool.address, beneficiaryA.address],
                [expectedClaimable.mul(-1), expectedClaimable])

            await ethers.provider.send('evm_revert', [snapshot_id])
        }

        // 8m+: beneficiary can claim locked portion + 2 months of vesting release
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            const numMonthsVested = 3;
            const lockupPlusTwoMonths = launchTime + (config.lockupDuration as number) + (config.vestingDuration as number / restInstallments) * numMonthsVested
            await ethers.provider.send('evm_mine', [lockupPlusTwoMonths])

            // first trench push vesting unlock out for a month
            const unlockedVestingTokens = BigNumber.from(config.vestingAmount).div(restInstallments).mul(numMonthsVested - 1) // having a lockup duration delays unvesting by 1 month
            const expectedClaimable = unlockedVestingTokens.add(config.lockupAmount as number)

            const claim_tx = vestingPool.connect(beneficiaryA).claim()

            // should emit event
            await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

            // lockupAmount should be moved from vestingPool to beneficiaryA
            await expect(claim_tx).to.changeTokenBalances(token,
                [vestingPool.address, beneficiaryA.address],
                [expectedClaimable.mul(-1), expectedClaimable])

            await ethers.provider.send('evm_revert', [snapshot_id])
        }

        // 18m+: beneficiary can claim locked portion + 12 months of vesting release
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            const numMonthsVested = 13;
            const lockupPlusTwoMonths = launchTime + (config.lockupDuration as number) + (config.vestingDuration as number / restInstallments) * numMonthsVested
            await ethers.provider.send('evm_mine', [lockupPlusTwoMonths])

            const fracUnlocked = Math.min(1, (numMonthsVested - 1) / restInstallments) // first trench push vesting unlock out for a month
            const unlockedVestingTokens = BigNumber.from(config.vestingAmount).mul(fracUnlocked)
            let expectedClaimable = unlockedVestingTokens.add(BigNumber.from(config.lockupAmount));

            const claim_tx = vestingPool.connect(beneficiaryA).claim()

            // should emit event
            await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

            // lockupAmount should be moved from vestingPool to beneficiaryA
            await expect(claim_tx).to.changeTokenBalances(token,
                [vestingPool.address, beneficiaryA.address],
                [expectedClaimable.mul(-1), expectedClaimable])

            expect(expectedClaimable).to.equal(BigNumber.from(config.lockupAmount).add(config.vestingAmount as BigNumberish))

            await ethers.provider.send('evm_revert', [snapshot_id])
        }

        // 9m, 18m
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            let claimed = BigNumber.from('0')

            // fast forward to 9m
            {
                const numMonthsVested = 3;
                const blockTs = launchTime + (config.lockupDuration as number) + UNIT_VESTING_INTERVAL * numMonthsVested
                await ethers.provider.send('evm_mine', [blockTs])

                // remember, first trench push vesting unlock out for a month
                let unlockedVestingTokens = BigNumber.from(config.vestingAmount).mul(numMonthsVested - 1).div(restInstallments)
                // this could exceed config.vestingAmount if numMonth > installments
                if (unlockedVestingTokens.gt(BigNumber.from(config.vestingAmount))) {
                    unlockedVestingTokens = BigNumber.from(config.vestingAmount)
                }

                let expectedClaimable = unlockedVestingTokens.add(BigNumber.from(config.lockupAmount));
                const claim_tx = vestingPool.connect(beneficiaryA).claim()
                claimed = claimed.add(expectedClaimable)

                // should emit event
                await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

                // lockupAmount should be moved from vestingPool to beneficiaryA
                await expect(claim_tx).to.changeTokenBalances(token,
                    [vestingPool.address, beneficiaryA.address],
                    [expectedClaimable.mul(-1), expectedClaimable])
            }

            // fast forward to 18m
            {
                const numMonthsVested = 13;
                const blockTs = launchTime + (config.lockupDuration as number) + UNIT_VESTING_INTERVAL * numMonthsVested
                await ethers.provider.send('evm_mine', [blockTs])

                let expectedClaimable = BigNumber.from(config.lockupAmount)
                    .add(BigNumber.from(config.vestingAmount))
                    .sub(claimed)
                const claim_tx = vestingPool.connect(beneficiaryA).claim()

                // should emit event
                await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

                // lockupAmount should be moved from vestingPool to beneficiaryA
                await expect(claim_tx).to.changeTokenBalances(token,
                    [vestingPool.address, beneficiaryA.address],
                    [expectedClaimable.mul(-1), expectedClaimable])
            }


            await ethers.provider.send('evm_revert', [snapshot_id])
        }
    });

    it('TEAM-1', async () => {
        const [owner, beneficiaryA] = await ethers.getSigners()

        // Team-1: 12 months lock-up, 12 months monthty vesting
        const totalTokens = parseEther('30000000');
        const lockUpMonths = 12;
        const firstTrenchPerc = 0;
        const restInstallments = 12;
        const lockupAmount = totalTokens.mul(firstTrenchPerc).div(100);
        const vestingAmount = totalTokens.sub(lockupAmount);

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
            {
                beneficiaryAddress: beneficiaryA.address,
                lockupDurationInDays: lockUpMonths * UNIT_VESTING_INTERVAL,
                lockupAmount: lockupAmount,
                vestingAmount: vestingAmount,
                vestingDurationInDays: restInstallments * 30,
            },
        )

        const {
            vestingPool,
            addVestingScheduleTx,
            token,
        } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
            owner,
            vestingScheduleConfigs: [config],
        })

        // save launchTime for the sub-tests below, they are to be ran sequentially
        const launchTime = (await vestingPool.launchTime()).toNumber()

        // addVestingSchedule moves token into vesting pool
        expect(addVestingScheduleTx).to.changeTokenBalance(token, vestingPool.address, config.lockupAmount)

        // 0m: beneficiary cannot immediately claim tokens
        {
            await expect(
                vestingPool.connect(beneficiaryA).claim()
            ).to.be.revertedWith('No claimable balance')
        }

        // 12m+: beneficiary can claim vested portion #1 because there's no first trench
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            const numMonthsVested = 2;
            await ethers.provider.send('evm_mine', [launchTime + (config.lockupDuration as number) + UNIT_VESTING_INTERVAL * numMonthsVested])

            const expectedClaimable = BigNumber.from(config.vestingAmount).div(restInstallments).mul(numMonthsVested);
            const claim_tx = vestingPool.connect(beneficiaryA).claim()
            // should emit event
            await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)
            // lockupAmount should be moved from vestingPool to beneficiaryA
            await expect(claim_tx).to.changeTokenBalances(token,
                [vestingPool.address, beneficiaryA.address],
                [expectedClaimable.mul(-1), expectedClaimable])

            await ethers.provider.send('evm_revert', [snapshot_id])
        }

        // 18m+: beneficiary can claim locked portion + 6 month of vesting release
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            const numMonthsVested = 6;
            await ethers.provider.send('evm_mine', [launchTime + (config.lockupDuration as number) + UNIT_VESTING_INTERVAL * numMonthsVested])

            const expectedClaimable = BigNumber.from(config.vestingAmount).div(restInstallments).mul(numMonthsVested);
            const claim_tx = vestingPool.connect(beneficiaryA).claim()

            // should emit event
            await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

            // lockupAmount should be moved from vestingPool to beneficiaryA
            await expect(claim_tx).to.changeTokenBalances(token,
                [vestingPool.address, beneficiaryA.address],
                [expectedClaimable.mul(-1), expectedClaimable])

            await ethers.provider.send('evm_revert', [snapshot_id])
        }

        // 24m+: beneficiary can claim all of the vested tokens
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            const numMonthsVested = 12;
            await ethers.provider.send('evm_mine', [launchTime + (config.lockupDuration as number) + UNIT_VESTING_INTERVAL * numMonthsVested])

            const expectedClaimable = BigNumber.from(config.vestingAmount).div(restInstallments).mul(numMonthsVested);
            const claim_tx = vestingPool.connect(beneficiaryA).claim()

            // should emit event
            await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

            // lockupAmount should be moved from vestingPool to beneficiaryA
            await expect(claim_tx).to.changeTokenBalances(token,
                [vestingPool.address, beneficiaryA.address],
                [expectedClaimable.mul(-1), expectedClaimable])

            await ethers.provider.send('evm_revert', [snapshot_id])
        }

        // claim at 18m, 24m
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            {
                const numMonthsVested = 6;
                const blockTs = launchTime + (config.lockupDuration as number) + UNIT_VESTING_INTERVAL * numMonthsVested;
                await ethers.provider.send('evm_mine', [blockTs])

                const expectedClaimable = BigNumber.from(config.vestingAmount).div(restInstallments).mul(numMonthsVested);
                const claim_tx = vestingPool.connect(beneficiaryA).claim()

                // should emit event
                await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

                // lockupAmount should be moved from vestingPool to beneficiaryA
                await expect(claim_tx).to.changeTokenBalances(token,
                    [vestingPool.address, beneficiaryA.address],
                    [expectedClaimable.mul(-1), expectedClaimable])

            }
            {
                const numMonthsVested = 12;
                const blockTs = launchTime + (config.lockupDuration as number) + UNIT_VESTING_INTERVAL * numMonthsVested;
                await ethers.provider.send('evm_mine', [blockTs])

                const expectedClaimable = BigNumber.from(config.vestingAmount).div(restInstallments).mul(numMonthsVested - 6);
                const claim_tx = vestingPool.connect(beneficiaryA).claim()

                // should emit event
                await expect(claim_tx).to.emit(vestingPool, 'ERC20Released').withArgs(token.address, expectedClaimable)

                // lockupAmount should be moved from vestingPool to beneficiaryA
                await expect(claim_tx).to.changeTokenBalances(token,
                    [vestingPool.address, beneficiaryA.address],
                    [expectedClaimable.mul(-1), expectedClaimable])

            }

            await ethers.provider.send('evm_revert', [snapshot_id])
        }
    });

    it('Re-entrancy', async () => {
        const [owner] = await ethers.getSigners()

        const totalTokens = BigNumber.from('100');
        const lockUpMonths = 6;
        const firstTrenchPerc = 1;
        const restInstallments = 99;
        const lockupAmount = totalTokens.mul(firstTrenchPerc).div(100);
        const vestingAmount = totalTokens.sub(lockupAmount);

        // re-entrancy tester
        const ReentrancyTester = await ethers.getContractFactory('ReentrancyTest')
        const tester = await ReentrancyTester.deploy()
        await tester.deployed();

        const config: VestingScheduleConfigStruct = ERC20VestingPoolFactory.generateVestingScheduleConfig(
            {
                beneficiaryAddress: tester.address,
                lockupDurationInDays: lockUpMonths * 30,
                lockupAmount: lockupAmount,
                vestingAmount: vestingAmount,
                vestingDurationInDays: restInstallments * 30,
            },
        )

        const {
            vestingPool,
            addVestingScheduleTx,
            token,
        } = await ERC20VestingPoolFactory.utilVestingScheduleCreated({
            owner,
            vestingScheduleConfigs: [config],
        })

        await tester.setPool(vestingPool.address)
        await tester.setKing(token.address)

        // save launchTime for the sub-tests below, they are to be ran sequentially
        const launchTime = (await vestingPool.launchTime()).toNumber()

        // addVestingSchedule moves token into vesting pool
        expect(addVestingScheduleTx).to.changeTokenBalance(token, vestingPool.address, config.lockupAmount)

        // 12m+: beneficiary can claim vested portion #1 because there's no first trench
        {
            const snapshot_id = await ethers.provider.send('evm_snapshot', [])
            const numMonthsVested = 7;
            await ethers.provider.send('evm_mine', [launchTime + (config.lockupDuration as number) + UNIT_VESTING_INTERVAL * numMonthsVested])

            const expectedClaimable = BigNumber.from(7)

            await expect(
                () => tester.start()
            ).to.changeTokenBalances(token,
                [vestingPool.address, tester.address],
                [expectedClaimable.mul(-1), expectedClaimable]
            )

            await ethers.provider.send('evm_revert', [snapshot_id])
        }

    });

    it('Factory', async () => {
        const [acc1, acc2] = await ethers.getSigners();
        const KingToken = await ethers.getContractFactory('King')
        const king = await KingToken.deploy()
        await king.deployed();

        // deploy factory, use event to find created contract addresses
        // alternatively, use etherscan on mainnet if deployed from gnosis bytecode
        const KingFactory = await ethers.getContractFactory('KingVestingPoolFactory')
        const factory = await KingFactory.connect(acc2).deploy(acc1.address)
        await factory.deployed();

        // const tx1 = await factory.connect(acc2).transferOwnership(acc1.address)
        // await tx1.wait();

        const tx = await factory.connect(acc1).createPools(king.address, VEST_START, 54 / 2, {
            gasLimit: 30000000
        })
        // const receipt = await tx.wait()
        // console.log('Gas used', receipt.gasUsed) // 1046748


        // const pools = (receipt as any).events.filter((e: any) => e.event === 'PoolCreated').map((e: any) => e.args[0])
        // console.log(pools);
        // // in constructor, 19304895 x2


    });
});