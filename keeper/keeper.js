
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
if (!SEPOLIA_RPC_URL) {
    throw new Error("Missing SEPOLIA_RPC_URL in keeper/.env file");
}

const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);

const CONTRACT_ADDRESS = "0xf2A0fC1aa5AA9943032645A0e0a06da01245D0Dc"; 
const CONTRACT_ABI = [
  {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "approved",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "ApprovalForAll",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_fromTokenId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_toTokenId",
          "type": "uint256"
        }
      ],
      "name": "BatchMetadataUpdate",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "ipfsCid",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "releaseTime",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string[]",
          "name": "keeperUrls",
          "type": "string[]"
        }
      ],
      "name": "CrateCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "releasedAt",
          "type": "uint256"
        }
      ],
      "name": "CrateReleased",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "MetadataUpdate",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "crateInfo",
      "outputs": [
        {
          "internalType": "string",
          "name": "ipfsCid",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "releaseTime",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "released",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_recipient",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "_ipfsCid",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_releaseTime",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_tokenURI",
          "type": "string"
        },
        {
          "internalType": "string[]",
          "name": "_keeperUrls",
          "type": "string[]"
        }
      ],
      "name": "createCrate",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "getApproved",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "getCrateInfo",
      "outputs": [
        {
          "internalType": "string",
          "name": "ipfsCid",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "releaseTime",
          "type": "uint256"
        },
        {
          "internalType": "string[]",
          "name": "keeperUrls",
          "type": "string[]"
        },
        {
          "internalType": "bool",
          "name": "released",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "getKeeperUrls",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "getTimeUntilRelease",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        }
      ],
      "name": "isApprovedForAll",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "isReleaseReady",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "markAsReleased",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "ownerOf",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "setApprovalForAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "tokenURI",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_owner",
          "type": "address"
        }
      ],
      "name": "tokensOfOwner",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
];

const timeCrateContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const PORT = process.env.KEEPER_PORT || 4001;

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for key shares
const keyShareStore = {}; // Format: { "ipfsCid": "shareData" }

// ========== STORE SHARE ENDPOINT ==========
app.post('/store-share', (req, res) => {
    const { id, share } = req.body; // id is the IPFS CID
    
    if (!id || !share) {
        return res.status(400).json({ error: 'Missing id (IPFS CID) or share' });
    }
    
    keyShareStore[id] = share;
    console.log(`\n✅ Stored share for CID: ${id}`);
    console.log(`📋 FULL SHARE (copy this for manual unlock):\n`);
    console.log(share);
    console.log('\n');
    
    res.status(200).json({ message: 'Share stored successfully' });
});

// ========== GET SHARE ENDPOINT (WITH BLOCKCHAIN VERIFICATION) ==========
app.get('/get-share/:id', async (req, res) => {
    const { id } = req.params; // IPFS CID
    const { requesterAddress, tokenId } = req.query;

    if (!requesterAddress || tokenId === undefined) {
        return res.status(400).json({ 
            error: 'Missing requester address or tokenId in query params' 
        });
    }

    // Check if we have the share
    const share = keyShareStore[id];
    if (!share) {
        return res.status(404).json({ 
            error: 'Share not found for this CID',
            cid: id 
        });
    }

    console.log(`\n🔍 Share request for CID: ${id}`);
    console.log(`   Requester: ${requesterAddress}`);
    console.log(`   Token ID: ${tokenId}`);

    try {
        // Step 1: Verify ownership
        console.log('   Verifying ownership on blockchain...');
        const owner = await timeCrateContract.ownerOf(tokenId);
        
        if (owner.toLowerCase() !== requesterAddress.toLowerCase()) {
            console.log(`   ❌ DENIED: Requester is not the owner`);
            console.log(`      Owner: ${owner}`);
            console.log(`      Requester: ${requesterAddress}`);
            return res.status(403).json({ 
                error: 'Forbidden: You are not the owner of this TimeCrate NFT',
                owner: owner,
                requester: requesterAddress
            });
        }
        console.log('   ✅ Ownership verified');

        // Step 2: Verify release time has passed
        console.log('   Checking release time...');
        const isReady = await timeCrateContract.isReleaseReady(tokenId);
        
        if (!isReady) {
            const timeUntilRelease = await timeCrateContract.getTimeUntilRelease(tokenId);
            console.log(`   ❌ DENIED: Release time not reached`);
            console.log(`      Time remaining: ${timeUntilRelease} seconds`);
            return res.status(401).json({ 
                error: 'Unauthorized: The release time has not yet passed',
                timeRemaining: timeUntilRelease.toString()
            });
        }
        console.log('   ✅ Release time verified');

        // Step 3: All checks passed - release the share
        console.log('   🎉 ALL CHECKS PASSED - Releasing share');
        console.log(`   Share (first 32 chars): ${share.substring(0, 32)}...\n`);
        
        res.status(200).json({ 
            share: share,
            message: 'Share released successfully'
        });

    } catch (error) {
        console.error('   ❌ Blockchain verification failed:', error.message);
        res.status(500).json({ 
            error: 'Error during blockchain verification',
            details: error.message 
        });
    }
});

// ========== HEALTH CHECK ENDPOINT ==========
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        port: PORT,
        storedShares: Object.keys(keyShareStore).length,
        timestamp: new Date().toISOString()
    });
});

// ========== LIST STORED SHARES (FOR DEBUGGING) ==========
app.get('/list-shares', (req, res) => {
    const shares = Object.keys(keyShareStore).map(cid => ({
        cid: cid,
        sharePreview: keyShareStore[cid].substring(0, 32) + '...'
    }));
    
    res.json({ 
        totalShares: shares.length,
        shares: shares 
    });
});

// ========== START KEEPER NODE ==========
app.listen(PORT, () => {
    console.log(`\n🔒 ========================================`);
    console.log(`   KEEPER NODE STARTED`);
    console.log(`   Port: ${PORT}`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Network: Sepolia`);
    console.log(`========================================\n`);
});