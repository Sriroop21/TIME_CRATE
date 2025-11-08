import { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { contractAddress, contractABI } from '../constants';
import './CreateCrate.css';

const BACKEND_URL = 'http://localhost:3001';

declare global {
    interface Window {
        ethereum?: any
    }
}

const CreateCrate = () => {
    const [file, setFile] = useState<File | null>(null);
    const [releaseDate, setReleaseDate] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [lockType, setLockType] = useState<'self' | 'other'>('self');
    const [recipientAddress, setRecipientAddress] = useState<string>('');
    const [manualShares, setManualShares] = useState<string[]>([]);
    const [copiedShare, setCopiedShare] = useState<number | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const copyToClipboard = (text: string, shareNumber: number) => {
        navigator.clipboard.writeText(text);
        setCopiedShare(shareNumber);
        setTimeout(() => setCopiedShare(null), 2000);
    };

    const handleCreateCrate = async () => {
        if (!file || !releaseDate) {
            alert('Please select a file and a release date.');
            return;
        }
        if (!window.ethereum) {
            alert('MetaMask is not installed!');
            return;
        }

        if (lockType === 'other') {
            if (!recipientAddress || !ethers.utils.isAddress(recipientAddress)) {
                alert('Please enter a valid recipient wallet address!');
                return;
            }
        }

        try {
            setStatus('🔐 Encrypting file with AES-256...');
            
            const formData = new FormData();
            formData.append('file', file);
            
            console.log(`📤 Uploading: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

            setStatus('📤 Uploading to IPFS & distributing key shares to keeper nodes...');
            
            const uploadRes = await axios.post(`${BACKEND_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            
            const { ipfsCid, sharesDistributed, keeperUrls, manualShares: receivedShares } = uploadRes.data;
            
            if (receivedShares) {
                setManualShares(receivedShares);
            }
            
            console.log('✅ Upload successful!');
            console.log(`   IPFS CID: ${ipfsCid}`);
            console.log(`   Shares distributed: ${sharesDistributed}/5 keeper nodes`);
            console.log(`   Active keepers:`, keeperUrls);

            setStatus('⛓️ Minting TimeCrate NFT... Please approve the transaction.');
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const timeCrateContract = new ethers.Contract(contractAddress, contractABI, signer);

            const releaseTimestamp = Math.floor(new Date(releaseDate).getTime() / 1000);
            
            const recipient = lockType === 'self' 
                ? await signer.getAddress() 
                : recipientAddress;
            
            const metadata = {
                name: `TimeCrate: ${file.name}`,
                description: `Time-locked file. Unlocks on ${new Date(releaseDate).toLocaleString()}`,
                properties: {
                    filename: file.name,
                    filesize: file.size,
                    filetype: file.type,
                    releaseDate: new Date(releaseDate).toISOString(),
                    sentTo: lockType === 'other' ? recipientAddress : 'self'
                }
            };
            
            const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
            
            const tx = await timeCrateContract.createCrate(
                recipient, 
                ipfsCid, 
                releaseTimestamp, 
                tokenURI, 
                keeperUrls
            );
            
            console.log('⏳ Waiting for blockchain confirmation...');
            const receipt = await tx.wait();
            
            const tokenId = receipt.events?.find((e: any) => e.event === 'CrateCreated')?.args?.tokenId;
            
            if (lockType === 'self') {
                setStatus(
                    `✅ Success! TimeCrate #${tokenId} created!\n\n` +
                    `📦 IPFS: ${ipfsCid}\n` +
                    `🔐 ${sharesDistributed}/5 key shares distributed\n` +
                    `📅 Unlocks: ${new Date(releaseDate).toLocaleString()}\n\n` +
                    `⚠️ IMPORTANT: Check backend console for backup shares!`
                );
            } else {
                setStatus(
                    `✅ TimeCrate #${tokenId} sent to recipient!\n\n` +
                    `👤 Recipient: ${recipientAddress.substring(0, 6)}...${recipientAddress.substring(38)}\n` +
                    `📦 IPFS: ${ipfsCid}\n` +
                    `🔐 ${sharesDistributed}/5 key shares distributed\n` +
                    `📅 Unlocks: ${new Date(releaseDate).toLocaleString()}\n\n` +
                    `🔑 SHARE KEYS BELOW WITH RECIPIENT\n` +
                    `⚠️ They need Share 2 & 3 to unlock (Share 1 comes from keeper)`
                );
            }

        } catch (error: any) {
            console.error('❌ Error:', error);
            setStatus(`❌ Error: ${error.response?.data?.error || error.message}`);
        }
    };

    return (
        <div className="create-crate-container">
            <h2 className="create-crate-title">
                <span>📦</span> Create TimeCrate
            </h2>
            <p className="create-crate-subtitle">
                Upload a file and lock it until a specific date.
            </p>
            
            {/* File Selection */}
            <div className="form-section">
                <label className="section-label">
                    <span className="section-label-number">1</span>
                    Select File
                </label>
                <div className="file-upload-wrapper">
                    <input 
                        type="file" 
                        onChange={handleFileChange}
                        className="form-file-input"
                    />
                    {file && (
                        <div className="file-info">
                            <span>📄</span>
                            <strong>{file.name}</strong> 
                            <span>({(file.size / 1024).toFixed(2)} KB)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Lock Type Selection */}
            <div className="form-section">
                <label className="section-label">
                    <span className="section-label-number">2</span>
                    Lock for
                </label>
                <div className="lock-type-options">
                    <label className={`lock-type-card ${lockType === 'self' ? 'active' : ''}`}>
                        <input 
                            type="radio" 
                            value="self" 
                            checked={lockType === 'self'}
                            onChange={() => {
                                setLockType('self');
                                setRecipientAddress('');
                            }}
                        />
                        <span className="lock-type-label">Myself</span>
                    </label>
                    
                    <label className={`lock-type-card ${lockType === 'other' ? 'active' : ''}`}>
                        <input 
                            type="radio" 
                            value="other" 
                            checked={lockType === 'other'}
                            onChange={() => setLockType('other')}
                        />
                        <span className="lock-type-label">Send to someone</span>
                    </label>
                </div>

                {/* Recipient Address Input */}
                {lockType === 'other' && (
                    <div className="recipient-input-wrapper">
                        <label className="recipient-label">
                            📬 Recipient's Wallet Address
                        </label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            className="form-input"
                        />
                        {recipientAddress && !ethers.utils.isAddress(recipientAddress) && (
                            <p className="validation-message error">
                                <span>⚠️</span> Invalid Ethereum address
                            </p>
                        )}
                        {recipientAddress && ethers.utils.isAddress(recipientAddress) && (
                            <p className="validation-message success">
                                <span>✅</span> Valid address
                            </p>
                        )}
                    </div>
                )}
            </div>
            
            {/* Release Date */}
            <div className="form-section">
                <label className="section-label">
                    <span className="section-label-number">3</span>
                    Release Date & Time
                </label>
                <input
                    type="datetime-local"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="form-datetime-input"
                />
            </div>
            
            {/* Create Button */}
            <button
                className="btn-create-crate"
                onClick={handleCreateCrate}
                disabled={!!status && !status.startsWith('✅')}
            >
                <span>
                    {status && !status.startsWith('✅') ? '⏳ Processing...' : '🚀 Create TimeCrate'}
                </span>
            </button>
            
            {/* Status Message */}
            {status && (
                <div className={`status-message ${
                    status.startsWith('✅') ? 'status-success' : 
                    status.startsWith('❌') ? 'status-error' : 
                    'status-info'
                }`}>
                    {status}
                </div>
            )}

            {/* Share Keys Section */}
            {status && status.includes('SHARE KEYS BELOW') && manualShares.length === 2 && (
                <div className="share-keys-container">
                    <h3 className="share-keys-title">
                        <span>🔑</span> Key Shares for Recipient
                    </h3>
                    <p className="share-keys-description">
                        Copy these shares and send them to the recipient via <strong>WhatsApp, Signal, or Email</strong>.
                        They will need both shares + 1 from keeper to unlock the file.
                    </p>

                    {/* Share 2 */}
                    <div className="share-item">
                        <label className="share-label">Share 2:</label>
                        <div className="share-input-group">
                            <textarea
                                readOnly
                                value={manualShares[0] || ''}
                                className="share-textarea"
                            />
                            <button
                                onClick={() => copyToClipboard(manualShares[0], 2)}
                                className={`btn-copy ${copiedShare === 2 ? 'copied' : ''}`}
                            >
                                {copiedShare === 2 ? '✅ Copied!' : '📋 Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Share 3 */}
                    <div className="share-item">
                        <label className="share-label">Share 3:</label>
                        <div className="share-input-group">
                            <textarea
                                readOnly
                                value={manualShares[1] || ''}
                                className="share-textarea"
                            />
                            <button
                                onClick={() => copyToClipboard(manualShares[1], 3)}
                                className={`btn-copy ${copiedShare === 3 ? 'copied' : ''}`}
                            >
                                {copiedShare === 3 ? '✅ Copied!' : '📋 Copy'}
                            </button>
                        </div>
                    </div>

                    <div className="share-warning">
                        <p>
                            ⚠️ <strong>Important:</strong> The recipient must paste these exact shares when unlocking.
                            Store them securely until the release date!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateCrate;