import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../constants';
import './MyCrates.css';

const BACKEND_URL = 'http://localhost:3001';

interface Crate {
  tokenId: string;
  ipfsCid: string;
  releaseTime: Date;
  released: boolean;
  createdAt: Date;
  keeperUrls: string[];
  isReady: boolean;
  timeRemaining: string;
}

interface UnlockModalState {
  isOpen: boolean;
  tokenId: string;
  ipfsCid: string;
  keeperUrls: string[];
  currentStep: number;
  shares: string[];
  status: string;
  error: string;
  keeperShareFetched: boolean;
}

const MyCrates: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [crates, setCrates] = useState<Crate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unlockModal, setUnlockModal] = useState<UnlockModalState>({
    isOpen: false,
    tokenId: '',
    ipfsCid: '',
    keeperUrls: [],
    currentStep: 0,
    shares: [],
    status: '',
    error: '',
    keeperShareFetched: false
  });
  const [manualShares, setManualShares] = useState<string[]>(['', '']);

  useEffect(() => {
    loadCrates();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadCrates = async () => {
    const connected = window.ethereum?.selectedAddress;
    
    if (!connected || !window.ethereum) {
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsConnected(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      const tokenIds = await contract.tokensOfOwner(connected);
      const cratesData: Crate[] = [];

      for (let tokenId of tokenIds) {
        const info = await contract.getCrateInfo(tokenId);
        const isReady = await contract.isReleaseReady(tokenId);
        
        const crate: Crate = {
          tokenId: tokenId.toString(),
          ipfsCid: info.ipfsCid || info[0],
          releaseTime: new Date((info.releaseTime || info[1]) * 1000),
          keeperUrls: info.keeperUrls || info[2] || [],
          released: info.released || info[3] || false,
          createdAt: new Date((info.createdAt || info[4]) * 1000),
          isReady: isReady,
          timeRemaining: calculateTimeRemaining(new Date((info.releaseTime || info[1]) * 1000))
        };

        cratesData.push(crate);
      }

      cratesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setCrates(cratesData);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error loading crates:', error);
      setError('Failed to load your crates. Please try again.');
      setIsLoading(false);
    }
  };

  const calculateTimeRemaining = (releaseTime: Date): string => {
    const now = new Date();
    const diff = releaseTime.getTime() - now.getTime();

    if (diff <= 0) return 'Ready to unlock!';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const updateTimeRemaining = () => {
    setCrates(prevCrates => 
      prevCrates.map(crate => ({
        ...crate,
        timeRemaining: calculateTimeRemaining(crate.releaseTime),
        isReady: new Date() >= crate.releaseTime
      }))
    );
  };

  const openUnlockModal = (tokenId: string, ipfsCid: string, keeperUrls: string[]) => {
    console.log('🔓 Unlock button clicked!', { tokenId, ipfsCid, keeperUrls });
    
    if (!keeperUrls || keeperUrls.length === 0) {
      console.error('❌ No keeper URLs found');
      alert('Error: This TimeCrate has no keeper nodes.');
      return;
    }

    console.log('✅ Opening unlock modal');
    setUnlockModal({
      isOpen: true,
      tokenId,
      ipfsCid,
      keeperUrls,
      currentStep: 1,
      shares: [],
      status: 'Click "Fetch Share from Keeper" to get the first share, then enter 2 more manually.',
      error: '',
      keeperShareFetched: false
    });
    setManualShares(['', '']);
  };

  const closeUnlockModal = () => {
    setUnlockModal({
      isOpen: false,
      tokenId: '',
      ipfsCid: '',
      keeperUrls: [],
      currentStep: 0,
      shares: [],
      status: '',
      error: '',
      keeperShareFetched: false
    });
    setManualShares(['', '']);
  };

  const fetchShareFromKeeper = async () => {
    if (!window.ethereum) {
      setUnlockModal(prev => ({ ...prev, error: 'MetaMask not found' }));
      return;
    }

    const walletAddress = window.ethereum.selectedAddress;
    if (!walletAddress) {
      setUnlockModal(prev => ({ ...prev, error: 'Please connect your wallet' }));
      return;
    }

    setUnlockModal(prev => ({
      ...prev,
      status: 'Fetching share from keeper node...',
      error: ''
    }));

    for (let i = 0; i < unlockModal.keeperUrls.length; i++) {
      const keeperUrl = unlockModal.keeperUrls[i];
      
      try {
        const url = `${keeperUrl}/get-share/${unlockModal.ipfsCid}?requesterAddress=${walletAddress}&tokenId=${unlockModal.tokenId}`;
        
        console.log(`Fetching from Keeper ${i + 1}:`, url);
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.share) {
            console.log(`✅ Got share from Keeper ${i + 1}`);
            
            setUnlockModal(prev => ({
              ...prev,
              status: `✅ Received share from Keeper ${i + 1}. Now enter 2 more shares manually.`,
              shares: [data.share],
              keeperShareFetched: true,
              error: ''
            }));
            return;
          }
        } else {
          const errorData = await response.json();
          console.error(`❌ Keeper ${i + 1} denied:`, errorData.error);
        }
      } catch (error: any) {
        console.error(`❌ Failed to contact Keeper ${i + 1}:`, error);
      }
    }

    setUnlockModal(prev => ({
      ...prev,
      error: 'Failed to fetch share from any keeper node. Check console for details.',
      status: 'Keeper fetch failed'
    }));
  };

  const handleManualShareInput = (index: number, value: string) => {
    const newShares = [...manualShares];
    newShares[index] = value.trim();
    setManualShares(newShares);
  };

  const reconstructAndDecrypt = async () => {
    const validManualShares = manualShares.filter(s => s.length > 0);
    
    if (!unlockModal.keeperShareFetched) {
      setUnlockModal(prev => ({
        ...prev,
        error: 'Please fetch the keeper share first'
      }));
      return;
    }

    if (validManualShares.length < 2) {
      setUnlockModal(prev => ({
        ...prev,
        error: 'Please enter 2 additional shares'
      }));
      return;
    }

    const allShares = [...unlockModal.shares, ...validManualShares];

    try {
      setUnlockModal(prev => ({
        ...prev,
        status: '🔓 Reconstructing encryption key from 3 shares...'
      }));

      console.log('🔄 Reconstructing with shares:');
      console.log('Share 1 (keeper):', allShares[0].substring(0, 32) + '...');
      console.log('Share 2 (manual):', allShares[1].substring(0, 32) + '...');
      console.log('Share 3 (manual):', allShares[2].substring(0, 32) + '...');

      const response = await fetch(`${BACKEND_URL}/api/reconstruct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shares: allShares,
          ipfsCid: unlockModal.ipfsCid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Reconstruction failed');
      }

      const crate = crates.find(c => c.tokenId === unlockModal.tokenId);
      let filename = `timecrate_${unlockModal.tokenId}_decrypted`;
      
      if (crate) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const contract = new ethers.Contract(contractAddress, contractABI, provider);
          const tokenURI = await contract.tokenURI(unlockModal.tokenId);
          
          if (tokenURI.startsWith('data:application/json;base64,')) {
            const base64Data = tokenURI.split(',')[1];
            const metadata = JSON.parse(atob(base64Data));
            if (metadata.properties?.filename) {
              filename = metadata.properties.filename;
              console.log('📄 Original filename recovered:', filename);
            }
          }
        } catch (err) {
          console.warn('Could not retrieve original filename from metadata:', err);
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setUnlockModal(prev => ({
        ...prev,
        status: `✅ File decrypted successfully!\n📥 Downloaded as: ${filename}`,
        currentStep: 2
      }));

      console.log('✅ File downloaded:', filename);
      markAsReleasedOnChain();
      
    } catch (error: any) {
      console.error('❌ Reconstruction error:', error);
      setUnlockModal(prev => ({
        ...prev,
        error: `Failed to reconstruct: ${error.message}. Verify all shares are correct.`
      }));
    }
  };

  const markAsReleasedOnChain = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      const tx = await contract.markAsReleased(unlockModal.tokenId);
      await tx.wait();
      
      await loadCrates();
      
      setTimeout(() => {
        closeUnlockModal();
      }, 2000);
    } catch (err) {
      console.error('Error marking as released:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="card text-center">
        <h2>📦 My TimeCrates</h2>
        <p className="mt-2" style={{ fontSize: '1.2rem', color: '#4a5568', fontWeight: 600 }}>
          Please connect your wallet to view your crates
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card text-center">
        <h2>📦 My TimeCrates</h2>
        <div className="mt-3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ color: '#4a5568', fontWeight: 600, fontSize: '1.1rem' }}>Loading your crates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2>📦 My TimeCrates</h2>
        <div className="status-message status-error mt-2">{error}</div>
        <button className="btn btn-primary mt-2" onClick={loadCrates}>
          Try Again
        </button>
      </div>
    );
  }

  if (crates.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>📦 No TimeCrates Yet</h3>
          <p>You haven't created any time-locked crates yet.</p>
          <a href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Create Your First Crate
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>📦 My TimeCrates ({crates.length})</h2>
        <p style={{ color: '#4a5568', fontWeight: 600, fontSize: '1.1rem' }}>
          Manage and unlock your time-locked content
        </p>
      </div>

      <div className="crate-grid">
        {crates.map((crate) => (
          <div key={crate.tokenId} className="crate-card">
            <h3>TimeCrate #{crate.tokenId}</h3>
            
            <div className="crate-info">
              <div className="crate-info-item">
                <strong>Status:</strong>
                <span className={`status-badge ${
                  crate.released ? 'status-released' : 
                  crate.isReady ? 'status-ready' : 
                  'status-locked'
                }`}>
                  {crate.released ? '🎉 Released' : 
                   crate.isReady ? '🔓 Ready' : 
                   '🔒 Locked'}
                </span>
              </div>

              <div className="crate-info-item">
                <strong>IPFS CID:</strong>
                <span style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                  {crate.ipfsCid}
                </span>
              </div>

              <div className="crate-info-item">
                <strong>Created:</strong>
                <span>{crate.createdAt.toLocaleString()}</span>
              </div>

              <div className="crate-info-item">
                <strong>Release Time:</strong>
                <span>{crate.releaseTime.toLocaleString()}</span>
              </div>

              {!crate.isReady && (
                <div className="crate-info-item">
                  <strong>Time Left:</strong>
                  <span style={{ color: '#f57c00', fontWeight: 800 }}>
                    ⏰ {crate.timeRemaining}
                  </span>
                </div>
              )}

              <div className="crate-info-item">
                <strong>Keepers:</strong>
                <span>{crate.keeperUrls.length} nodes</span>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              {crate.isReady && !crate.released ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => openUnlockModal(crate.tokenId, crate.ipfsCid, crate.keeperUrls)}
                  style={{ width: '100%' }}
                >
                  🔓 Unlock Content
                </button>
              ) : crate.released ? (
                <button 
                  className="btn btn-primary"
                  disabled
                  style={{ width: '100%', opacity: 0.6 }}
                >
                  ✅ Already Retrieved
                </button>
              ) : (
                <button 
                  className="btn btn-primary"
                  disabled
                  style={{ width: '100%', opacity: 0.6 }}
                >
                  🔒 Locked until {crate.releaseTime.toLocaleDateString()}
                </button>
              )}
            </div>

            <details style={{ marginTop: '1.25rem', fontSize: '0.95rem' }}>
              <summary style={{ cursor: 'pointer', color: '#667eea', fontWeight: 700 }}>
                View Keeper Nodes
              </summary>
              {crate.keeperUrls.length > 0 ? (
                <ul style={{ marginTop: '0.75rem', paddingLeft: '1.5rem', color: '#1a202c', fontWeight: 600 }}>
                  {crate.keeperUrls.map((url, index) => (
                    <li key={index} style={{ marginTop: '0.5rem' }}>
                      {url}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ marginTop: '0.75rem', color: '#999', fontStyle: 'italic' }}>
                  No keeper URLs
                </p>
              )}
            </details>
          </div>
        ))}
      </div>

      {unlockModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>🔓 Unlock TimeCrate #{unlockModal.tokenId}</h2>
            
            <div className="modal-info-box">
              <p>
                <strong>IPFS CID:</strong> {unlockModal.ipfsCid}
              </p>
              <p>
                <strong>Keeper Nodes:</strong> {unlockModal.keeperUrls.length}
              </p>
            </div>

            <div className="modal-info-box">
              <p style={{ fontWeight: 700 }}>{unlockModal.status}</p>
            </div>

            {unlockModal.error && (
              <div className="status-message status-error">
                {unlockModal.error}
              </div>
            )}

            {unlockModal.currentStep === 1 && (
              <>
                <div className="unlock-steps">
                  <h4>📋 Unlock Process (Hybrid SSS)</h4>
                  <ol>
                    <li>Fetch 1 share automatically from keeper node</li>
                    <li>Enter 2 additional shares manually (from other keepers or backup)</li>
                    <li>System reconstructs the key and decrypts your file</li>
                  </ol>
                </div>

                <div className="modal-section">
                  <h3>Step 1: Fetch Share from Keeper</h3>
                  <button
                    onClick={fetchShareFromKeeper}
                    disabled={unlockModal.keeperShareFetched}
                    className="btn-modal-primary"
                    style={{ width: '100%' }}
                  >
                    {unlockModal.keeperShareFetched ? '✅ Share Fetched from Keeper' : '📡 Fetch Share from Keeper'}
                  </button>
                </div>

                <div className="modal-section">
                  <h3>Step 2: Enter 2 Additional Shares</h3>
                  <p style={{ fontSize: '1rem', color: '#4a5568', marginBottom: '1rem', fontWeight: 600 }}>
                    Get these shares from the backend console or other keeper nodes
                  </p>

                  {[0, 1].map((index) => (
                    <div key={index} style={{ marginBottom: '1.25rem' }}>
                      <label className="share-label">
                        Share {index + 2}:
                      </label>
                      <textarea
                        value={manualShares[index]}
                        onChange={(e) => handleManualShareInput(index, e.target.value)}
                        placeholder={`Paste share ${index + 2} here (hex string)`}
                        className="share-textarea"
                      />
                    </div>
                  ))}
                </div>

                <div className="modal-buttons">
                  <button
                    onClick={reconstructAndDecrypt}
                    disabled={!unlockModal.keeperShareFetched}
                    className="btn-modal-primary"
                  >
                    🔓 Reconstruct & Download
                  </button>
                  <button
                    onClick={closeUnlockModal}
                    className="btn-modal-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {unlockModal.currentStep === 2 && (
              <div className="success-state">
                <div className="success-icon">✅</div>
                <h3>Success!</h3>
                <p>Your file has been decrypted and downloaded.</p>
                <button
                  onClick={closeUnlockModal}
                  className="btn-modal-primary"
                  style={{ marginTop: '1.5rem' }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCrates;