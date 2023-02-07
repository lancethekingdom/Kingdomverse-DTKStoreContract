// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20VestingPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract KingVestingPoolFactory is Ownable {
    event PoolCreated(address addr);

    constructor(address newOwner) Ownable() {
        _transferOwnership(newOwner);
    }

    // constructor (
    function createPools (
        address tokenAddress,
        uint256 launchTime,
        uint n
    ) public onlyOwner {
    // ) {
        for (uint i = 0; i < n; i++) {
        //    new ERC20VestingPool(tokenAddress, launchTime);
            emit PoolCreated(address(new ERC20VestingPool(tokenAddress, launchTime)));
        }
    }
}