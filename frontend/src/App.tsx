import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ConnectWallet from './components/ConnectWallet';
import CreateCrate from './components/CreateCrate';
import MyCrates from './components/MyCrates';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <Link to="/" className="logo">
              <h1>📦 TimeCrate</h1>
            </Link>
            <nav className="nav">
              <Link to="/" className="nav-link">Create</Link>
              <Link to="/my-crates" className="nav-link">My Crates</Link>
            </nav>
            <ConnectWallet />
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<CreateCrate />} />
            <Route path="/my-crates" element={<MyCrates />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>TimeCrate - Secure Time-Locked Content Delivery</p>
          <p className="footer-links">
            <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer">
              View on Sepolia
            </a>
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;