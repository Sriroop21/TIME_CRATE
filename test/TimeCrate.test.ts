import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("TimeCrate", function () {
  let timeCrate: Contract;
  let owner: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    const TimeCrateFactory = await ethers.getContractFactory("TimeCrate");
    timeCrate = await TimeCrateFactory.deploy();
    await timeCrate.deployed();
  });

  describe("Deployment and Crate Creation", function () {
    it("Should mint a new crate and set the correct owner and data", async function () {
      const ONE_DAY_IN_SECS = 24 * 60 * 60;
      const block = await ethers.provider.getBlock("latest");
      const releaseTime = block.timestamp + ONE_DAY_IN_SECS;
      const ipfsCid = "QmTestCid123";

      await timeCrate.createCrate(owner.address, ipfsCid, releaseTime, "tokenURI");

      expect(await timeCrate.ownerOf(0)).to.equal(owner.address);
      const crateInfo = await timeCrate.crateInfo(0);
      expect(crateInfo.ipfsCid).to.equal(ipfsCid);
      expect(crateInfo.releaseTime).to.equal(releaseTime);
    });

    it("Should fail if the release time is in the past", async function () {
      const block = await ethers.provider.getBlock("latest");
      const pastReleaseTime = block.timestamp - 1;

      await expect(
        timeCrate.createCrate(owner.address, "QmPastCid", pastReleaseTime, "tokenURI")
      ).to.be.revertedWith("Release time must be in the future");
    });
  });

  describe("Time-Lock Logic", function () {
    it("isReleaseReady should return false before release time", async function () {
      const ONE_DAY_IN_SECS = 24 * 60 * 60;
      const block = await ethers.provider.getBlock("latest");
      const releaseTime = block.timestamp + ONE_DAY_IN_SECS;

      await timeCrate.createCrate(owner.address, "QmTestCid123", releaseTime, "tokenURI");

      expect(await timeCrate.isReleaseReady(0)).to.be.false;
    });

    it("isReleaseReady should return true after release time has passed", async function () {
      const ONE_DAY_IN_SECS = 24 * 60 * 60;
      const block = await ethers.provider.getBlock("latest");
      const releaseTime = block.timestamp + ONE_DAY_IN_SECS;

      await timeCrate.createCrate(owner.address, "QmTestCid123", releaseTime, "tokenURI");

      // Fast-forward time
      await ethers.provider.send("evm_increaseTime", [ONE_DAY_IN_SECS]);
      await ethers.provider.send("evm_mine", []);

      expect(await timeCrate.isReleaseReady(0)).to.be.true;
    });
  });
});