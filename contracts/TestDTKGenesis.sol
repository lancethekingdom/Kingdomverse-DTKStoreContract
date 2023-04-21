// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./MintableERC721.sol";

contract TestDTKGenesis is MintableERC721 {
    constructor()
        MintableERC721(
            "Test DTK Genesis",
            "TDTKG",
            "https://storage.googleapis.com/fractal-launchpad-public-assets/kingdom_labs/mint0_opensea/assets/",
            1200
        )
    {}
}
