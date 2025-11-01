import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:miner-address", "Prints the Miner contract address").setAction(async (_, hre) => {
  const deployment = await hre.deployments.get("Miner");
  console.log(`Miner address: ${deployment.address}`);
});

task("task:gold-address", "Prints the GOLD contract address").setAction(async (_, hre) => {
  const deployment = await hre.deployments.get("ERC7984Gold");
  console.log(`GOLD address: ${deployment.address}`);
});

task("task:mint-miner", "Mints a Miner NFT").setAction(async (_, hre) => {
  const { ethers } = hre;
  const minerDeployment = await hre.deployments.get("Miner");
  const miner = await ethers.getContractAt("Miner", minerDeployment.address);
  const signer = (await ethers.getSigners())[0];

  const tx = await miner.connect(signer).mintMiner();
  console.log(`Minting miner... tx: ${tx.hash}`);
  await tx.wait();
  console.log("Miner minted");
});

task("task:stake-miner", "Stakes a Miner NFT")
  .addParam("tokenId", "Token id to stake")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers } = hre;
    const minerDeployment = await hre.deployments.get("Miner");
    const miner = await ethers.getContractAt("Miner", minerDeployment.address);
    const signer = (await ethers.getSigners())[0];

    const tokenId = BigInt(taskArguments.tokenId);
    const tx = await miner.connect(signer).stake(tokenId);
    console.log(`Staking token ${tokenId}... tx: ${tx.hash}`);
    await tx.wait();
    console.log(`Token ${tokenId} staked`);
  });

task("task:claim-miner", "Claims GOLD for a Miner")
  .addParam("tokenId", "Token id to claim")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers } = hre;
    const minerDeployment = await hre.deployments.get("Miner");
    const miner = await ethers.getContractAt("Miner", minerDeployment.address);
    const signer = (await ethers.getSigners())[0];

    const tokenId = BigInt(taskArguments.tokenId);
    const tx = await miner.connect(signer).claim(tokenId);
    console.log(`Claiming GOLD for token ${tokenId}... tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Claim transaction status: ${receipt?.status}`);
  });

task("task:miner-power", "Decrypts the Miner power for a token")
  .addParam("tokenId", "Token id to inspect")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const minerDeployment = await deployments.get("Miner");
    const miner = await ethers.getContractAt("Miner", minerDeployment.address);
    const signer = (await ethers.getSigners())[0];

    const tokenId = BigInt(taskArguments.tokenId);
    const powerHandle = await miner.getMinerPower(tokenId);

    const decryptedPower = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      powerHandle,
      minerDeployment.address,
      signer,
    );

    console.log(`Miner ${tokenId} power: ${decryptedPower}`);
  });
