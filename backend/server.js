
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Readable } = require('stream');
const pinataSDK = require('@pinata/sdk');
const secrets = require('secrets.js-grempe');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_API_SECRET,
});

// Multiple keeper nodes for redundancy
const KEEPER_NODES = [
  'http://localhost:4001',
  'http://localhost:4002',
  'http://localhost:4003',
  'http://localhost:4004',
  'http://localhost:4005'
];

// ========== ENCRYPTION HELPER FUNCTIONS ==========
function encryptData(buffer, key) {
  const algorithm = 'aes-256-cbc';
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  
  // Return IV + encrypted data
  return Buffer.concat([iv, encrypted]);
}

function decryptData(encryptedBuffer, keyHex) {
  const algorithm = 'aes-256-cbc';
  const keyBuffer = Buffer.from(keyHex, 'hex');
  
  // Extract IV (first 16 bytes) and encrypted data
  const iv = encryptedBuffer.slice(0, 16);
  const encryptedData = encryptedBuffer.slice(16);
  
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  
  return decrypted;
}

function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex characters = 256 bits
}

async function fetchFromIPFS(ipfsCid) {
  try {
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error fetching from IPFS:', error.message);
    throw new Error('Failed to fetch file from IPFS');
  }
}

// ========== UPLOAD ENDPOINT ==========
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing file' });
  }
  
  try {
    // Generate a random encryption key
    const encryptionKey = generateEncryptionKey();
    console.log('Generated encryption key (first 16 chars):', encryptionKey.substring(0, 16) + '...');

    // Encrypt the file
    const encryptedBuffer = encryptData(req.file.buffer, encryptionKey);
    console.log('File encrypted successfully');

    // Upload encrypted file to IPFS with original filename metadata
    const readableStream = Readable.from(encryptedBuffer);
    const options = { 
      pinataMetadata: { 
        name: `encrypted_${req.file.originalname}`,
        keyvalues: {
          originalFilename: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size.toString(),
          encryptedAt: new Date().toISOString()
        }
      } 
    };
    const result = await pinata.pinFileToIPFS(readableStream, options);
    const ipfsCid = result.IpfsHash;
    console.log('Successfully pinned encrypted file to IPFS. CID:', ipfsCid);
    console.log('Original filename:', req.file.originalname);

    // Split the encryption key into 5 shares (threshold: 3)
    const keyInHex = encryptionKey; // Already in hex format
    const shares = secrets.share(keyInHex, 5, 3);
    console.log('\n========================================');
    console.log('🔑 KEY SPLIT INTO 5 SHARES (threshold: 3)');
    console.log('========================================');
    console.log('\n📋 COPY THESE SHARES FOR MANUAL UNLOCK:\n');
    console.log('Share 1 (FULL):', shares[0]);
    console.log('\nShare 2 (FULL):', shares[1]);
    console.log('\nShare 3 (FULL):', shares[2]);
    console.log('\nShare 4 (FULL):', shares[3]);
    console.log('\nShare 5 (FULL):', shares[4]);
    console.log('\n========================================\n');

    // Distribute shares to keeper nodes
    const distributionPromises = [];
    for (let i = 0; i < Math.min(shares.length, KEEPER_NODES.length); i++) {
      console.log(`Distributing share ${i + 1} to keeper at ${KEEPER_NODES[i]}...`);
      distributionPromises.push(
        axios.post(`${KEEPER_NODES[i]}/store-share`, {
          id: ipfsCid,
          share: shares[i]
        }).catch(err => {
          console.error(`Failed to send share to keeper ${i + 1}:`, err.message);
          return null;
        })
      );
    }

    const results = await Promise.all(distributionPromises);
    const successfulDistributions = results.filter(r => r !== null).length;
    
    console.log(`Successfully distributed ${successfulDistributions}/${shares.length} shares to keepers`);

    if (successfulDistributions < 3) {
      console.error(`⚠️  WARNING: Only ${successfulDistributions}/5 keepers are online!`);
      console.error('   Need at least 3 keeper nodes running.');
      return res.status(500).json({ 
        error: 'Failed to distribute enough shares to keeper nodes. Need at least 3 keepers online.',
        successfulDistributions,
        required: 3,
        totalKeepers: KEEPER_NODES.length
      });
    }

    // Only return URLs of keepers that successfully stored shares
    const activeKeeperUrls = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i] !== null) {
        activeKeeperUrls.push(KEEPER_NODES[i]);
      }
    }

    console.log(`✅ Successfully distributed to ${successfulDistributions} keepers`);
    console.log(`   Active keepers:`, activeKeeperUrls);

    res.status(200).json({ 
      ipfsCid: ipfsCid,
      sharesDistributed: successfulDistributions,
      keeperUrls: activeKeeperUrls,
      manualShares: [shares[1], shares[2]] 
    });
  } catch (error) {
    console.error('An error occurred:', error.message);
    res.status(500).json({ 
      error: 'An error occurred during the upload/encryption/split process.',
      details: error.message 
    });
  }
});

// ========== RECONSTRUCT & DECRYPT ENDPOINT ==========
app.post('/api/reconstruct', async (req, res) => {
  const { shares, ipfsCid } = req.body;

  if (!shares || !Array.isArray(shares) || shares.length < 3) {
    return res.status(400).json({ error: 'At least 3 shares are required' });
  }

  if (!ipfsCid) {
    return res.status(400).json({ error: 'IPFS CID is required' });
  }

  try {
    console.log(`\n🔑 Reconstructing key for CID: ${ipfsCid}`);
    console.log(`Received ${shares.length} shares`);

    // Filter out empty shares
    const validShares = shares.filter(s => s && s.trim().length > 0);
    
    if (validShares.length < 3) {
      return res.status(400).json({ error: 'At least 3 valid shares are required' });
    }

    console.log('Share 1 (first 32 chars):', validShares[0].substring(0, 32) + '...');
    console.log('Share 2 (first 32 chars):', validShares[1].substring(0, 32) + '...');
    console.log('Share 3 (first 32 chars):', validShares[2].substring(0, 32) + '...');

    // Reconstruct the encryption key from shares
    let reconstructedKey;
    try {
      reconstructedKey = secrets.combine(validShares.slice(0, 3));
      console.log('✅ Key reconstructed successfully');
      console.log('Reconstructed key (first 16 chars):', reconstructedKey.substring(0, 16) + '...');
    } catch (error) {
      console.error('❌ Failed to reconstruct key:', error.message);
      return res.status(400).json({ 
        error: 'Failed to reconstruct key. Shares may be invalid or incompatible.',
        details: error.message 
      });
    }

    // Fetch encrypted file from IPFS
    console.log('📥 Fetching encrypted file from IPFS...');
    let encryptedData;
    try {
      encryptedData = await fetchFromIPFS(ipfsCid);
      console.log(`✅ Fetched encrypted file (${encryptedData.length} bytes)`);
    } catch (error) {
      console.error('❌ Failed to fetch from IPFS:', error.message);
      return res.status(500).json({ 
        error: 'Failed to fetch file from IPFS',
        details: error.message 
      });
    }

    // Decrypt the file
    console.log('🔓 Decrypting file...');
    let decryptedData;
    try {
      decryptedData = decryptData(encryptedData, reconstructedKey);
      console.log(`✅ File decrypted successfully (${decryptedData.length} bytes)`);
    } catch (error) {
      console.error('❌ Decryption failed:', error.message);
      return res.status(500).json({ 
        error: 'Decryption failed. The key may be incorrect.',
        details: error.message 
      });
    }

    // Send the decrypted file
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="decrypted_file"`);
    res.send(decryptedData);
    
    console.log('✅ Decrypted file sent to client\n');
  } catch (error) {
    console.error('❌ Reconstruction process failed:', error.message);
    res.status(500).json({ 
      error: 'An error occurred during reconstruction',
      details: error.message 
    });
  }
});

// ========== HEALTH CHECK ENDPOINTS ==========
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    keeperNodes: KEEPER_NODES,
    timestamp: new Date().toISOString()
  });
});

app.get('/keeper-status', async (req, res) => {
  const statuses = await Promise.all(
    KEEPER_NODES.map(async (url, index) => {
      try {
        await axios.get(`${url}/health`, { timeout: 2000 });
        return { keeper: index + 1, url, status: 'online' };
      } catch (error) {
        return { keeper: index + 1, url, status: 'offline' };
      }
    })
  );
  
  res.json({ keepers: statuses });
});

// ========== START SERVER ==========
app.listen(port, () => {
  console.log(`✅ TimeCrate backend server listening on http://localhost:${port}`);
  console.log(`📡 Configured keeper nodes: ${KEEPER_NODES.length}`);
  KEEPER_NODES.forEach((url, i) => {
    console.log(`   Keeper ${i + 1}: ${url}`);
  });
});