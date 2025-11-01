// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC7984Gold is ERC7984, SepoliaConfig, Ownable {
    address public minter;

    event MinterUpdated(address indexed newMinter);

    error UnauthorizedMinter();
    error ZeroAddressMinter();

    constructor(address initialOwner) ERC7984("gold", "GOLD", "") Ownable(initialOwner) {}

    function setMinter(address newMinter) external onlyOwner {
        if (newMinter == address(0)) {
            revert ZeroAddressMinter();
        }

        minter = newMinter;
        emit MinterUpdated(newMinter);
    }

    function mintTo(address to, euint64 encryptedAmount) external returns (euint64 mintedAmount) {
        if (msg.sender != minter) {
            revert UnauthorizedMinter();
        }

        return _mint(to, encryptedAmount);
    }
}
