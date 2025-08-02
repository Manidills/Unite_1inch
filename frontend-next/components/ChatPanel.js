import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { supportedTokens, getTokensWithPrices, getOrderIntent } from '../helper/apiHelper'
import { getOrderInfoFromIntent } from '../helper/orderInfo'
import { confirmOrder } from '../helper/submitOrder';

export default function ChatPanel() {
  const { account, provider } = useWallet();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);

    try {
      const data = await getOrderIntent(message, account)
      if (data.success && data.intent) {
        const { asset_from, asset_to } = data.intent;

        if (!supportedTokens.includes(asset_from) || !supportedTokens.includes(asset_to)) {
          alert(`Only these tokens are supported: ${supportedTokens.join(', ')}`);
          setIsLoading(false);
          return;
        }
        if (data.intent.asset_from === data.intent.asset_to) {
          alert('Token pair is missing')
        }
        const tokenDetails = await getTokensWithPrices([asset_from, asset_to]);
        let intent = { ...data.intent };

        if (intent.intent === "sell") {
          // Swap asset_from and asset_to
          const temp = intent.asset_from;
          intent.asset_from = intent.asset_to;
          intent.asset_to = temp;
        }
        const { orderInfo, tradeInfo } = await getOrderInfoFromIntent(intent, tokenDetails, account)

        const apiResponse = { tokenDetails, tradeInfo, orderInfo }
        setApiResponse(apiResponse);
        setShowResponse(true);
      } else {
        alert(data.guidance);
      }
    } catch (error) {
      console.error('API call failed:', error);
      alert('Failed to fetch trading info.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleConfirm = async (orderInfo, tradeInfo) => {
    if (!orderInfo) {
      alert('Order information is missing.');
      return;
    }

    if (!tradeInfo) {
      alert('Trade information is missing.');
      return;
    }
    setIsConfirming(true);
    try {
      const result = await confirmOrder(provider, orderInfo, tradeInfo)

      if (result) {
        alert('Orders confirmed successfully!');
        setShowResponse(false);
        setApiResponse(null);
        setMessage('');
      } else {
        alert(result.message || 'Failed to confirm order.');
      }
    } catch (error) {
      console.error('Confirm order failed:', error);
      alert('Something went wrong while confirming the order.');
    } finally {
      setIsConfirming(false);
    }
  };


  const handleCancel = () => {
    setShowResponse(false);
    setApiResponse(null);
    setMessage('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Chat Interface */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        {/* Chat Box - 20% from top, center aligned, 60-70% width */}
        <div className="pt-16 pb-8 px-8">
          <div className="w-full max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Chat Input */}
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me about trading strategies, market analysis, or order management..."
                  className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl focus:border-inch-blue focus:ring-4 focus:ring-inch-blue/10 outline-none resize-none text-gray-700 placeholder-gray-400 transition-all duration-200"
                  disabled={isLoading}
                />
                <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                  {message.length}/500
                </div> </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className="group relative px-8 py-3 bg-gradient-to-r from-inch-blue to-inch-light-blue text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-inch-blue/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[140px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-inch-light-blue to-inch-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  <span className="relative flex items-center justify-center space-x-2">
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Submit</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* API Response Table */}
        {showResponse && apiResponse && (
          <div className="border-t border-gray-200 bg-gray-50/50 p-8 animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Token Info</h3>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-inch-blue/5 to-inch-light-blue/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Token</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price(usd)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {apiResponse.tokenDetails.map((item, index) => (
                      <tr key={`${item.name}-${index}`} className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <img
                              src={item.logoURI}
                              alt={item.symbol}
                              className="w-8 h-8 rounded-full object-contain"
                            />
                            <span className="font-medium text-gray-800">{item.symbol}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{item.name}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trade Info Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Trade Info</h3>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-inch-blue/5 to-inch-light-blue/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Token Pair</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fee</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">You Receive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="px-6 py-4 text-gray-800 font-medium">
                          {apiResponse.tradeInfo.tokenPair}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {apiResponse.tradeInfo.amount}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {apiResponse.tradeInfo.feePercent}
                        </td>
                        <td className="px-6 py-4 text-gray-800 font-medium">
                          {apiResponse.tradeInfo.youReceive}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-8">
              <button
                onClick={handleCancel}
                className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(apiResponse.orderInfo, apiResponse.tradeInfo)}
                disabled={isConfirming}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? (
                  <span className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Confirming...</span>
                  </span>
                ) : (
                  'Confirm Orders'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Market Analysis</h3>
          <p className="text-sm text-gray-600">Get AI-powered insights on current market trends and opportunities.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Smart Orders</h3>
          <p className="text-sm text-gray-600">Execute complex trading strategies with our intelligent order system.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.5a9.5 9.5 0 010 19 9.5 9.5 0 010-19z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">24/7 Support</h3>
          <p className="text-sm text-gray-600">Round-the-clock assistance for all your trading questions and needs.</p>
        </div>
      </div>
    </div>
  );
}