// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20VestingPool.sol";
import "./King.sol";
import "hardhat/console.sol";

contract ReentrancyTest {
    uint256 public count = 0;
    ERC20VestingPool pool;
    King king;

    constructor() payable {}

    function setPool(address target) public {
        pool = ERC20VestingPool(target);
    }

    function setKing(address target) public {
        king = King(target);
    }

    function start() public {
        console.log("start");
        pool.claim();
    }

    fallback() external payable {
        console.log("fallback");
        count++;
        if (count < 3) pool.claim();
    }

    receive() external payable {
        console.log("receive");
        count++;
        if (count < 3) pool.claim();
    }
}
