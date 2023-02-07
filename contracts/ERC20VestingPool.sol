// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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

contract ERC20VestingPool is Ownable {
    event ERC20Released(address indexed token, uint256 amount);

    IERC20 immutable _token;
    uint256 public constant UNIT_VESTING_INTERVAL = 2592000; // 30 days
    uint256 public immutable launchTime;

    mapping(address => VestingSchedule) private _vestingSchedules;

    /**
     * @dev Set the beneficiary, start timestamp and vesting duration of the vesting wallet.
     */
    constructor(address tokenAddress, uint _launchTime) {
        require(tokenAddress != address(0), "Invalid Token Address");

        _token = IERC20(tokenAddress);
        launchTime = _launchTime;
    }

    function getKingTokenAddress() external view returns (address) {
        return address(_token);
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

        uint256 totalVestingSum = _config.vestingAmount + _config.lockupAmount;
        require((totalVestingSum) > 0, "Invalid vesting amount");
        bool success = _token.transferFrom(
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
        if (block.timestamp < (schedule.lockupDuration + launchTime)) {
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

        uint256 vestingStartTime = schedule.lockupDuration + launchTime;
        if (schedule.lockupAmount > 0) vestingStartTime += UNIT_VESTING_INTERVAL; // having a lockup put off the vesting start time by 1 month
        // if there is no lockup, vesting starts from launch time (no lockup)

        if (block.timestamp < vestingStartTime) {
            return 0;
        }

        uint256 vestingEndTime = schedule.vestingDuration + vestingStartTime;
        if (block.timestamp >= vestingEndTime) {
            return schedule.vestingAmount;
        }

        return schedule.vestingAmount * ((block.timestamp - vestingStartTime) / UNIT_VESTING_INTERVAL) / (schedule.vestingDuration / UNIT_VESTING_INTERVAL);
    }

    function getTotalReleased() public view returns (uint256) {
        return
            _getLockupReleased(msg.sender) + _getVestingReleased(msg.sender);
    }

    function getClaimable() public view returns (uint256) {
        VestingSchedule storage schedule = _vestingSchedules[msg.sender];
        return getTotalReleased() - schedule.claimed;
    }

    function claim() external {
        uint256 claimable = getClaimable();

        require(claimable > 0, "No claimable balance");
        VestingSchedule storage schedule = _vestingSchedules[msg.sender];
        schedule.claimed += claimable;
        bool success = _token.transfer(msg.sender, claimable);
        emit ERC20Released(address(_token), claimable);
        require(success, "Token transfer failed");
    }
}
