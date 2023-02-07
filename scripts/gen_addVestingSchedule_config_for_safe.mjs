import { readFile, set_fs, utils } from 'xlsx';
import * as fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
// import { UNIT_VESTING_INTERVAL } from '../__test__/utils/config.ts' assert { type: 'js'}
const UNIT_VESTING_INTERVAL = 2592000;

const BigNumber = ethers.BigNumber;
set_fs(fs)
const ERC20VestingPoolArtifact = fs.readFileSync('artifacts/contracts/ERC20VestingPool.sol/ERC20VestingPool.json');
const abi = JSON.parse(ERC20VestingPoolArtifact).abi

const __dirname = dirname(fileURLToPath(import.meta.url));
const xlsx = readFile(__dirname + '/king_vesting.xlsx');

const sheet = xlsx.Sheets['Sheet1'];
const rows = utils.sheet_to_json(sheet);

rows.map(r => {
    let iface = new ethers.utils.Interface(abi);

    const totalToken = ethers.utils.parseEther('' + r.tokens);
    const lockupAmount = totalToken.mul(r.lockupPerc).div(100);
    // console.log('ok1', totalToken.toString(), lockupAmount.toString(), totalToken.sub(lockupAmount).toString())
    // console.log(UNIT_VESTING_INTERVAL, r.lockupMonths, r.vestingMonths)
    // console.log(UNIT_VESTING_INTERVAL * r.lockupMonths, UNIT_VESTING_INTERVAL * r.vestingMonths)
    console.log(`for ${r.pool}`)
    const config = {
        beneficiaryAddress: r.wallet,
        lockupDuration: UNIT_VESTING_INTERVAL * r.lockupMonths,
        lockupAmount,
        vestingDuration: r.vestingMonths * UNIT_VESTING_INTERVAL,
        vestingAmount: totalToken.sub(lockupAmount),
    }

    console.log(config)
    console.log(
        iface.encodeFunctionData("addVestingSchedule", config)
    )
})