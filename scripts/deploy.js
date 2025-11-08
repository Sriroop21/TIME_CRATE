const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(70));
  console.log("🚀 STARTING TIMECRATE DEPLOYMENT");
  console.log("=".repeat(70));

  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log(`\n📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await deployer.getBalance();

  console.log(`\n👤 Deployer: ${deployerAddress}`);
  console.log(`💰 Balance: ${hre.ethers.utils.formatEther(balance)} ETH`);

  // Check if balance is sufficient
  if (balance.lt(hre.ethers.utils.parseEther("0.01"))) {
    console.log("\n⚠️  WARNING: Low balance! You might need more ETH for deployment.");
  }

  console.log("\n" + "-".repeat(70));
  console.log("📦 Deploying TimeCrate contract...");
  console.log("-".repeat(70));

  // Deploy contract
  const TimeCrate = await hre.ethers.getContractFactory("TimeCrate");
  const timeCrate = await TimeCrate.deploy();

  console.log("\n⏳ Waiting for deployment transaction...");
  await timeCrate.deployed();

  console.log("\n✅ TimeCrate deployed successfully!");
  console.log(`📍 Contract Address: ${timeCrate.address}`);
  console.log(`🔗 Transaction Hash: ${timeCrate.deployTransaction.hash}`);

  // Get deployment cost
  const deployTx = await timeCrate.deployTransaction.wait();
  const gasCost = deployTx.gasUsed.mul(deployTx.effectiveGasPrice);
  console.log(`⛽ Gas Used: ${deployTx.gasUsed.toString()}`);
  console.log(`💵 Deployment Cost: ${hre.ethers.utils.formatEther(gasCost)} ETH`);

  // Verify contract info
  console.log("\n" + "-".repeat(70));
  console.log("🔍 Verifying Contract Details...");
  console.log("-".repeat(70));

  const name = await timeCrate.name();
  const symbol = await timeCrate.symbol();
  const owner = await timeCrate.owner();

  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Owner: ${owner}`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    contractAddress: timeCrate.address,
    deployer: deployerAddress,
    transactionHash: timeCrate.deployTransaction.hash,
    blockNumber: deployTx.blockNumber,
    gasUsed: deployTx.gasUsed.toString(),
    deploymentCost: hre.ethers.utils.formatEther(gasCost),
    timestamp: new Date().toISOString(),
    contractName: name,
    contractSymbol: symbol,
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save to JSON file
  const filename = `${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n💾 Deployment info saved to:");
  console.log(`   ${filepath}`);

  // Update constants file
  try {
    const constantsPath = path.join(__dirname, "..", "src", "constants.ts");
    const constantsContent = `export const contractAddress = "${timeCrate.address}";\nexport const contractABI = ${JSON.stringify(
      TimeCrate.interface.format(hre.ethers.utils.FormatTypes.json),
      null,
      2
    )};\n`;

    fs.writeFileSync(constantsPath, constantsContent);
    console.log("\n✅ Updated src/constants.ts with new contract address and ABI");
  } catch (error) {
    console.log("\n⚠️  Could not update constants.ts:", error.message);
    console.log("   Please update manually.");
  }

  // Generate etherscan verification command
  console.log("\n" + "=".repeat(70));
  console.log("📝 NEXT STEPS");
  console.log("=".repeat(70));

  if (network.name === "sepolia" || network.name === "goerli" || network.name === "mainnet") {
    console.log("\n1️⃣  Verify contract on Etherscan:");
    console.log(`   npx hardhat verify --network ${network.name} ${timeCrate.address}`);
  }

  console.log("\n2️⃣  Update your keeper.js with the new address:");
  console.log(`   CONTRACT_ADDRESS = "${timeCrate.address}"`);

  console.log("\n3️⃣  Test the deployment:");
  console.log(`   npx hardhat run scripts/check-crate.js --network ${network.name}`);

  console.log("\n4️⃣  Create a test crate:");
  console.log(`   npx hardhat run scripts/create-test-crate.js --network ${network.name}`);

  // Block explorer link
  if (network.name === "sepolia") {
    console.log("\n🔗 View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${timeCrate.address}`);
  } else if (network.name === "goerli") {
    console.log("\n🔗 View on Etherscan:");
    console.log(`   https://goerli.etherscan.io/address/${timeCrate.address}`);
  } else if (network.name === "mainnet") {
    console.log("\n🔗 View on Etherscan:");
    console.log(`   https://etherscan.io/address/${timeCrate.address}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("✨ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error("\n❌ DEPLOYMENT FAILED:");
  console.error(error);
  process.exitCode = 1;
});