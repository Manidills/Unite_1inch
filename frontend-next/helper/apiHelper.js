import { config } from '../config/index';

export const supportedTokens = ['USDT', 'USDC', 'WETH', 'DAI', 'WBTC'];

const LOGIN_URL = `${config.api.baseUrl}/api/login`;
const TOKEN_LIST_URL = `${config.api.baseUrl}/api/tokens`;
const CHAIN_LIST_URL = `${config.api.baseUrl}/api/chains`;
const PRICE_URL = `${config.api.baseUrl}/api/prices`;
const GAS_FEE_URL = `${config.api.baseUrl}/api/gasFee`;
const ORDER_URL = `${config.api.baseUrl}/api/order`;
const INSERT_ORDER_URL = `${config.api.baseUrl}/api/insert-order`;
const USER_ORDER_URL = `${config.api.baseUrl}/api/order-by-address`;
const ORDER_HISTORY_URL = `${config.api.baseUrl}/api/order-history`;
const ORDER_DETAILS_URL = `${config.api.baseUrl}/api/order-by-hash`;
const PORTFOLIO_URL = `${config.api.baseUrl}/api/portfolio/tokens`;
const TRIGGER_URL = `${config.api.baseUrl}/api/trigger`;

const HEADERS = {
    Authorization: `Bearer ${config.oneInch.apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
};

export async function getTokensWithPrices(symbols = []) {
    try {
        const tokenRes = await fetch(TOKEN_LIST_URL, { headers: HEADERS });
        const tokenData = await tokenRes.json();

        const filteredTokens = [];
        const tokenAddresses = [];

        for (const tokenAddress in tokenData.tokens) {
            const token = tokenData.tokens[tokenAddress];
            if (symbols.includes(token.symbol)) {
                filteredTokens.push({
                    address: token.address,
                    symbol: token.symbol,
                    decimals: token.decimals,
                    name: token.name,
                    logoURI: token.logoURI,
                });
                tokenAddresses.push(token.address.toLowerCase());
            }
        }

        const priceRes = await fetch(`${PRICE_URL}?tokens=${tokenAddresses.join(',')}`, {
            headers: HEADERS,
        });
        const priceData = await priceRes.json();

        const enriched = filteredTokens.map((token) => ({
            ...token,
            price: priceData[token.address.toLowerCase()] || null,
        }));
        return enriched;
    } catch (err) {
        console.error('Error fetching tokens or prices:', err);
        return [];
    }
}

export async function getGasfee(orderInfo) {
    try {
        const { makingAmount: makerAmount, takingAmount: takerAmount, makerAsset, takerAsset } = orderInfo;
        const gasFeeRes = await fetch(`${GAS_FEE_URL}?makerAsset=${makerAsset}&takerAsset=${takerAsset}&makerAmount=${makerAmount}&takerAmount=${takerAmount}`, {
            headers: HEADERS,
        });
        const feeData = await gasFeeRes.json();
        return feeData;
    } catch (error) {
        console.error('Error fetching gas fee', error);
        return [];
    }
}

export async function submitAndInsertOrder(orderDetails, limitOrder, signature) {
    try {
        const submitOrder = await fetch(`${ORDER_URL}?orderType=submitOrder`, {
            headers: HEADERS,
            method: 'POST',
            body: safeStringify({
                orderDetails,
                limitOrder,
                signature
            })
        });
        const submitOrderRes = await submitOrder.json();
        return submitOrderRes;
    } catch (error) {
        console.error('failed to insert record into db', error);
        return [];
    }
}

export async function createOrder(orderInfo) {
    try {
        const createOrder = await fetch(`${ORDER_URL}?orderType=createOrder`, {
            headers: HEADERS,
            method: 'POST',
            body: safeStringify({
                orderInfo
            })
        });
        const result = await createOrder.json();
        return result;
    } catch (error) {
        console.error('failed to insert record into db', error);
        return [];
    }
}

function safeStringify(obj) {
    return JSON.stringify(obj, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );
}

export async function insertOrder(orderBody) {
    try {
        const createOrder = await fetch(`${INSERT_ORDER_URL}`, {
            headers: HEADERS,
            method: 'POST',
            body: safeStringify({
                orderBody
            })
        });
        const result = await createOrder.json();
        return result;
    } catch (error) {
        console.error('failed to insert record into db', error);
        return [];
    }
}

export async function getUserOrders(walletAddress) {
    try {
        const apiResponse = await fetch(`${USER_ORDER_URL}?walletAddress=${walletAddress}`, {
            headers: HEADERS,
        });
        const result = await apiResponse.json();
        return result;
    } catch (error) {
        console.error('Failed to fetch user orders', error);
        return [];
    }
}

export async function getOrderHistory(walletAddress) {
    try {
        const apiResponse = await fetch(`${ORDER_HISTORY_URL}?walletAddress=${walletAddress}`, {
            headers: HEADERS,
        });
        const result = await apiResponse.json();
        return result;
    } catch (error) {
        console.error('Failed to fetch order history', error);
        return [];
    }
}

export async function login(address) {
    try {
        await fetch(`${LOGIN_URL}`, {
            headers: HEADERS,
            method: 'POST',
            body: safeStringify({
                walletAddress: address
            })
        });
        return;
    } catch (error) {
        console.error('failed to insert record into db', error);
        return [];
    }
}

export async function getOrderDetails(orderHash) {
    try {
        const apiResponse = await fetch(`${ORDER_DETAILS_URL}/${orderHash}`, {
            headers: HEADERS,
        });
        const result = await apiResponse.json();
        return result;
    } catch (error) {
        console.error('Failed to fetch user orders', error);
        return [];
    }
}

export async function getAllChains() {
    try {
        const apiResponse = await fetch(`${CHAIN_LIST_URL}`, {
            headers: HEADERS,
        });
        const result = await apiResponse.json();
        return result.result;
    } catch (error) {
        console.error('Failed to fetch chain details', error);
        return [];
    }
}

export async function getPortfolioDetails(address, chainId) {
    try {
        const apiResponse = await fetch(`${PORTFOLIO_URL}?address=${address}&chainId=${chainId}`, {
            headers: HEADERS,
        });
        const result = await apiResponse.json();
        return result;
    } catch (error) {
        console.error('Failed to fetch portfolio details', error);
        return [];
    }
}

export async function getAllTokens(chainId) {
    try {
        const apiResponse = await fetch(`${TOKEN_LIST_URL}?chainId=${chainId}`, {
            headers: HEADERS,
        });
        const result = await apiResponse.json();
        return result.tokens;
    } catch (error) {
        console.error('Failed to fetch token details', error);
        return [];
    }
}

export async function getOrderIntent(message, account) {
    const intentUrl = `${config.intentUrl}`
    try {
        const apiResponse = await fetch(intentUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: message,
                wallet_address: account,
                receiver_address: account,
            }),
        });
        const result = await apiResponse.json();
        return result;
    } catch (error) {
        console.error('Failed to fetch user orders', error);
        return [];
    }
}

export async function insertTrigger(trigger) {
    try {
        const apiResponse = await fetch(TRIGGER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(trigger),
        });
        const result = await apiResponse.json();
        return result;
    } catch (error) {
        console.error('Failed to fetch user orders', error);
        return [];
    }
}

export async function getUserTriggers(walletAddress) {
    try {
        const apiResponse = await fetch(`${USER_TRIGGERS_URL}?walletAddress=${walletAddress}`, {
            headers: HEADERS,
        });
        const result = await apiResponse.json();
        return result;
    } catch (error) {
        console.error('Failed to fetch user orders', error);
        return [];
    }
}