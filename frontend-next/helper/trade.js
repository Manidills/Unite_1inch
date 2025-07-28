import { LimitOrderBuilder, LimitOrderProtocolFacade, Web3ProviderConnector } from '@1inch/limit-order-sdk';
import Web3 from 'web3';

class OneInchStopLossTakeProfit {
    constructor(web3Provider, chainId = 1) {
        this.web3 = new Web3(web3Provider);
        this.chainId = chainId;
        
        // Initialize 1inch components
        this.connector = new Web3ProviderConnector(web3Provider);
        this.limitOrderBuilder = new LimitOrderBuilder(
            '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch v5 aggregation router
            chainId,
            this.connector
        );
        
        this.limitOrderProtocolFacade = new LimitOrderProtocolFacade(
            '0x1111111254eeb25477b68fb85ed929f73a960582',
            chainId,
            this.connector
        );
    }

    /**
     * Create a stop loss order
     * @param {string} userAddress - User's wallet address
     * @param {string} makerAsset - Token to sell (address)
     * @param {string} takerAsset - Token to receive (address)
     * @param {string} makerAmount - Amount to sell (in wei)
     * @param {string} stopLossPrice - Price at which to trigger stop loss
     * @param {number} expiration - Order expiration timestamp
     */
    async createStopLossOrder(userAddress, makerAsset, takerAsset, makerAmount, stopLossPrice, expiration) {
        try {
            // Calculate taker amount based on stop loss price
            const takerAmount = this.calculateTakerAmount(makerAmount, stopLossPrice);
            
            // Build the limit order
            const limitOrder = this.limitOrderBuilder.buildLimitOrder({
                makerAssetAddress: makerAsset,
                takerAssetAddress: takerAsset,
                makerAddress: userAddress,
                makerAmount: makerAmount,
                takerAmount: takerAmount,
                expiration: expiration,
                // Predicate for stop loss - order becomes valid when price drops below threshold
                predicate: this.buildStopLossPredicate(takerAsset, makerAsset, stopLossPrice)
            });

            console.log('Stop Loss Order Created:', limitOrder);
            return limitOrder;
        } catch (error) {
            console.error('Error creating stop loss order:', error);
            throw error;
        }
    }

    /**
     * Create a take profit order
     * @param {string} userAddress - User's wallet address
     * @param {string} makerAsset - Token to sell (address)
     * @param {string} takerAsset - Token to receive (address)
     * @param {string} makerAmount - Amount to sell (in wei)
     * @param {string} takeProfitPrice - Price at which to trigger take profit
     * @param {number} expiration - Order expiration timestamp
     */
    async createTakeProfitOrder(userAddress, makerAsset, takerAsset, makerAmount, takeProfitPrice, expiration) {
        try {
            // Calculate taker amount based on take profit price
            const takerAmount = this.calculateTakerAmount(makerAmount, takeProfitPrice);
            
            // Build the limit order
            const limitOrder = this.limitOrderBuilder.buildLimitOrder({
                makerAssetAddress: makerAsset,
                takerAssetAddress: takerAsset,
                makerAddress: userAddress,
                makerAmount: makerAmount,
                takerAmount: takerAmount,
                expiration: expiration,
                // Predicate for take profit - order becomes valid when price rises above threshold
                predicate: this.buildTakeProfitPredicate(takerAsset, makerAsset, takeProfitPrice)
            });

            console.log('Take Profit Order Created:', limitOrder);
            return limitOrder;
        } catch (error) {
            console.error('Error creating take profit order:', error);
            throw error;
        }
    }

    /**
     * Create bracket orders (both stop loss and take profit)
     */
    async createBracketOrders(userAddress, makerAsset, takerAsset, makerAmount, stopLossPrice, takeProfitPrice, expiration) {
        try {
            const stopLossOrder = await this.createStopLossOrder(
                userAddress, makerAsset, takerAsset, makerAmount, stopLossPrice, expiration
            );
            
            const takeProfitOrder = await this.createTakeProfitOrder(
                userAddress, makerAsset, takerAsset, makerAmount, takeProfitPrice, expiration
            );

            return {
                stopLoss: stopLossOrder,
                takeProfit: takeProfitOrder
            };
        } catch (error) {
            console.error('Error creating bracket orders:', error);
            throw error;
        }
    }

    /**
     * Sign and submit order to 1inch
     */
    async signAndSubmitOrder(limitOrder, privateKey) {
        try {
            // Sign the order
            const signature = await this.limitOrderBuilder.buildOrderSignature(
                limitOrder,
                privateKey
            );

            // Submit to 1inch API
            const orderHash = this.limitOrderBuilder.buildLimitOrderHash(limitOrder);
            
            // Post order to 1inch limit order API
            const response = await this.submitOrderToAPI(limitOrder, signature, orderHash);
            
            console.log('Order submitted successfully:', response);
            return { limitOrder, signature, orderHash, response };
        } catch (error) {
            console.error('Error signing/submitting order:', error);
            throw error;
        }
    }

    /**
     * Monitor order status
     */
    async getOrderStatus(orderHash) {
        try {
            const response = await fetch(`https://api.1inch.io/v5.0/${this.chainId}/limit-order/${orderHash}`);
            const orderData = await response.json();
            return orderData;
        } catch (error) {
            console.error('Error fetching order status:', error);
            throw error;
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(limitOrder, privateKey) {
        try {
            const cancelTx = await this.limitOrderProtocolFacade.cancelLimitOrder(limitOrder);
            return cancelTx;
        } catch (error) {
            console.error('Error canceling order:', error);
            throw error;
        }
    }

    // Helper methods
    calculateTakerAmount(makerAmount, price) {
        // Convert amounts and price to proper decimals based on token decimals
        // This is a simplified calculation - adjust for actual token decimals
        return (BigInt(makerAmount) * BigInt(Math.floor(price * 1e18)) / BigInt(1e18)).toString();
    }

    buildStopLossPredicate(takerAsset, makerAsset, stopLossPrice) {
        // Build predicate that checks if current price <= stop loss price
        // This requires integration with a price oracle (e.g., Chainlink)
        // Simplified example - in practice, you'd use proper oracle calls
        return `0x`; // Placeholder for actual predicate bytecode
    }

    buildTakeProfitPredicate(takerAsset, makerAsset, takeProfitPrice) {
        // Build predicate that checks if current price >= take profit price
        // This requires integration with a price oracle
        return `0x`; // Placeholder for actual predicate bytecode
    }

    async submitOrderToAPI(limitOrder, signature, orderHash) {
        const orderData = {
            orderHash,
            signature,
            data: limitOrder
        };

        const response = await fetch(`https://api.1inch.io/v5.0/${this.chainId}/limit-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        return await response.json();
    }
}

// Usage Example
async function example() {
    const web3Provider = new Web3.providers.HttpProvider('YOUR_RPC_URL');
    const trader = new OneInchStopLossTakeProfit(web3Provider, 1); // Ethereum mainnet
    
    const userAddress = '0x...'; // Your wallet address
    const privateKey = '0x...'; // Your private key (use securely!)
    
    // Token addresses (example: ETH/USDC)
    const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const USDC = '0xA0b86a33E6411C8755ce5ee8C8843A237b5e6f0e';
    
    // Order parameters
    const makerAmount = '1000000000000000000'; // 1 ETH in wei
    const stopLossPrice = 1800; // $1800 per ETH
    const takeProfitPrice = 2200; // $2200 per ETH
    const expiration = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    
    try {
        // Create bracket orders
        const orders = await trader.createBracketOrders(
            userAddress,
            WETH,
            USDC,
            makerAmount,
            stopLossPrice,
            takeProfitPrice,
            expiration
        );
        
        // Sign and submit stop loss order
        const stopLossResult = await trader.signAndSubmitOrder(orders.stopLoss, privateKey);
        console.log('Stop Loss Order Hash:', stopLossResult.orderHash);
        
        // Sign and submit take profit order
        const takeProfitResult = await trader.signAndSubmitOrder(orders.takeProfit, privateKey);
        console.log('Take Profit Order Hash:', takeProfitResult.orderHash);
        
        // Monitor orders
        setInterval(async () => {
            const stopLossStatus = await trader.getOrderStatus(stopLossResult.orderHash);
            const takeProfitStatus = await trader.getOrderStatus(takeProfitResult.orderHash);
            
            console.log('Stop Loss Status:', stopLossStatus.status);
            console.log('Take Profit Status:', takeProfitStatus.status);
        }, 30000); // Check every 30 seconds
        
    } catch (error) {
        console.error('Trading error:', error);
    }
}

// Advanced order management
class OrderManager {
    constructor(trader) {
        this.trader = trader;
        this.activeOrders = new Map();
    }
    
    async createTrailingStopLoss(userAddress, makerAsset, takerAsset, makerAmount, trailPercent, expiration) {
        // Implementation for trailing stop loss
        // Updates stop loss price as market price moves favorably
    }
    
    async createOCOOrder(userAddress, makerAsset, takerAsset, makerAmount, stopPrice, limitPrice, expiration) {
        // One-Cancels-Other order implementation
        // When one order fills, automatically cancel the other
    }
    
    async rebalanceOrders(orderHashes, newPrices) {
        // Cancel existing orders and create new ones with updated prices
        for (const hash of orderHashes) {
            await this.trader.cancelOrder(hash);
        }
        // Create new orders with updated parameters
    }
}

export { OneInchStopLossTakeProfit, OrderManager };


// Usage Examples for Fill Order Implementation

import { fillOrder, batchFillOrders, getFillableOrders, monitorOrderForFill } from './fillOrder';
import { ethers } from 'ethers';

// ==============================================
// FILL ORDER FLOW DIAGRAM
// ==============================================
/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FILL ORDER PROCESS FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. [START] → Retrieve Order Details                                        │
│                    ↓                                                        │
│  2. Validate Order (expiration, status, availability)                      │
│                    ↓                                                        │
│  3. Calculate Fill Amount (partial or full)                                │
│                    ↓                                                        │
│  4. Check Taker Token Allowance                                            │
│                    ↓                                                        │
│  5. [IF NEEDED] → Approve Taker Token                                       │
│                    ↓                                                        │
│  6. Estimate Gas & Execute Fill Transaction                                 │
│                    ↓                                                        │
│  7. Wait for Transaction Confirmation                                       │
│                    ↓                                                        │
│  8. Update Order Status in Database                                        │
│                    ↓                                                        │
│  9. [END] → Return Fill Result                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
*/

// ==============================================
// EXAMPLE 1: Simple Order Fill
// ==============================================
async function example1_SimpleFill() {
    try {
        // Setup provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Order hash from your database or 1inch API
        const orderHash = "0x1234567890abcdef...";
        
        console.log("🚀 Example 1: Simple Order Fill");
        
        // Fill the entire order
        const result = await fillOrder(provider, orderHash);
        
        if (result.success) {
            console.log("✅ Order filled successfully!");
            console.log("Transaction Hash:", result.transactionHash);
            console.log("Fill Amount:", result.fillAmount);
            console.log("Gas Used:", result.gasUsed);
        } else {
            console.log("❌ Fill failed:", result.error);
        }
        
    } catch (error) {
        console.error("Example 1 failed:", error);
    }
}

// ==============================================
// EXAMPLE 2: Partial Order Fill
// ==============================================
async function example2_PartialFill() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const orderHash = "0x1234567890abcdef...";
        
        // Fill only 50% of the order
        const partialFillAmount = "500000000000000000"; // 0.5 ETH in wei
        
        console.log("🚀 Example 2: Partial Order Fill");
        
        const result = await fillOrder(provider, orderHash, partialFillAmount);
        
        console.log("Partial fill result:", result);
        
    } catch (error) {
        console.error("Example 2 failed:", error);
    }
}

// ==============================================
// EXAMPLE 3: Batch Fill Multiple Orders
// ==============================================
async function example3_BatchFill() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Multiple order hashes
        const orderHashes = [
            "0x1234567890abcdef...",
            "0xabcdef1234567890...",
            "0x567890abcdef1234..."
        ];
        
        // Optional: specify fill amounts for each order
        const fillAmounts = [
            "1000000000000000000", // 1 ETH
            null, // Fill entire order
            "2000000000000000000"  // 2 ETH
        ];
        
        console.log("🚀 Example 3: Batch Fill Orders");
        
        const results = await batchFillOrders(provider, orderHashes, fillAmounts);
        
        results.forEach((result, index) => {
            console.log(`Order ${index + 1}:`, result.success ? "✅ Success" : "❌ Failed");
        });
        
    } catch (error) {
        console.error("Example 3 failed:", error);
    }
}

// ==============================================
// EXAMPLE 4: Find and Fill Best Orders
// ==============================================
async function example4_FindAndFillBestOrders() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Token addresses
        const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const USDC = "0xA0b86a33E6411C8755ce5ee8C8843A237b5e6f0e";
        
        console.log("🚀 Example 4: Find and Fill Best Orders");
        
        // Get fillable orders
        const fillableOrders = await getFillableOrders(USDC, WETH, 5);
        
        console.log(`Found ${fillableOrders.length} fillable orders`);
        
        // Sort by best rate and fill the top order
        if (fillableOrders.length > 0) {
            const bestOrder = fillableOrders[0]; // Assume first is best
            
            const result = await fillOrder(provider, bestOrder.orderHash);
            console.log("Best order fill result:", result);
        }
        
    } catch (error) {
        console.error("Example 4 failed:", error);
    }
}

// ==============================================
// EXAMPLE 5: Automated Order Monitoring
// ==============================================
async function example5_AutomatedFill() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const orderHash = "0x1234567890abcdef...";
        
        console.log("🚀 Example 5: Automated Order Monitoring");
        
        // Monitor and auto-fill when conditions are met
        const conditions = {
            timeThreshold: Math.floor(Date.now() / 1000) + 3600, // Fill after 1 hour
            checkInterval: 60000 // Check every minute
        };
        
        await monitorOrderForFill(provider, orderHash, conditions);
        
        console.log("Order monitoring started...");
        
    } catch (error) {
        console.error("Example 5 failed:", error);
    }
}

// ==============================================
// EXAMPLE 6: Integration with Your Existing Code
// ==============================================
async function example6_Integration() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        console.log("🚀 Example 6: Integration with Existing Code");
        
        // Step 1: Create order (using your existing confirmOrder function)
        const orderInfo = {
            makerAsset: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            takerAsset: "0xA0b86a33E6411C8755ce5ee8C8843A237b5e6f0e", // USDC
            makingAmount: "1000000000000000000", // 1 ETH
            takingAmount: "2000000000", // 2000 USDC
            maker: await provider.getSigner().getAddress()
        };
        
        const tradeInfo = {
            tradeType: "limit",
            createdAt: new Date().toISOString()
        };
        
        // Create order using your existing function
        // const orderCreated = await confirmOrder(provider, orderInfo, tradeInfo);
        
        // Step 2: Later, fill the order
        // const orderHash = "..."; // Get from database
        // const fillResult = await fillOrder(provider, orderHash);
        
        console.log("Integration example completed");
        
    } catch (error) {
        console.error("Example 6 failed:", error);
    }
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

// Check if order is fillable
export const isOrderFillable = async (orderHash) => {
    try {
        const apiConfig = {
            networkId: config.chainId,
            authKey: `${config.oneInch.apiKey}`,
            httpConnector: new FetchProviderConnector(),
            baseUrl: 'https://1inch-vercel-proxy-cg4rn9idz-gowthamjsdevs-projects.vercel.app/1inch'
        };
        
        const sdk = new Sdk(apiConfig);
        const orderDetails = await sdk.getOrder(orderHash);
        
        if (!orderDetails) return false;
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        return orderDetails.status === 'active' && 
               orderDetails.expiration > currentTime &&
               BigInt(orderDetails.remainingMakerAmount || orderDetails.makingAmount) > 0;
               
    } catch (error) {
        console.error('Error checking order fillability:', error);
        return false;
    }
};

// Get order fill history
export const getOrderFillHistory = async (orderHash) => {
    try {
        // This would typically come from your database
        // or blockchain event logs
        const fillHistory = await getOrderFromDB(orderHash);
        
        return {
            orderHash,
            totalFilled: fillHistory.totalFilled || "0",
            fillCount: fillHistory.fillCount || 0,
            fills: fillHistory.fills || []
        };
        
    } catch (error) {
        console.error('Error getting fill history:', error);
        return null;
    }
};

// Cancel order before filling (if needed)
export const cancelOrderBeforeFill = async (provider, orderHash) => {
    try {
        const signer = await provider.getSigner();
        
        const apiConfig = {
            networkId: config.chainId,
            authKey: `${config.oneInch.apiKey}`,
            httpConnector: new FetchProviderConnector(),
            baseUrl: 'https://1inch-vercel-proxy-cg4rn9idz-gowthamjsdevs-projects.vercel.app/1inch'
        };
        
        const sdk = new Sdk(apiConfig);
        
        // Get order details
        const orderDetails = await sdk.getOrder(orderHash);
        
        if (!orderDetails) {
            throw new Error('Order not found');
        }
        
        // Cancel the order
        const cancelTx = await sdk.cancelOrder(orderDetails);
        await cancelTx.wait();
        
        console.log('Order cancelled successfully');
        return true;
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        return false;
    }
};

// ==============================================
// MAIN EXECUTION
// ==============================================
async function runExamples() {
    console.log("🎯 Running Fill Order Examples...\n");
    
    // Uncomment the examples you want to run
    // await example1_SimpleFill();
    // await example2_PartialFill();
    // await example3_BatchFill();
    // await example4_FindAndFillBestOrders();
    // await example5_AutomatedFill();
    // await example6_Integration();
}

// Export for use in your application
export {
    example1_SimpleFill,
    example2_PartialFill,
    example3_BatchFill,
    example4_FindAndFillBestOrders,
    example5_AutomatedFill,
    example6_Integration,
    isOrderFillable,
    getOrderFillHistory,
    cancelOrderBeforeFill
};

// Uncomment to run examples
// runExamples();