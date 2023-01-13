// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// import "hardhat/console.sol";

struct VestingSchedule {
    bool valid;
    uint256 lockupDuration;
    uint256 lockupAmount;
    uint256 vestingDuration;
    uint256 vestingAmount;
    uint256 claimed;
}

struct VestingScheduleConfig {
    address beneficiaryAddress;
    uint256 lockupDuration;
    uint256 lockupAmount;
    uint256 vestingDuration;
    uint256 vestingAmount;
}

contract KingVestingPool is Ownable {
    using SafeMath for uint256;

    event EtherReleased(uint256 amount);
    event ERC20Released(address indexed token, uint256 amount);

    IERC20 immutable _king;
    // one month
    uint256 public constant UNIT_VESTING_INTERVAL = 2592000;
    uint256 public immutable launchTime;

    mapping(address => VestingSchedule) private _vestingSchedules;

    /**
     * @dev Set the beneficiary, start timestamp and vesting duration of the vesting wallet.
     */
    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "Invalid Token Address");

        _king = IERC20(tokenAddress);
        launchTime = block.timestamp;
    }

    function getKingTokenAddress() external view returns (address) {
        return address(_king);
    }

    function addVestingSchedule(VestingScheduleConfig memory _config)
        public
        onlyOwner
    {
        require(
            _config.beneficiaryAddress != address(0),
            "Beneficiary is zero address"
        );

        VestingSchedule storage vestingSchedule = _vestingSchedules[
            _config.beneficiaryAddress
        ];
        require(!vestingSchedule.valid, "Vesting schedule already exists");

        uint256 totalVestingSum = _config.vestingAmount.add(
            _config.lockupAmount
        );
        require((totalVestingSum) > 0, "Invalid vesting amount");
        bool success = _king.transferFrom(
            msg.sender,
            address(this),
            totalVestingSum
        );
        require(success, "Token transfer failed");

        vestingSchedule.valid = true;
        vestingSchedule.vestingAmount = _config.vestingAmount;
        vestingSchedule.lockupAmount = _config.lockupAmount;
        vestingSchedule.lockupDuration = _config.lockupDuration;
        vestingSchedule.vestingDuration = _config.vestingDuration;
    }

    function getAddress() external view returns (address) {
        return address(this);
    }

    function addVestingSchedules(VestingScheduleConfig[] memory _configs)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < _configs.length; i++) {
            addVestingSchedule(_configs[i]);
        }
    }

    function getVestingSchedule(address _beneficiaryAddress)
        external
        view
        returns (VestingSchedule memory)
    {
        return _vestingSchedules[_beneficiaryAddress];
    }

    function _getLockupReleased(address beneficiary)
        internal
        view
        returns (uint256)
    {
        VestingSchedule storage schedule = _vestingSchedules[beneficiary];
        if (block.timestamp < (schedule.lockupDuration.add(launchTime))) {
            return 0;
        }
        return schedule.lockupAmount;
    }

    function _getVestingReleased(address beneficiary)
        internal
        view
        returns (uint256)
    {
        VestingSchedule storage schedule = _vestingSchedules[beneficiary];

        uint256 vestingStartTime = schedule.lockupDuration.add(launchTime);

        if (block.timestamp < vestingStartTime) {
            return 0;
        }

        uint256 vestingEndTime = schedule.vestingDuration.add(vestingStartTime);
        if (block.timestamp >= vestingEndTime) {
            return schedule.vestingAmount;
        }

        uint256 unitVestingRelease = schedule
            .vestingAmount
            .mul(UNIT_VESTING_INTERVAL)
            .div(schedule.vestingDuration);
        uint256 numOfVestingIntervalCompleted = (
            block.timestamp.sub(vestingStartTime)
        ).div(UNIT_VESTING_INTERVAL);

        return unitVestingRelease.mul(numOfVestingIntervalCompleted);
    }

    function getTotalReleased() public view returns (uint256) {
        return
            _getLockupReleased(msg.sender).add(_getVestingReleased(msg.sender));
    }

    function getClaimable() public view returns (uint256) {
        VestingSchedule storage schedule = _vestingSchedules[msg.sender];
        return getTotalReleased().sub(schedule.claimed);
    }

    function claim() external {
        uint256 clamable = getClaimable();

        require(clamable > 0, "No claimable balance");
        VestingSchedule storage schedule = _vestingSchedules[msg.sender];
        schedule.claimed += clamable;
        bool success = _king.transfer(msg.sender, clamable);
        require(success, "Token transfer failed");
    }
}
