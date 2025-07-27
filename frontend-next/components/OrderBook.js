import { useState, useEffect } from 'react';

export default function OrderBook() {
  const [orderBookData, setOrderBookData] = useState({ bids: [], asks: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState('ETH/USDC');

  // Mock API data for order book
  const mockOrderBookData = {
    'ETH/USDC': {
      bids: [
        { price: 2845.50, amount: 5.25, total: 14939.89 },
        { price: 2844.75, amount: 3.12, total: 8875.62 },
        { price: 2844.00, amount: 8.90, total: 25311.60 },
        { price: 2843.25, amount: 2.15, total: 6112.99 },
        { price: 2842.50, amount: 12.45, total: 35399.13 },
        { price: 2841.75, amount: 6.78, total: 19267.07 },
        { price: 2841.00, amount: 4.33, total: 12305.53 },
      ],
      asks: [
        { price: 2846.25, amount: 4.12, total: 11726.55 },
        { price: 2847.00, amount: 2.89, total: 8227.83 },
        { price: 2847.75, amount: 7.56, total: 21512.79 },
        { price: 2848.50, amount: 1.98, total: 5640.03 },
        { price: 2849.25, amount: 9.34, total: 26612.01 },
        { price: 2850.00, amount: 5.67, total: 16159.50 },
        { price: 2850.75, amount: 3.45, total: 9835.09 },
      ]
    },
    'BTC/USDT': {
      bids: [
        { price: 43250.00, amount: 0.15, total: 6487.50 },
        { price: 43245.00, amount: 0.28, total: 12108.60 },
        { price: 43240.00, amount: 0.45, total: 19458.00 },
        { price: 43235.00, amount: 0.22, total: 9511.70 },
        { price: 43230.00, amount: 0.67, total: 28964.10 },
      ],
      asks: [
        { price: 43255.00, amount: 0.18, total: 7785.90 },
        { price: 43260.00, amount: 0.33, total: 14275.80 },
        { price: 43265.00, amount: 0.51, total: 22065.15 },
        { price: 43270.00, amount: 0.29, total: 12548.30 },
        { price: 43275.00, amount: 0.74, total: 32023.50 },
      ]
    }
  };

  const tokenPairs = ['ETH/USDC', 'BTC/USDT', 'UNI/ETH', 'LINK/USDC'];

  useEffect(() => {
    // Simulate API call
    const fetchOrderBook = async () => {
      setIsLoading(true);
      setTimeout(() => {
        setOrderBookData(mockOrderBookData[selectedPair] || { bids: [], asks: [] });
        setIsLoading(false);
      }, 800);
    };

    fetchOrderBook();
  }, [selectedPair]);

  const formatPrice = (price) => {
    return selectedPair.includes('BTC') ? price.toLocaleString() : price.toFixed(2);
  };

  const formatAmount = (amount) => {
    return amount.toFixed(selectedPair.includes('BTC') ? 2 : 3);
  };

  const formatTotal = (total) => {
    return total.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-inch-blue"></div>
          <p className="text-gray-600">Loading order book...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Token Pair Selector */}
      <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Order Book</h3>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-600">Trading Pair:</label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-inch-blue focus:border-inch-blue outline-none"
            >
              {tokenPairs.map((pair) => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Price</p>
              <p className="text-xl font-bold text-gray-800">
                ${selectedPair.includes('BTC') ? '43,252.50' : '2,845.88'}
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">24h Change</p>
              <p className="text-xl font-bold text-green-600">+2.4%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold">↗</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">24h Volume</p>
              <p className="text-xl font-bold text-gray-800">
                {selectedPair.includes('BTC') ? '1,245 BTC' : '12.5K ETH'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Spread</p>
              <p className="text-xl font-bold text-gray-800">0.02%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Order Book Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sell Orders (Asks) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
            <h3 className="text-lg font-semibold text-red-700 flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              <span>Sell Orders (Asks)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orderBookData.asks.map((ask, index) => (
                  <tr key={index} className="hover:bg-red-50/30 transition-colors duration-150">
                    <td className="px-4 py-3 font-mono text-sm text-red-600 font-medium">
                      ${formatPrice(ask.price)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600">
                      {formatAmount(ask.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-800">
                      ${formatTotal(ask.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buy Orders (Bids) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
            <h3 className="text-lg font-semibold text-green-700 flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Buy Orders (Bids)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orderBookData.bids.map((bid, index) => (
                  <tr key={index} className="hover:bg-green-50/30 transition-colors duration-150">
                    <td className="px-4 py-3 font-mono text-sm text-green-600 font-medium">
                      ${formatPrice(bid.price)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600">
                      {formatAmount(bid.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-800">
                      ${formatTotal(bid.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Market Depth Chart Placeholder */}
      <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Market Depth</h3>
        <div className="h-64 bg-gradient-to-r from-green-50 via-gray-50 to-red-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-500 font-medium">Market Depth Visualization</p>
            <p className="text-sm text-gray-400">Real-time depth chart coming soon</p>
          </div>
        </div>
      </div>

      {/* Trading Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Place Buy Order</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <input
                type="text"
                placeholder="Enter price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input
                type="text"
                placeholder="Enter amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-colors duration-200">
              Place Buy Order
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
            <span>Place Sell Order</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <input
                type="text"
                placeholder="Enter price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input
                type="text"
                placeholder="Enter amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <button className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-colors duration-200">
              Place Sell Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}