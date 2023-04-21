// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./MintableERC721.sol";

contract TestMonkeyLegends is MintableERC721 {
    constructor()
        MintableERC721(
            "Test Monkey Legends",
            "TML",
            "https://meta.monkeykingdom.io/3/",
            7000
        )
    {}
}
