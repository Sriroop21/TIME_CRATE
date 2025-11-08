import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './ConnectWallet.css';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const ConnectWallet: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [network, setNetwork] = useState<string>('');

  useEffect(() => {
    checkConnection();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const network = await provider.getNetwork();
          setNetwork(network.name);
          
          localStorage.setItem('walletConnected', 'true');
          localStorage.setItem('walletAddress', accounts[0]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount('');
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('walletAddress');
    } else {
      setAccount(accounts[0]);
      localStorage.setItem('walletAddress', accounts[0]);
      window.location.reload();
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this dApp!');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();

      console.log('Connected to network:', network);
      
      if (network.chainId !== 11155111) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            alert('Please add Sepolia network to MetaMask manually.');
          }
          setIsConnecting(false);
          return;
        }
      }

      const signer = provider.getSigner();
      setAccount(accounts[0]);
      setNetwork(network.name);
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAddress', accounts[0]);
      
      console.log('✅ Wallet connected:', accounts[0]);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setNetwork('');
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    window.location.reload();
  };

  if (account) {
    return (
      <div className="wallet-connected">
        <button className="btn btn-connected" onClick={disconnectWallet}>
          {network && <span className="network-badge">{network}</span>}
          <span>🔗 {account.substring(0, 6)}...{account.substring(38)}</span>
        </button>
      </div>
    );
  }

  return (
    <button 
      className="btn btn-connect" 
      onClick={connectWallet}
      disabled={isConnecting}
    >
      <span>{isConnecting ? '⏳ Connecting...' : '🔗 Connect Wallet'}</span>
    </button>
  );
};

export default ConnectWallet;