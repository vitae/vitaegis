import { useState } from 'react';
import dynamic from 'next/dynamic';

const MatrixRainBackground = dynamic(
  () => import('../components/MatrixRainBackground'),
  { ssr: false }
);

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    setTimeout(() => {
      setWalletAddress('0x742d...8f3d');
      setIsConnecting(false);
    }, 1500);
  };

  return (
    <>
      <MatrixRainBackground />
      <div style={{ position: 'relative', zIndex: 10, padding: '2rem', color: 'white', fontFamily: "'Futura Book', sans-serif" }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ fontWeight: 500, fontSize: '1.5rem', color: '#00ff00', textShadow: '0 0 20px #00ff00' }}>VITAEGIS</div>
          <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none' }}>
            <li><a href="#features" style={{ color: 'white' }}>Features</a></li>
            <li><a href="#docs" style={{ color: 'white' }}>Docs</a></li>
          </ul>
        </nav>

        <header style={{ marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '4rem' }}>Enter the <span style={{ color: '#00ff00' }}>Matrix</span> of Web3</h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.8 }}>Decentralized infrastructure powered by blockchain technology.</p>
          <div style={{ marginTop
