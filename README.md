# Confidential Staker - Privacy-Preserving NFT Mining Game

A blockchain-based mining game that leverages Zama's Fully Homomorphic Encryption (FHE) technology to create a unique gaming experience where NFT attributes and token balances remain completely private while still enabling on-chain computation.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Advantages](#advantages)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Problems Solved](#problems-solved)
- [How It Works](#how-it-works)
- [Smart Contracts](#smart-contracts)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)
- [License](#license)

## Overview

Confidential Miner is a decentralized application (dApp) that combines NFT gaming with privacy-preserving computation. Users can mint unique Miner NFTs with encrypted power attributes, stake them to mine confidential GOLD tokens, and claim rewards - all while keeping sensitive data completely private through Fully Homomorphic Encryption.

The project demonstrates the power of confidential computing on Ethereum, where game mechanics operate on encrypted data without ever revealing sensitive information on-chain.

## Key Features

### 1. Free NFT Minting
- Each wallet can mint one free Miner NFT (ERC721)
- Miners receive a randomly generated encrypted power attribute (range: 20-100)
- Power values remain private and verifiable without decryption

### 2. Confidential Staking System
- Stake Miner NFTs to begin mining GOLD tokens
- Mining rate is directly proportional to the Miner's encrypted power attribute
- Staking timestamps and claim periods tracked transparently while balances remain private

### 3. Privacy-Preserving Rewards
- Mine encrypted GOLD tokens (ERC7984 confidential token standard)
- Daily mining rate: power value in GOLD per day
- Only the owner can decrypt and view their actual GOLD balance
- Claim accumulated rewards at any time

### 4. Fully On-Chain Privacy
- All sensitive data (power attributes, token balances) encrypted on-chain
- Computations performed on encrypted data using FHE
- No trusted third parties required for privacy
- Verifiable randomness for fair Miner generation

## Advantages

### Privacy by Design
- **Complete Confidentiality**: NFT attributes and token balances remain encrypted on-chain
- **No Information Leakage**: Competitors cannot analyze your mining power or earnings
- **Selective Disclosure**: Only you can decrypt your sensitive data
- **Privacy-Preserving Comparisons**: Game mechanics work without revealing actual values

### Fair Gameplay
- **Verifiable Randomness**: Miner power generation uses FHE-based random number generation
- **Transparent Rules**: Smart contract logic is open and auditable
- **Equal Opportunity**: Every wallet gets one free Miner NFT
- **No Pay-to-Win**: Success depends on staking strategy, not purchase power

### Technical Innovation
- **Cutting-Edge Cryptography**: Utilizes Zama's FHEVM for on-chain confidential computing
- **Gas Optimization**: Efficient FHE operations minimize transaction costs
- **Scalable Architecture**: Design supports future feature expansion
- **EVM Compatibility**: Works on Ethereum-compatible chains (Sepolia testnet)

### User Experience
- **Simple Interface**: React-based frontend with intuitive wallet integration
- **Real-Time Updates**: View staking status and claimable rewards instantly
- **Mobile-Friendly**: Responsive design for desktop and mobile devices
- **One-Click Actions**: Streamlined minting, staking, and claiming processes

## Technology Stack

### Smart Contract Layer
- **Solidity 0.8.27**: Latest stable Solidity version with Cancun EVM features
- **FHEVM (@fhevm/solidity)**: Zama's Fully Homomorphic Encryption library
- **OpenZeppelin Contracts**: Industry-standard security implementations
  - ERC721 & ERC721Enumerable for NFT functionality
  - ERC7984 for confidential token standard
  - Ownable for access control
  - ReentrancyGuard for reentrancy protection
- **Hardhat**: Development environment and testing framework

### Frontend Layer
- **React 18**: Modern UI component library
- **Vite**: Next-generation frontend build tool for fast development
- **Viem**: TypeScript interface for Ethereum
- **Ethers.js v6**: Ethereum wallet implementation and contract interactions
- **RainbowKit**: Beautiful wallet connection UI
- **Wagmi**: React hooks for Ethereum

### Encryption & Privacy
- **Zama FHEVM**: Fully Homomorphic Encryption virtual machine
- **FHE Operations**: Encrypted arithmetic, comparisons, and random number generation
- **Access Control Lists (ACL)**: Fine-grained permission management for encrypted data
- **Relayer SDK**: Bridge between frontend and FHE infrastructure

### Development Tools
- **TypeScript**: Type-safe development
- **Hardhat Deploy**: Deterministic contract deployment
- **TypeChain**: TypeScript bindings for smart contracts
- **ESLint & Prettier**: Code quality and formatting
- **Mocha & Chai**: Testing frameworks
- **Hardhat Network**: Local blockchain for testing

### Infrastructure
- **Sepolia Testnet**: Ethereum test network deployment
- **Infura**: Ethereum node infrastructure
- **Zama Gateway**: Decryption oracle and key management service
- **Relayer**: Encrypted input handling service

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  (React + Vite + RainbowKit + Ethers + Viem)               │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Web3 Interactions
             │
┌────────────▼────────────────────────────────────────────────┐
│                    Smart Contracts                          │
│  ┌─────────────────┐          ┌──────────────────┐         │
│  │  Miner Contract │◄─────────┤ ERC7984Gold Token│         │
│  │   (ERC721 NFT)  │  mints   │ (Confidential)   │         │
│  └─────────────────┘          └──────────────────┘         │
└────────────┬────────────────────────────────────────────────┘
             │
             │ FHE Operations
             │
┌────────────▼────────────────────────────────────────────────┐
│                    Zama FHEVM Layer                         │
│  ┌──────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐      │
│  │ Executor │  │  ACL   │  │ Gateway │  │   KMS    │      │
│  └──────────┘  └────────┘  └─────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Contract Architecture

#### Miner Contract (contracts/Miner.sol)
- **Type**: ERC721 NFT with staking functionality
- **Key Responsibilities**:
  - Mint unique Miner NFTs with encrypted power attributes
  - Manage NFT staking/unstaking
  - Track staking duration and reward calculations
  - Interface with GOLD token for minting rewards
- **Encrypted Data**: `euint8 power` (range: 20-100)
- **Public Data**: Staking timestamps, owner addresses, token IDs

#### ERC7984Gold Contract (contracts/ERC7984Gold.sol)
- **Type**: Confidential ERC20-like token
- **Key Responsibilities**:
  - Mint encrypted GOLD tokens to stakers
  - Maintain confidential balance ledger
  - Enforce minter-only access control
- **Encrypted Data**: All token balances
- **Access Control**: Only Miner contract can mint

### Data Flow

1. **Minting Flow**:
   ```
   User Request → Miner.mintMiner() → FHE.randEuint8() → Generate Power
   → Store Encrypted Power → Grant ACL Permissions → Emit Event
   ```

2. **Staking Flow**:
   ```
   User Stakes NFT → Transfer NFT to Contract → Record Stake Info
   → Update Staked Token Lists → Emit Staked Event
   ```

3. **Claiming Flow**:
   ```
   User Claims → Calculate Days Staked → Multiply Power × Days (FHE)
   → Mint Encrypted GOLD → Grant ACL to User → Emit Claimed Event
   ```

4. **Unstaking Flow**:
   ```
   User Unstakes → Auto-Claim Pending Rewards → Transfer NFT Back
   → Clear Stake Info → Emit Unstaked Event
   ```

## Problems Solved

### 1. On-Chain Privacy for Gaming
**Problem**: Traditional blockchain games expose all player assets, strategies, and balances publicly, creating unfair advantages and privacy concerns.

**Solution**: By leveraging FHE, Confidential Miner keeps sensitive game data (power levels, balances) encrypted on-chain while still enabling automated gameplay mechanics. Players maintain privacy without sacrificing decentralization.

### 2. Verifiable Randomness Without Oracles
**Problem**: On-chain randomness typically requires trusted oracles (Chainlink VRF) or is vulnerable to miner manipulation.

**Solution**: FHEVM's `FHE.randEuint8()` provides cryptographically secure random number generation that produces encrypted random values. The randomness is verifiable while the actual value remains private until decrypted by the authorized user.

### 3. Confidential Token Balances
**Problem**: Standard ERC20 tokens reveal all balances and transfers publicly, exposing financial privacy.

**Solution**: ERC7984 confidential token standard enables encrypted balances and transfers. Only token holders can decrypt their balances through the Access Control List (ACL) system, while the contract can still perform computations on encrypted amounts.

### 4. Fair NFT Attribute Distribution
**Problem**: Many NFT projects use off-chain metadata or reveal mechanisms that can be gamed or predicted.

**Solution**: Miner power attributes are generated on-chain using FHE randomness and immediately encrypted. The distribution is provably fair while remaining private, preventing front-running or attribute manipulation.

### 5. Gas-Efficient Confidential Computing
**Problem**: Zero-knowledge proofs and traditional cryptographic methods are often too expensive for complex on-chain computations.

**Solution**: FHEVM optimizes FHE operations for the EVM, making encrypted arithmetic, comparisons, and state management practical. The project uses scalar operations and efficient ACL patterns to minimize gas costs.

### 6. Trustless Privacy Infrastructure
**Problem**: Privacy solutions often rely on centralized mixers, trusted execution environments, or centralized key management.

**Solution**: Zama's decentralized KMS (Key Management Service) uses threshold cryptography across multiple nodes, eliminating single points of failure. No centralized party can decrypt user data.

## How It Works

### For Users

1. **Connect Wallet**: Use any Ethereum-compatible wallet (MetaMask, Rainbow, etc.) to connect to Sepolia testnet
2. **Mint Miner**: Claim your free Miner NFT (one per wallet) with a random encrypted power attribute
3. **Stake Miner**: Transfer your Miner to the staking contract to begin mining
4. **Accumulate GOLD**: Earn encrypted GOLD tokens daily based on your Miner's power level
5. **Claim Rewards**: Withdraw accumulated GOLD to your wallet at any time
6. **Unstake**: Retrieve your Miner NFT, automatically claiming all pending rewards

### Under the Hood

#### Encrypted Power Generation
```solidity
function _generatePower(address recipient) internal returns (euint8) {
    euint8 randomValue = FHE.randEuint8();          // Random 0-255
    euint8 range = FHE.rem(randomValue, 81);        // Modulo to 0-80
    euint8 min = FHE.asEuint8(20);                  // Minimum value
    euint8 power = FHE.add(range, min);             // Final: 20-100

    FHE.allowThis(power);                            // Contract access
    FHE.allow(power, recipient);                     // User access
    return power;
}
```

#### Daily Reward Calculation
```solidity
function _claim(uint256 tokenId, address account) internal returns (euint64) {
    uint64 fullDays = calculateStakedDays(tokenId);

    euint64 power = FHE.asEuint64(_miners[tokenId].power);  // Get encrypted power
    euint64 daysEnc = FHE.asEuint64(fullDays);             // Convert days to encrypted
    euint64 mintedAmount = FHE.mul(power, daysEnc);        // Multiply in encrypted space

    goldToken.mintTo(account, mintedAmount);               // Mint encrypted GOLD
    return mintedAmount;
}
```

#### Access Control Management
```solidity
// Grant permissions for encrypted values
FHE.allowThis(mintedAmount);              // Contract can use this value
FHE.allow(mintedAmount, address(goldToken));  // GOLD contract can mint it
FHE.allow(mintedAmount, account);         // User can decrypt it
```

## Smart Contracts

### Miner.sol

**Address**: `<Deployed on Sepolia after deployment>`

**Key Functions**:
- `mintMiner()`: Mint a free Miner NFT with encrypted power
- `stake(uint256 tokenId)`: Stake Miner to begin mining
- `unstake(uint256 tokenId)`: Unstake Miner and claim rewards
- `claim(uint256 tokenId)`: Claim accumulated GOLD without unstaking
- `getMinerPower(uint256 tokenId)`: Returns encrypted power (euint8)
- `pendingClaimableDays(uint256 tokenId)`: View days worth of claimable rewards
- `stakedTokens(address account)`: View all staked Miner IDs for an address
- `walletTokens(address account)`: View all unstaked Miner IDs in wallet

**Events**:
- `MinerMinted(address indexed minter, uint256 indexed tokenId, euint8 powerHandle)`
- `MinerStaked(address indexed staker, uint256 indexed tokenId)`
- `MinerUnstaked(address indexed staker, uint256 indexed tokenId)`
- `GoldClaimed(address indexed staker, uint256 indexed tokenId, euint64 amountHandle)`

### ERC7984Gold.sol

**Address**: `<Deployed on Sepolia after deployment>`

**Key Functions**:
- `setMinter(address newMinter)`: Set authorized minter (owner only)
- `mintTo(address to, euint64 encryptedAmount)`: Mint encrypted GOLD (minter only)
- Standard ERC7984 functions: `transfer`, `balanceOf`, `approve`, etc.

**Events**:
- `MinterUpdated(address indexed newMinter)`
- Standard ERC20/ERC7984 events

## Getting Started

### Prerequisites

- Node.js >= 20.x
- npm >= 7.0.0
- MetaMask or compatible Ethereum wallet
- Sepolia testnet ETH (get from [faucet](https://sepoliafaucet.com))

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd confidential-staker
   ```

2. **Install contract dependencies**:
   ```bash
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd app
   npm install
   cd ..
   ```

4. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   INFURA_API_KEY=your_infura_api_key
   PRIVATE_KEY=your_deployer_private_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

### Local Development

1. **Compile contracts**:
   ```bash
   npm run compile
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Start local blockchain**:
   ```bash
   npm run chain
   ```

4. **Deploy to local network** (in another terminal):
   ```bash
   npm run deploy:localhost
   ```

5. **Start frontend development server**:
   ```bash
   cd app
   npm run dev
   ```

6. **Access the application**:
   Open your browser to `http://localhost:5173`

## Deployment

### Deploy to Sepolia Testnet

1. **Ensure you have Sepolia ETH** in your deployer wallet

2. **Verify environment variables** are configured in `.env`

3. **Deploy contracts**:
   ```bash
   npm run deploy:sepolia
   ```

4. **Verify contracts on Etherscan**:
   ```bash
   npm run verify:sepolia
   ```

5. **Update frontend contract addresses**:
   - Copy deployed contract addresses from `deployments/sepolia/`
   - Update `app/src/config/contracts.ts` with new addresses
   - Copy ABIs from `deployments/sepolia/` to frontend

6. **Deploy frontend**:
   ```bash
   cd app
   npm run build
   # Deploy dist/ folder to your hosting service (Netlify, Vercel, etc.)
   ```

### Deployment Scripts

The project uses Hardhat Deploy for deterministic deployments:
- `deploy/deploy.ts`: Main deployment script
- Deploys ERC7984Gold first, then Miner with Gold address
- Automatically sets Miner as authorized minter on Gold token

## Testing

### Contract Tests

Run the full test suite:
```bash
npm test
```

Run tests on Sepolia testnet:
```bash
npm run test:sepolia
```

Run specific test file:
```bash
npx hardhat test test/Miner.ts
```

### Test Coverage

Generate coverage report:
```bash
npm run coverage
```

### Testing with FHE

The project includes comprehensive tests for FHE functionality:

```typescript
import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

// Decrypt encrypted values in tests
const decryptedPower = await fhevm.userDecryptEuint(
    FhevmType.euint8,
    encryptedPower,
    minerContract.address,
    signer
);

// Create encrypted inputs
const input = fhevm.createEncryptedInput(contractAddress, userAddress);
input.add32(100);
const encryptedInput = await input.encrypt();
```

### Test Scenarios

- Free mint (one per wallet)
- Duplicate mint prevention
- Random power generation (20-100 range)
- NFT staking and unstaking
- Daily reward accumulation
- Claim functionality
- Multi-day mining calculations
- Access control on encrypted data
- Reentrancy protection
- Edge cases (zero days, immediate claim, etc.)

## Security Considerations

### Smart Contract Security

1. **Reentrancy Protection**: All state-changing functions use `nonReentrant` modifier
2. **Access Control**: Ownable pattern for administrative functions
3. **Input Validation**: Comprehensive checks on all user inputs
4. **Safe Math**: Solidity 0.8.x built-in overflow protection
5. **Custom Errors**: Gas-efficient error handling
6. **Enumeration Safety**: Proper handling of staked token arrays

### FHE-Specific Security

1. **ACL Management**: Proper permission granting for encrypted values
2. **isSenderAllowed Checks**: Verify user access to encrypted inputs
3. **Initialization Verification**: Ensure encrypted values are properly initialized
4. **Scalar Operations**: Use plaintext for non-sensitive values to save gas
5. **Reorg Protection**: Consider transaction finality for critical operations

### Privacy Guarantees

- **Encrypted Power**: Miner strength hidden from competitors
- **Encrypted Balances**: GOLD holdings completely private
- **Encrypted Computations**: Rewards calculated without revealing values
- **Selective Decryption**: Only authorized parties can decrypt specific values
- **No Information Leakage**: Transaction patterns don't reveal sensitive data

### Known Limitations

1. **Gas Costs**: FHE operations are more expensive than standard EVM operations
2. **Testnet Only**: Currently deployed on Sepolia testnet, not mainnet
3. **Decryption Delay**: Asynchronous decryption requires callback patterns
4. **Limited FHE Types**: Only certain encrypted types available (euint8, euint64, etc.)

### Audit Status

**This project has not been formally audited.** Use at your own risk. Do not deploy to mainnet without professional security audit.

## Future Roadmap

### Phase 1: Enhanced Gameplay (Q2 2025)
- [ ] Multiple Miner tiers with different power ranges
- [ ] Miner marketplace for trading NFTs
- [ ] Power boost items and upgrades
- [ ] Leaderboards with privacy-preserving rankings
- [ ] Achievement system with encrypted milestones

### Phase 2: DeFi Integration (Q3 2025)
- [ ] GOLD token liquidity pools
- [ ] Encrypted yield farming
- [ ] Confidential lending protocol
- [ ] Privacy-preserving DEX integration
- [ ] Staking derivatives (staked Miner positions as collateral)

### Phase 3: Advanced Features (Q4 2025)
- [ ] Multi-chain deployment (Polygon, Arbitrum, Optimism)
- [ ] DAO governance with encrypted voting
- [ ] Miner breeding mechanics
- [ ] Quest system with encrypted rewards
- [ ] Mobile app (iOS/Android)

### Phase 4: Ecosystem Expansion (2026)
- [ ] SDK for third-party game developers
- [ ] Interoperability with other FHE projects
- [ ] Mainnet deployment (post-audit)
- [ ] Cross-game asset integration
- [ ] Confidential gaming metaverse

### Technical Improvements
- [ ] Gas optimization for FHE operations
- [ ] Advanced caching strategies
- [ ] Batch operations for multiple claims
- [ ] Upgraded frontend with real-time notifications
- [ ] GraphQL indexer for historical data
- [ ] Improved UX with loading states and error handling

### Research & Development
- [ ] Explore new FHE primitives from Zama
- [ ] Investigate homomorphic circuit optimizations
- [ ] Research ZK-FHE hybrid approaches
- [ ] Study game-theoretic implications of encrypted attributes
- [ ] Collaborate with academic institutions on FHE gaming

## Project Structure

```
confidential-staker/
├── contracts/                   # Smart contracts
│   ├── Miner.sol               # Main NFT staking contract
│   └── ERC7984Gold.sol         # Confidential token
├── deploy/                      # Deployment scripts
│   └── deploy.ts               # Hardhat deploy configuration
├── test/                        # Contract tests
│   └── Miner.ts                # Comprehensive test suite
├── tasks/                       # Hardhat tasks
│   ├── accounts.ts             # Account management
│   └── miner.ts                # Miner-specific tasks
├── app/                         # Frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── config/             # Contract ABIs and addresses
│   │   ├── hooks/              # Custom React hooks
│   │   └── styles/             # CSS files
│   ├── public/                 # Static assets
│   └── package.json            # Frontend dependencies
├── docs/                        # Documentation
│   ├── zama_llm.md            # Zama FHE guide
│   └── zama_doc_relayer.md    # Relayer documentation
├── hardhat.config.ts           # Hardhat configuration
├── package.json                # Root dependencies
├── AGENTS.md                   # Development guidelines
└── README.md                   # This file
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Note**: Please review `AGENTS.md` for project-specific development guidelines.

## Resources

### Zama Documentation
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHE Solidity Library](https://github.com/zama-ai/fhevm)
- [Relayer SDK](https://github.com/zama-ai/fhevm-relayer-sdk)

### Tools & Frameworks
- [Hardhat](https://hardhat.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Viem](https://viem.sh/)
- [RainbowKit](https://www.rainbowkit.com/)

### Community
- [Zama Discord](https://discord.com/invite/zama)
- [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)

## License

This project is licensed under the BSD-3-Clause-Clear License - see the LICENSE file for details.

## Acknowledgments

- **Zama** for pioneering Fully Homomorphic Encryption on Ethereum
- **OpenZeppelin** for secure smart contract libraries
- **Hardhat** team for excellent development tooling
- **Ethereum Foundation** for supporting privacy research

## Disclaimer

This software is provided "as is", without warranty of any kind. This is experimental technology deployed on testnet for educational and research purposes. Do not use in production without thorough security audits and testing.

---

**Built with Privacy-First Technology**

For questions, issues, or suggestions, please open an issue on GitHub.
