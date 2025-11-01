import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy, execute, read } = deployments;

  const goldDeployment = await deploy("ERC7984Gold", {
    contract: "ERC7984Gold",
    args: [deployer],
    from: deployer,
    log: true,
  });

  const minerDeployment = await deploy("Miner", {
    contract: "Miner",
    args: [goldDeployment.address],
    from: deployer,
    log: true,
  });

  const currentMinter: string = await read("ERC7984Gold", "minter");
  if (currentMinter.toLowerCase() !== minerDeployment.address.toLowerCase()) {
    await execute("ERC7984Gold", { from: deployer, log: true }, "setMinter", minerDeployment.address);
  }

  console.log(`ERC7984Gold deployed at: ${goldDeployment.address}`);
  console.log(`Miner deployed at: ${minerDeployment.address}`);
};

export default func;
func.id = "deploy_miner_game";
func.tags = ["Miner"];
