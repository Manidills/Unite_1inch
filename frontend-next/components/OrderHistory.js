// components/OrderHistory.js
import { useState, useEffect } from 'react';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Mock API data for order history
  const mockOrderHistory = [
    {
      id: 'ORD-001',
      tokenPair: 'ETH/USDC',
      amount: '5.25',
      price: '$2,845.50',
      total: '$14,939.89',
      status: 'Completed',
      timestamp: '2024-01-15T10:30:00Z',
      txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    },
    {
      id: 'ORD-002',
      tokenPair: 'BTC/USDT',
      amount: '0.35',
      price: '$43,250.75',
      total: '$15,137.76',
      status: 'Completed',
      timestamp: '2024-01-14T16:45:00Z',
      txHash: '0x2b3c4d5e6f7890abcdef1234567890abcdef123a'
    },
    {
      id: 'ORD-003',
      tokenPair: 'UNI/ETH',
      amount: '250',
      price: '$0.0025',
      total: '0.625 ETH',
      status: 'Open',
      timestamp: '2024-01-14T09:15:00Z',
      txHash: '0x3c4d5e6f7890abcdef1234567890abcdef123a2b',
    },
    {
      id: 'ORD-004',
      tokenPair: 'LINK/USDC',
      amount: '100',
      price: '$18.45',
      total: '$1,845.00',
      status: 'Open',
      timestamp: '2024-01-15T14:20:00Z',
      txHash: '0x4d5e6f7890abcdef1234567890abcdef123a2b3c',
    },
    {
      id: 'ORD-005',
      tokenPair: 'AAVE/ETH',
      amount: '15',
      price: '$0.045',
      total: '0.675 ETH',
      status: 'Completed',
      timestamp: '2024-01-13T11:30:00Z',
      txHash: '0x5e6f7890abcdef1234567890abcdef123a2b3c4d',
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchOrderHistory = async () => {
      setIsLoading(true);
      setTimeout(() => {
        setOrders(mockOrderHistory);
        setIsLoading(false);
      }, 1000);
    };

    fetchOrderHistory();
  }, []);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status.toLowerCase() === filter;
  });

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'Open':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-inch-blue"></div>
          <p className="text-gray-600">Loading order history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
            </div>
            <div className="w-12 h-12 bg-inch-blue/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-inch-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'Completed').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open</p>
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'Open').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-200/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Order Filters</h3>
          <div className="flex space-x-2">
            {['all', 'completed', 'Open'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  filter === status
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order Hash</th>
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
                  <td className="px-6 py-4 text-gray-600">{order.amount}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{order.price}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{order.total}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(order.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.txHash}</td>
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
            <p className="text-gray-500">No orders found matching your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}