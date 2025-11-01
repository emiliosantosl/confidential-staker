// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint8, euint64} from "@fhevm/solidity/lib/FHE.sol";

import {ERC7984Gold} from "./ERC7984Gold.sol";

contract Miner is ERC721Enumerable, IERC721Receiver, ReentrancyGuard, SepoliaConfig, Ownable {
    struct MinerDetails {
        euint8 power;
    }

    struct StakeInfo {
        address staker;
        uint64 stakedAt;
        uint64 lastClaim;
    }

    uint8 private constant MIN_POWER = 20;
    uint8 private constant POWER_RANGE = 81; // Inclusive range 20-100

    ERC7984Gold public immutable goldToken;
    uint256 private _nextTokenId = 1;

    mapping(uint256 => MinerDetails) private _miners;
    mapping(uint256 => StakeInfo) private _stakes;
    mapping(address => uint256[]) private _stakedTokens;
    mapping(uint256 => uint256) private _stakedTokenIndex;
    mapping(address => bool) private _hasMinted;

    event MinerMinted(address indexed minter, uint256 indexed tokenId, euint8 powerHandle);
    event MinerStaked(address indexed staker, uint256 indexed tokenId);
    event MinerUnstaked(address indexed staker, uint256 indexed tokenId);
    event GoldClaimed(address indexed staker, uint256 indexed tokenId, euint64 amountHandle);

    error MinerAlreadyMinted();
    error MinerDoesNotExist();
    error NotTokenOwner();
    error MinerNotStaked();
    error NothingToClaim();
    error InvalidGoldAddress();
    error MinerNotFoundInStakedList();

    constructor(address goldTokenAddress) ERC721("Miner", "MINER") Ownable(msg.sender) {
        if (goldTokenAddress == address(0)) {
            revert InvalidGoldAddress();
        }

        goldToken = ERC7984Gold(goldTokenAddress);
    }

    function mintMiner() external nonReentrant returns (uint256 tokenId) {
        if (_hasMinted[msg.sender]) {
            revert MinerAlreadyMinted();
        }

        _hasMinted[msg.sender] = true;

        tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(msg.sender, tokenId);

        euint8 power = _generatePower(msg.sender);
        _miners[tokenId].power = power;

        emit MinerMinted(msg.sender, tokenId, power);
    }

    function stake(uint256 tokenId) external nonReentrant {
        if (ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        _stakes[tokenId] = StakeInfo({staker: msg.sender, stakedAt: uint64(block.timestamp), lastClaim: uint64(block.timestamp)});
        _addStakedToken(msg.sender, tokenId);

        _safeTransfer(msg.sender, address(this), tokenId);

        emit MinerStaked(msg.sender, tokenId);
    }

    function unstake(uint256 tokenId) external nonReentrant {
        StakeInfo memory info = _stakes[tokenId];
        if (info.staker == address(0)) {
            revert MinerNotStaked();
        }
        if (info.staker != msg.sender) {
            revert NotTokenOwner();
        }

        _claim(tokenId, msg.sender, true);

        _removeStakedToken(msg.sender, tokenId);
        delete _stakes[tokenId];

        _safeTransfer(address(this), msg.sender, tokenId);

        emit MinerUnstaked(msg.sender, tokenId);
    }

    function claim(uint256 tokenId) external nonReentrant returns (euint64 claimedAmount) {
        claimedAmount = _claim(tokenId, msg.sender, false);
    }

    function pendingClaimableDays(uint256 tokenId) external view returns (uint64) {
        StakeInfo memory info = _stakes[tokenId];
        if (info.staker == address(0)) {
            return 0;
        }

        if (block.timestamp <= info.lastClaim) {
            return 0;
        }

        return uint64((block.timestamp - info.lastClaim) / 1 days);
    }

    function getStakeInfo(uint256 tokenId) external view returns (StakeInfo memory) {
        return _stakes[tokenId];
    }

    function hasMinted(address account) external view returns (bool) {
        return _hasMinted[account];
    }

    function walletTokens(address account) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(account);
        uint256[] memory tokens = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(account, i);
        }
        return tokens;
    }

    function stakedTokens(address account) external view returns (uint256[] memory) {
        return _stakedTokens[account];
    }

    function getMinerPower(uint256 tokenId) external view returns (euint8) {
        if (_ownerOf(tokenId) == address(0)) {
            revert MinerDoesNotExist();
        }

        return _miners[tokenId].power;
    }

    function gold() external view returns (address) {
        return address(goldToken);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _generatePower(address recipient) internal returns (euint8) {
        euint8 randomValue = FHE.randEuint8();
        euint8 range = FHE.rem(randomValue, POWER_RANGE);
        euint8 min = FHE.asEuint8(MIN_POWER);
        euint8 power = FHE.add(range, min);

        FHE.allowThis(power);
        FHE.allow(power, recipient);

        return power;
    }

    function _claim(uint256 tokenId, address account, bool allowZero) internal returns (euint64 mintedAmount) {
        StakeInfo storage info = _stakes[tokenId];
        if (info.staker == address(0)) {
            revert MinerNotStaked();
        }
        if (info.staker != account) {
            revert NotTokenOwner();
        }

        if (block.timestamp <= info.lastClaim) {
            if (allowZero) {
                return FHE.asEuint64(0);
            }
            revert NothingToClaim();
        }

        uint256 elapsed = block.timestamp - info.lastClaim;
        uint64 fullDays = uint64(elapsed / 1 days);

        if (fullDays == 0) {
            if (allowZero) {
                return FHE.asEuint64(0);
            }
            revert NothingToClaim();
        }

        info.lastClaim += fullDays * uint64(1 days);

        euint64 power = FHE.asEuint64(_miners[tokenId].power);
        euint64 daysEnc = FHE.asEuint64(fullDays);
        mintedAmount = FHE.mul(power, daysEnc);

        FHE.allowThis(mintedAmount);
        FHE.allow(mintedAmount, address(goldToken));
        FHE.allow(mintedAmount, account);

        goldToken.mintTo(account, mintedAmount);

        emit GoldClaimed(account, tokenId, mintedAmount);
    }

    function _addStakedToken(address account, uint256 tokenId) private {
        _stakedTokens[account].push(tokenId);
        _stakedTokenIndex[tokenId] = _stakedTokens[account].length - 1;
    }

    function _removeStakedToken(address account, uint256 tokenId) private {
        uint256[] storage tokens = _stakedTokens[account];
        uint256 length = tokens.length;
        if (length == 0) {
            revert MinerNotFoundInStakedList();
        }

        uint256 index = _stakedTokenIndex[tokenId];
        uint256 lastIndex = length - 1;

        if (index != lastIndex) {
            uint256 lastTokenId = tokens[lastIndex];
            tokens[index] = lastTokenId;
            _stakedTokenIndex[lastTokenId] = index;
        }

        tokens.pop();
        delete _stakedTokenIndex[tokenId];
    }
}
