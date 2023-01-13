// contracts/King.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
// import "hardhat/console.sol";

contract MintableERC20 is ERC20 {
    uint256 public constant RESERVE = 1000000000 ether;

    constructor() ERC20("Mintable", "MTB") {
        _mint(msg.sender, RESERVE);
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
