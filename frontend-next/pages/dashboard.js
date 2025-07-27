// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import ChatPanel from '../components/ChatPanel';
import OrderHistory from '../components/OrderHistory';
import OrderBook from '../components/OrderBook';

const TABS = {
  CHAT: 'Chat',
  ORDER_HISTORY: 'OrderHistory',
  ORDER_BOOK: 'OrderBook'
};

export default function Dashboard() {
  const { account, disconnectWallet } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TABS.CHAT);

  useEffect(() => {
    if (!account) {
      router.push('/');
    }
  }, [account, router]);

  const handleDisconnect = () => {
    disconnectWallet();
    router.push('/');
  };

  const renderActivePanel = () => {
    switch (activeTab) {
      case TABS.CHAT:
        return <ChatPanel />;
      case TABS.ORDER_HISTORY:
        return <OrderHistory />;
      case TABS.ORDER_BOOK:
        return <OrderBook />;
      default:
        return <ChatPanel />;
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-inch-blue"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - 1 Prompt Trading Platform</title>
        <meta name="description" content="Your personal trading dashboard" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-inch-blue to-inch-light-blue rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Trading Dashboard</h1>
                  <p className="text-sm text-gray-500">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
                  </p>
                </div>
              </div>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                Disconnect
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-80px)]">
          {/* Sidebar */}
          <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 p-6">
            <nav className="space-y-2">
              {Object.values(TABS).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-inch-blue to-inch-light-blue text-white shadow-lg shadow-inch-blue/25'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {tab === TABS.CHAT && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                    {tab === TABS.ORDER_HISTORY && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {tab === TABS.ORDER_BOOK && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    <span>{tab.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                </button>
              ))}
            </nav>

            {/* Sidebar Stats */}
            <div className="mt-8 p-4 bg-gradient-to-r from-inch-blue/10 to-inch-light-blue/10 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Orders:</span>
                  <span className="font-medium text-gray-800">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Volume:</span>
                  <span className="font-medium text-gray-800">$12.5K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-medium text-green-600">94.2%</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              {/* Tab Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {activeTab.replace(/([A-Z])/g, ' $1').trim()}
                </h2>
                <p className="text-gray-600">
                  {activeTab === TABS.CHAT && "Chat with our AI assistant for trading insights and support"}
                  {activeTab === TABS.ORDER_HISTORY && "View your complete trading history and transaction details"}
                  {activeTab === TABS.ORDER_BOOK && "Real-time market depth and order book data"}
                </p>
              </div>

              {/* Panel Content */}
              <div className="animate-fade-in">
                {renderActivePanel()}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}