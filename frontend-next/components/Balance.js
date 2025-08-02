import { useState, useEffect } from 'react';
import { ChevronDown, Wallet, RefreshCw, ExternalLink } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { getAllChains } from '../helper/apiHelper';

export default function WalletBalance() {
    const { account } = useWallet();

    const [chains, setChains] = useState([]);
    const [selectedChain, setSelectedChain] = useState(1); // default to Ethereum
    const [tokens, setTokens] = useState([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);

    const fetchChains = async () => {
        try {
            const data = await getAllChains();
            setChains(data);
        } catch (err) {
            console.error('Failed to load chains:', err);
        }
    };

    const fetchTokenBalances = async (chainId) => {
        if (!account) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/token-balances?chainId=${chainId}&wallet=${account}`);
            const tokenData = await res.json();

            setTokens(tokenData || []);

            const total = tokenData.reduce((sum, token) => {
                return sum + parseFloat(token.balanceUSD.replace(/,/g, ''));
            }, 0);
            setTotalBalance(total);
        } catch (error) {
            console.error('Error fetching token balances:', error);
            setTokens([]);
            setTotalBalance(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!account) return;

        fetchChains().then(() => {
            fetchTokenBalances(1); // Default to Ethereum
        });
    }, [account]);

    const handleChainChange = (chainId) => {
        setSelectedChain(chainId);
        setIsChainDropdownOpen(false);
        fetchTokenBalances(chainId);
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatBalance = (balance) => {
        const num = parseFloat(balance.replace(/,/g, ''));
        if (num >= 1000000) {
            return `$${(num / 1000000).toFixed(2)}M`;
        } else if (num >= 1000) {
            return `$${(num / 1000).toFixed(2)}K`;
        }
        return `$${num.toLocaleString()}`;
    };

    if (!account) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wallet className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Wallet Not Connected</h3>
                    <p className="text-gray-500 text-sm">Please connect your wallet to view your balance</p>
                </div>
            </div>
        );
    }

    const selectedChainData = chains.find(chain => chain.chain_id === selectedChain);

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Wallet Balance</h2>
                            <p className="text-sm text-gray-500">{formatAddress(account)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchTokenBalances(selectedChain)}
                        disabled={loading}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Total Balance */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {loading ? (
                            <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
                        ) : (
                            formatBalance(totalBalance.toString())
                        )}
                    </p>
                </div>
            </div>

            {/* Chain Selector */}
            <div className="p-6 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
                <div className="relative">
                    <button
                        onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <img
                                src={selectedChainData?.chain_icon}
                                alt={selectedChainData?.chain_name}
                                className="w-6 h-6 rounded-full"
                            />
                            <span className="font-medium text-gray-900">{selectedChainData?.chain_name}</span>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isChainDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isChainDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                            {chains.map((chain) => (
                                <button
                                    key={chain.chain_id}
                                    onClick={() => handleChainChange(chain.chain_id)}
                                    className={`w-full flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors ${selectedChain === chain.chain_id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                                        }`}
                                >
                                    <img
                                        src={chain.chain_icon}
                                        alt={chain.chain_name}
                                        className="w-6 h-6 rounded-full"
                                    />
                                    <span className={`font-medium ${selectedChain === chain.chain_id ? 'text-blue-600' : 'text-gray-900'}`}>
                                        {chain.chain_name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Token List */}
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Assets</h3>
                    <span className="text-sm text-gray-500">{tokens.length} tokens</span>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </div>
                                <div className="text-right">
                                    <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tokens.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Wallet className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No tokens found on this network</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tokens.map((token, index) => (
                            <div
                                key={`${token.address}-${index}`}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors group"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <img
                                            src={token.image}
                                            alt={token.name}
                                            className="w-10 h-10 rounded-full"
                                        />
                                        {index === 0 && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <p className="font-semibold text-gray-900">{token.symbol}</p>
                                            {token.address !== '0x0000000000000000000000000000000000000000' && (
                                                <button
                                                    onClick={() => window.open(`https://etherscan.io/token/${token.address}`, '_blank')}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <ExternalLink className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{token.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">{token.balance} {token.symbol}</p>
                                    <p className="text-sm text-gray-500">${token.balanceUSD}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
