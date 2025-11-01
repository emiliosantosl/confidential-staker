import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, deployments, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

import { ERC7984Gold, Miner } from "../types";

describe("Miner", function () {
  let miner: Miner;
  let gold: ERC7984Gold;
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;

  before(async function () {
    if (!fhevm.isMock) {
      console.warn("Skipping Miner tests: requires FHEVM mock environment");
      this.skip();
    }

    [deployer, alice] = await ethers.getSigners();
  });

  beforeEach(async function () {
    await deployments.fixture(["Miner"]);
    const minerDeployment = await deployments.get("Miner");
    const goldDeployment = await deployments.get("ERC7984Gold");

    miner = (await ethers.getContractAt("Miner", minerDeployment.address)) as Miner;
    gold = (await ethers.getContractAt("ERC7984Gold", goldDeployment.address)) as ERC7984Gold;
  });

  it("sets the Miner contract as GOLD minter", async function () {
    const currentMinter = await gold.minter();
    expect(currentMinter).to.equal(await miner.getAddress());
  });

  it("mints exactly one Miner per address with power in range", async function () {
    const mintTx = await miner.connect(alice).mintMiner();
    await mintTx.wait();

    const totalMinted = await miner.totalMinted();
    expect(totalMinted).to.equal(1n);

    expect(await miner.hasMinted(alice.address)).to.equal(true);

    const walletTokens = await miner.walletTokens(alice.address);
    expect(walletTokens).to.deep.equal([totalMinted]);

    const minerAddress = await miner.getAddress();
    const powerHandle = await miner.getMinerPower(totalMinted);
    const decryptedPower = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      powerHandle,
      minerAddress,
      alice,
    );

    expect(Number(decryptedPower)).to.be.gte(20);
    expect(Number(decryptedPower)).to.be.lte(100);

    await expect(miner.connect(alice).mintMiner()).to.be.revertedWithCustomError(miner, "MinerAlreadyMinted");
  });

  it("stakes, accrues one day of rewards, and claims GOLD", async function () {
    const mintTx = await miner.connect(alice).mintMiner();
    await mintTx.wait();

    const tokenId = await miner.totalMinted();
    const minerAddress = await miner.getAddress();
    const goldAddress = await gold.getAddress();

    const powerHandle = await miner.getMinerPower(tokenId);
    const decryptedPower = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      powerHandle,
      minerAddress,
      alice,
    );

    const stakeTx = await miner.connect(alice).stake(tokenId);
    await stakeTx.wait();

    const stakeInfo = await miner.getStakeInfo(tokenId);
    expect(stakeInfo.staker).to.equal(alice.address);

    const stakedList = await miner.stakedTokens(alice.address);
    expect(stakedList).to.deep.equal([tokenId]);

    await time.increase(24 * 60 * 60);

    const claimTx = await miner.connect(alice).claim(tokenId);
    await claimTx.wait();

    const balanceHandle = await gold.confidentialBalanceOf(alice.address);
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      balanceHandle,
      goldAddress,
      alice,
    );

    expect(BigInt(decryptedBalance)).to.equal(BigInt(decryptedPower));

    const updatedStakeInfo = await miner.getStakeInfo(tokenId);
    const pendingDays = await miner.pendingClaimableDays(tokenId);
    expect(updatedStakeInfo.lastClaim).to.be.gt(stakeInfo.lastClaim);
    expect(pendingDays).to.equal(0n);
  });

  it("rejects claim attempts before a full day has passed", async function () {
    const mintTx = await miner.connect(alice).mintMiner();
    await mintTx.wait();
    const tokenId = await miner.totalMinted();

    await miner.connect(alice).stake(tokenId);

    await expect(miner.connect(alice).claim(tokenId)).to.be.revertedWithCustomError(miner, "NothingToClaim");
  });

  it("unstakes after claiming without reverting when no new rewards", async function () {
    const mintTx = await miner.connect(alice).mintMiner();
    await mintTx.wait();
    const tokenId = await miner.totalMinted();

    await miner.connect(alice).stake(tokenId);
    await time.increase(24 * 60 * 60);
    await miner.connect(alice).claim(tokenId);

    const unstakeTx = await miner.connect(alice).unstake(tokenId);
    await unstakeTx.wait();

    expect(await miner.ownerOf(tokenId)).to.equal(alice.address);
    const info = await miner.getStakeInfo(tokenId);
    expect(info.staker).to.equal(ethers.ZeroAddress);

    const stakedAfter = await miner.stakedTokens(alice.address);
    expect(stakedAfter.length).to.equal(0);
  });
});
