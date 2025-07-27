// pages/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';

export default function Home() {
  const { account, connectWallet, isConnecting } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (account) {
      router.push('/dashboard');
    }
  }, [account, router]);

  const handleConnect = async () => {
    const connectedAccount = await connectWallet();
    if (connectedAccount) {
      router.push('/dashboard');
    }
  };

  return (
    <>
      <Head>
        <title>PromptInch Dashboard</title>
        <meta name="description" content="Connect your wallet and manage your trading dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-inch-blue/20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-inch-blue/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl transform -translate-x-32 translate-y-32"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 flex justify-between items-center p-6 lg:p-8">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-inch-blue to-inch-light-blue rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">1</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-inch-blue to-inch-dark-blue bg-clip-text text-transparent">
              PromptInch Dashboard
            </span>
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="group relative px-8 py-3 bg-gradient-to-r from-inch-blue to-inch-light-blue text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-inch-blue/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-inch-light-blue to-inch-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
            <span className="relative flex items-center space-x-2">
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Connect Wallet</span>
                </>
              )}
            </span>
          </button>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            {/* Hero Section */}
            <div className="mb-8">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-inch-dark-blue via-inch-blue to-inch-light-blue bg-clip-text text-transparent leading-tight">
                Welcome to Your
                <br />
                <span className="text-4xl md:text-6xl">Prompt Trading Dashboard</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
                Connect your wallet to access advanced trading features, order history, 
                and real-time market insights in our comprehensive DeFi platform.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="group p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 hover:bg-white/90 transition-all duration-300 hover:shadow-xl hover:shadow-inch-blue/10">
                <div className="w-16 h-16 bg-gradient-to-r from-inch-blue to-inch-light-blue rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Smart Chat</h3>
                <p className="text-gray-600">AI-powered trading assistant for market insights and strategy recommendations.</p>
              </div>

              <div className="group p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 hover:bg-white/90 transition-all duration-300 hover:shadow-xl hover:shadow-inch-blue/10">
                <div className="w-16 h-16 bg-gradient-to-r from-inch-blue to-inch-light-blue rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Order History</h3>
                <p className="text-gray-600">Track all your trading activities with detailed transaction history and analytics.</p>
              </div>

              <div className="group p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 hover:bg-white/90 transition-all duration-300 hover:shadow-xl hover:shadow-inch-blue/10">
                <div className="w-16 h-16 bg-gradient-to-r from-inch-blue to-inch-light-blue rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Order Book</h3>
                <p className="text-gray-600">Real-time market depth with live buy and sell orders from the ecosystem.</p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="group relative px-12 py-4 bg-gradient-to-r from-inch-blue to-inch-light-blue text-white font-bold text-lg rounded-2xl hover:shadow-2xl hover:shadow-inch-blue/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-inch-light-blue to-inch-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                <span className="relative">
                  {isConnecting ? 'Connecting Your Wallet...' : 'Get Started Now'}
                </span>
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Secure connection with MetaMask and other Web3 wallets
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}