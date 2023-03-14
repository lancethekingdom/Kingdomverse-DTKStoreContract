// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

library DTKStoreErrorCodes {
    string constant InvalidInterface = "DTKStore:InvalidInterface";
    string constant InvalidNonce = "DTKStore:InvalidNonce";
    string constant InvalidSigner = "DTKStore:InvalidSigner";
}

contract DTKStore is Ownable {
    using ECDSA for bytes32;
    using ERC165Checker for address;
    // using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    event PurchaseItem(address indexed token, uint256 amount);

    // ─── Variables ───────────────────────────────────────────────────────────────

    /**
     * Access Right Management
     */
    address _authedSigner;
    uint256 public _sigValidBlockNum = 200; // 200 block for a signature to be valid
    mapping(address => Counters.Counter) internal _nonces; // Mapping from account to its current consumable nonce

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Constructor ─────────────────────────────────────────────────────────────

    /**
     * @param authedSigner_ The authorized signer to sign all the authed signature
     * @param sigValidBlockNum_ The number of valid blocks for a authed signature last
     * ! Requirements:
     * ! Input manager_ must pass the validation of interfaceGuard corresponding to the ISoulhubManager interface
     * * Operations:
     * * Initialize the _authSigner variable
     * * Initialize the _sigValidBlockNum variable
     */
    constructor(address authedSigner_, uint256 sigValidBlockNum_) {
        require(authedSigner_ != address(0), "Invalid Token Address");

        _authedSigner = authedSigner_;
        _sigValidBlockNum = sigValidBlockNum_;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Modifiers ───────────────────────────────────────────────────────────────

    /**
     * @dev Ensure the address is implemented with correct Interface
     * @param account_ The target account for validation
     * @param interfaceId_ the interfaceId to validate
     * ! Requirements:
     * ! Input account_ must be a valid address
     * ! Input account_ must supports the interface of interfaceId_
     */
    modifier interfaceGuard(address account_, bytes4 interfaceId_) {
        require(
            account_.supportsInterface(interfaceId_),
            DTKStoreErrorCodes.InvalidInterface
        );
        _;
    }

    /**
     * @dev [Access Right Management] Ensure the nonce has not been consumed yet,
     * @param account_ The target address for validation
     * @param nonce_ the target nonce to validate
     * ! Requirements:
     * ! The nonce_ must be available corresponding to account_
     * * Operations:
     * * Update the nonce_ corresponding to account_ to True after all operations have completed
     */
    modifier nonceGuard(uint256 nonce_, address account_) {
        require(nonce(account_) == nonce_, DTKStoreErrorCodes.InvalidNonce);

        _;

        _nonces[account_].increment();
    }

    /**
     * @dev [Access Right Management] Ensure the signature is signed by the intended signer
     * @param sig_ The target signature to validate
     * @param signer_ the intended signature signer for validation
     * @param msgHash_ the intended hash of the signature message for validation
     * ! Requirements:
     * ! The signer of sig_ recovered from msgHash_ must equals to signer_
     */
    modifier signatureGuard(
        bytes memory sig_,
        address signer_,
        bytes32 msgHash_
    ) {
        require(
            msgHash_.toEthSignedMessageHash().recover(sig_) == signer_,
            DTKStoreErrorCodes.InvalidSigner
        );
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── Public Functions ──────────────────────────────────────────────────────

    /**
     * @dev [Access Right Management] Get the current consumable nonce of an account
     * @param account_ The target account to get the nonce
     * @return {Current Consumable Nonce}
     */
    function nonce(address account_) public view returns (uint256) {
        return _nonces[account_].current();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ─── External Functions ──────────────────────────────────────────────────────

    /**
     * @dev [Metadata]: Get the authed signer address
     */
    function authedSigner() external view returns (address) {
        return _authedSigner;
    }

    /**
     * @dev [Metadata]: Set the authed signer
     * ! Requirements:
     * ! The caller must be the owner
     */
    function setAuthedSigner(address authedSigner_) external onlyOwner {
        _authedSigner = authedSigner_;
    }

    // ─────────────────────────────────────────────────────────────────────

    // function getKingTokenAddress() external view returns (address) {
    //     return address(_token);
    // }

    // function addVestingSchedule(VestingScheduleConfig memory _config) public {
    //     require(
    //         _config.beneficiaryAddress != address(0),
    //         "Beneficiary is zero address"
    //     );

    //     VestingSchedule storage vestingSchedule = _vestingSchedules[
    //         _config.beneficiaryAddress
    //     ];
    //     require(!vestingSchedule.valid, "Vesting schedule already exists");

    //     uint256 totalVestingSum = _config.vestingAmount + _config.lockupAmount;
    //     require((totalVestingSum) > 0, "Invalid vesting amount");

    //     uint256 balanceBefore = _token.balanceOf(address(this));
    //     _token.safeTransferFrom(msg.sender, address(this), totalVestingSum);
    //     uint256 balanceAfter = _token.balanceOf(address(this));

    //     require(balanceAfter >= balanceBefore, "ERC20 transfer error");
    //     vestingSchedule.valid = true;
    //     vestingSchedule.vestingAmount = _config.vestingAmount;
    //     vestingSchedule.lockupAmount = _config.lockupAmount;
    //     vestingSchedule.lockupDuration = _config.lockupDuration;
    //     vestingSchedule.vestingDuration = _config.vestingDuration;
    // }

    // function getAddress() external view returns (address) {
    //     return address(this);
    // }

    // function addVestingSchedules(VestingScheduleConfig[] memory _configs)
    //     external
    //     onlyOwner
    // {
    //     for (uint256 i = 0; i < _configs.length; i++) {
    //         addVestingSchedule(_configs[i]);
    //     }
    // }

    // function getVestingSchedule(address _beneficiaryAddress)
    //     external
    //     view
    //     returns (VestingSchedule memory)
    // {
    //     return _vestingSchedules[_beneficiaryAddress];
    // }

    // function _getLockupReleased(address beneficiary)
    //     internal
    //     view
    //     returns (uint256)
    // {
    //     VestingSchedule storage schedule = _vestingSchedules[beneficiary];
    //     if (block.timestamp < (schedule.lockupDuration + launchTime)) {
    //         return 0;
    //     }
    //     return schedule.lockupAmount;
    // }

    // function _getVestingReleased(address beneficiary)
    //     internal
    //     view
    //     returns (uint256)
    // {
    //     VestingSchedule storage schedule = _vestingSchedules[beneficiary];

    //     uint256 vestingStartTime = schedule.lockupDuration + launchTime;
    //     if (schedule.lockupAmount > 0)
    //         vestingStartTime += UNIT_VESTING_INTERVAL; // having a lockup put off the vesting start time by 1 month
    //     // if there is no lockup, vesting starts from launch time (no lockup)

    //     if (block.timestamp < vestingStartTime) {
    //         return 0;
    //     }

    //     uint256 vestingEndTime = schedule.vestingDuration + vestingStartTime;
    //     if (block.timestamp >= vestingEndTime) {
    //         return schedule.vestingAmount;
    //     }

    //     return
    //         (schedule.vestingAmount *
    //             ((block.timestamp - vestingStartTime) /
    //                 UNIT_VESTING_INTERVAL)) /
    //         (schedule.vestingDuration / UNIT_VESTING_INTERVAL);
    // }

    // function getTotalReleased() public view returns (uint256) {
    //     return _getLockupReleased(msg.sender) + _getVestingReleased(msg.sender);
    // }

    // function getClaimable() public view returns (uint256) {
    //     VestingSchedule storage schedule = _vestingSchedules[msg.sender];
    //     return getTotalReleased() - schedule.claimed;
    // }

    // function claim() external {
    //     uint256 claimable = getClaimable();

    //     require(claimable > 0, "No claimable balance");
    //     VestingSchedule storage schedule = _vestingSchedules[msg.sender];
    //     schedule.claimed += claimable;
    //     _token.safeTransfer(msg.sender, claimable);
    //     emit ERC20Released(address(_token), claimable);
    // }
}
