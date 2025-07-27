import { config } from '../config/index';

export const supportedTokens = ['USDT', 'USDC', 'WETH', 'DAI', 'WBTC'];

const TOKEN_LIST_URL = `${config.api.baseUrl}/api/tokens`;
const PRICE_URL = `${config.api.baseUrl}/api/prices`;
const GAS_FEE_URL = `${config.api.baseUrl}/api/gasFee`

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
        const { makingAmount: makerAmount , takingAmount: takerAmount, makerAsset, takerAsset } = orderInfo;
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

export async function insertOrderIntoDB(orderInfo) {
    try {
        const { makingAmount: makerAmount , takingAmount: takerAmount, makerAsset, takerAsset } = orderInfo;
        const gasFeeRes = await fetch(`${GAS_FEE_URL}?makerAsset=${makerAsset}&takerAsset=${takerAsset}&makerAmount=${makerAmount}&takerAmount=${takerAmount}`, {
            headers: HEADERS,
        });
        const feeData = await gasFeeRes.json();
        return feeData;
    } catch (error) {
        console.error('failed to insert record into db', error);
        return [];
    }

}