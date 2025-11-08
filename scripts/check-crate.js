const hre = require("hardhat");

// --- CONFIGURATION ---
const contractAddress = "0xf2A0fC1aa5AA9943032645A0e0a06da01245D0Dc"; // Update after redeployment
const tokenIdToCheck = 0; // Change this to the ID you want to check

// This will be auto-generated after compilation
const contractABI = require("../artifacts/contracts/TimeCrate.sol/TimeCrate.json").abi;

async function main() {
  const provider = hre.ethers.provider;
  const TimeCrate = new hre.ethers.Contract(contractAddress, contractABI, provider);

  console.log("=".repeat(60));
  console.log(`📦 Fetching TimeCrate NFT #${tokenIdToCheck}`);
  console.log("=".repeat(60));

  try {
    // Check if token exists
    const owner = await TimeCrate.ownerOf(tokenIdToCheck);
    console.log(`\n✅ Token exists!`);
    console.log(`👤 Owner: ${owner}`);

    // Get complete crate info using the new getter
    const crateInfo = await TimeCrate.getCrateInfo(tokenIdToCheck);
    
    console.log("\n📋 CRATE DETAILS:");
    console.log("-".repeat(60));
    console.log(`IPFS CID:       ${crateInfo.ipfsCid}`);
    console.log(`Created At:     ${new Date(crateInfo.createdAt * 1000).toLocaleString()}`);
    console.log(`Release Time:   ${new Date(crateInfo.releaseTime * 1000).toLocaleString()}`);
    console.log(`Status:         ${crateInfo.released ? '🎉 Released' : '🔒 Locked'}`);
    
    // Check if ready to release
    const isReady = await TimeCrate.isReleaseReady(tokenIdToCheck);
    console.log(`Release Ready:  ${isReady ? '✅ Yes' : '⏳ Not yet'}`);
    
    if (!isReady) {
      const timeUntil = await TimeCrate.getTimeUntilRelease(tokenIdToCheck);
      const hours = Math.floor(timeUntil / 3600);
      const minutes = Math.floor((timeUntil % 3600) / 60);
      const seconds = timeUntil % 60;
      console.log(`Time Remaining: ${hours}h ${minutes}m ${seconds}s`);
    }

    // Display keeper URLs
    console.log("\n🔐 KEEPER NODES:");
    console.log("-".repeat(60));
    const keeperUrls = crateInfo.keeperUrls;
    if (keeperUrls && keeperUrls.length > 0) {
      keeperUrls.forEach((url, index) => {
        console.log(`  [${index + 1}] ${url}`);
      });
      console.log(`\n  Total Keepers: ${keeperUrls.length}`);
    } else {
      console.log("  ⚠️  No keeper URLs found!");
    }

    // Get token URI
    try {
      const uri = await TimeCrate.tokenURI(tokenIdToCheck);
      console.log("\n🖼️  TOKEN URI:");
      console.log("-".repeat(60));
      console.log(uri);
    } catch (e) {
      console.log("\n⚠️  Token URI not available");
    }

    // Get total supply
    const totalSupply = await TimeCrate.totalSupply();
    console.log("\n📊 CONTRACT STATS:");
    console.log("-".repeat(60));
    console.log(`Total Crates:   ${totalSupply}`);

  } catch (error) {
    console.error("\n❌ Error fetching crate info:");
    console.error(error.message);
  }

  console.log("\n" + "=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});