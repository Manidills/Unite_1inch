import { useState, useEffect } from 'react';
import { getOrderHistory } from '../helper/apiHelper';
import { useWallet } from '../contexts/WalletContext';
import { useOrderFiller } from '../helper/fill';
import { config } from '../config';

export default function OrderBook() {
  const { account, provider } = useWallet();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [copiedHash, setCopiedHash] = useState(null);
  const [result, setResult] = useState(null);
  const [fillingOrderId, setFillingOrderId] = useState(null);

  const { fillOrder, loading, clearError } = useOrderFiller(config.chainId);
  const handleFillOrder = async (order) => {
    if (!provider) {
      alert('Please connect your wallet');
      return;
    }
    setFillingOrderId(order.id);
    try {
      clearError();
      const signer = await provider.getSigner();
      const fillResult = await fillOrder(signer, order.orderHash, order.signature);
      setResult(fillResult);
      console.log('Order filled successfully:', result);

      // You can show success message or redirect
      alert(`Order filled successfully! Tx: ${fillResult.transactionHash}`);

    } catch (err) {
      console.error('Fill failed:', err);
      alert(`Fill failed: ${err.message}`);
    } finally {
      setFillingOrderId(null)
    }
  };

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  useEffect(() => {
    const fetchOrderHistory = async () => {
      setIsLoading(true);
      try {
        const apiResponse = await getOrderHistory(account);

        if (apiResponse.success && apiResponse.data.length > 0) {
          setOrders(apiResponse.data);
        } else if (!apiResponse.success) {
          alert('Failed to fetch user orders. Please try again later.');
        } else {
          // Optional: clear or show empty state
          setOrders([]);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        alert('Something went wrong. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderHistory();
  }, [account]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status.toLowerCase() === filter;
  });

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'filled':
        return 'bg-green-100 text-green-700';
      case 'open':
        return 'bg-yellow-100 text-yellow-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Order Filters</h3>
          <div className="flex space-x-2">
            {['all', 'expired', 'open', 'filled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${filter === status
                  ? 'bg-inch-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Token Pair</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">You Pay</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">You Receive</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order Hash</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-600">{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-inch-blue to-inch-light-blue rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {order.tokenPair.split('/')[0].charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-800">{order.tokenPair}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{order.youReceive}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{order.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {order.orderHash ? `${order.orderHash.slice(0, 5)}...${order.orderHash.slice(-4)}` : ''}
                    {order.orderHash && (
                      <button
                        onClick={() => handleCopy(order.orderHash)}
                        className="text-xs px-2 py-1 ml-2 rounded bg-gray-200 hover:bg-gray-300 transition"
                      >
                        {copiedHash === order.orderHash ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {order.status === 'open' && (
                      <button
                        onClick={() => handleFillOrder(order)}
                        disabled={ loading || fillingOrderId === order.id && (!provider)}
                        className={`px-6 py-2 rounded-lg font-medium ${fillingOrderId === order.id || !provider
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                      >
                        {fillingOrderId === order.id ? 'Filling Order...' : 'Fill Order'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}