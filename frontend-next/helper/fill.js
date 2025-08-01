// utils/orderFiller.js
import { ethers } from 'ethers';
import { useState, useCallback } from 'react';
import { TakerTraits, AmountMode, Extension } from '@1inch/limit-order-sdk';
import { getOrderDetails } from '../helper/apiHelper';
import { config } from '../config';

export const useOrderFiller = (chainId) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const filler = new SimpleOrderFiller(chainId);

    const fillOrder = useCallback(async (signer, orderHash, signature, options = {}) => {
        setLoading(true);
        setError(null);

        try {
            const result = await filler.fillCompleteOrder(signer, orderHash, signature, options);
            return result;
        } catch (err) {
            const errorMessage = err.message || 'Fill order failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [filler]);

    const validateOrder = useCallback(async (provider, orderHash) => {
        try {
            const remaining = await filler.validateOrder(provider, orderHash);
            return { valid: true, remaining };
        } catch (err) {
            return { valid: false, error: err.message };
        }
    }, [filler]);

    return {
        fillOrder,
        validateOrder,
        loading,
        error,
        clearError: () => setError(null)
    };
};


// Simplified ABI for EOA orders only
const LIMIT_ORDER_V6_ABI = [
    'function fillOrderArgs((uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) payable returns (uint256, uint256, bytes32)',
    'function fillOrder((uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) payable returns (uint256, uint256, bytes32)',
    'function rawRemainingInvalidatorForOrder(address maker, bytes32 orderHash) view returns (uint256)'
];

const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
];

/**
 * Utility function to wait for a specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;

            const delay = baseDelay * Math.pow(2, i);
            console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
}

/**
 * Helper function to normalize address format
 */
function normalizeAddress(address) {
    if (!address || !ethers.isAddress(address)) {
        throw new Error(`Invalid address: ${address}`);
    }
    return address; // Checksummed address
}

/**
 * Helper function to split signature into r, s, v components for V6
 */

async function splitSignature(signature) {
    try {
        // Remove 0x prefix if present
        const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;

        if (cleanSig.length !== 130) {
            throw new Error(`Invalid signature length: ${cleanSig.length}, expected 130`);
        }

        const r = '0x' + cleanSig.slice(0, 64);
        const s = '0x' + cleanSig.slice(64, 128);
        const v = parseInt(cleanSig.slice(128, 130), 16);

        // V6 uses packed vs format (v + s) as bytes32
        let vs = BigInt(s);
        if (v === 28) {
            // Set the highest bit for v=28
            vs = BigInt(s) | (BigInt(1) << BigInt(255));
        }

        // Convert vs BigInt to bytes32 hex string (64 characters + 0x)
        const vsBytes32 = '0x' + vs.toString(16).padStart(64, '0');

        return {
            r: r,        // bytes32
            vs: vsBytes32 // bytes32
        };
    } catch (error) {
        throw new Error(`Invalid signature format: ${error.message}`);
    }
}


/**
 * Simple Order Filler Class for 1inch V6 - EOA Only
 */
export class SimpleOrderFiller {
    constructor(chainId) {
        this.chainId = chainId || config.chainId;
        this.contractAddress = config.oneInch.allowanceTarget;
    }

    /**
     * Convert API order data to V6 contract struct format
     */
    parseOrderStruct(orderData) {
        try {
            // Handle different API response formats
            const data = orderData.data || orderData;

            return {
                salt: BigInt(data.salt || '0'),
                maker: normalizeAddress(data.maker),
                receiver: normalizeAddress(data.receiver || data.maker),
                makerAsset: normalizeAddress(orderData.makerAsset || data.makerAsset),
                takerAsset: normalizeAddress(orderData.takerAsset || data.takerAsset),
                makingAmount: BigInt(data.makingAmount || data.making_amount || '0'),
                takingAmount: BigInt(data.takingAmount || data.taking_amount || '0'),
                makerTraits: BigInt(data.makerTraits || data.maker_traits || '0')
            };
        } catch (error) {
            console.error('Order data structure:', orderData);
            throw new Error(`Failed to parse order struct: ${error.message}`);
        }
    }

    /**
     * Check if user has sufficient balance and allowance
     */
    async checkUserRequirements(provider, userAddress, tokenAddress, amount) {

        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

        try {
            const [balance, allowance, symbol, decimals] = await Promise.all([
                tokenContract.balanceOf(userAddress),
                tokenContract.allowance(userAddress, this.contractAddress),
                tokenContract.symbol().catch(() => 'UNKNOWN'),
                tokenContract.decimals().catch(() => 18)
            ]);

            return {
                hasBalance: balance >= amount,
                hasAllowance: allowance >= amount,
                balance,
                allowance,
                symbol,
                decimals,
                required: amount
            };
        } catch (error) {
            throw new Error(`Failed to check token requirements: ${error.message}`);
        }
    }

    /**
     * Approve tokens for the limit order contract
     */
    async approveToken(signer, tokenAddress, amount) {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

        console.log('Requesting token approval...');

        const approveTx = await retryWithBackoff(async () => {
            const tx = await tokenContract.approve(this.contractAddress, amount);
            console.log(`Approval transaction sent: ${tx.hash}`);
            return tx;
        });

        console.log('Waiting for approval confirmation...');
        const receipt = await approveTx.wait();
        console.log(`Approval confirmed in block: ${receipt.blockNumber}`);

        // Wait a bit for network propagation
        await sleep(2000);

        return receipt;
    }

    /**
     * Check if order is still valid and fillable
     */
    async validateOrder(provider, orderHash, makerAddress) {
        const signer = await provider.getSigner()
        const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_V6_ABI, signer);

        try {
            const remaining = await contract.rawRemainingInvalidatorForOrder(makerAddress, orderHash);

            if (remaining !== BigInt(0)) {
                throw new Error('Order is fully filled or cancelled');
            }

            return remaining;
        } catch (error) {
            if (error.message.includes('fully filled')) {
                throw error;
            }
            throw new Error(`Order validation failed: ${error.message}`);
        }
    }

    /**
     * Fill a complete limit order using V6 contract - EOA only
     */
    async fillCompleteOrder(signer, orderHash, signature, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const confirmationTimeout = options.confirmationTimeout || 300000; // 5 minutes

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`\n=== Fill Order Attempt ${attempt}/${maxRetries} ===`);
                console.log(`Order Hash: ${orderHash}`);

                const provider = signer.provider;
                const userAddress = await signer.getAddress();

                // Step 1: Fetch order data with retry
                console.log('📥 Fetching order data...');
                const orderData = await retryWithBackoff(async () => {
                    return await getOrderDetails(orderHash);
                });

                console.log('✅ Order data received:', {
                    makerAsset: orderData.makerAsset,
                    takerAsset: orderData.takerAsset,
                    makingAmount: orderData.data?.makingAmount || orderData.makingAmount,
                    takingAmount: orderData.data?.takingAmount || orderData.takingAmount,
                    maker: orderData.data?.maker || orderData.maker
                });

                // Step 2: Parse order struct for V6
                const orderStruct = this.parseOrderStruct(orderData);
                console.log('✅ Order formatted for V6');

                // Step 3: Validate order is still fillable
                console.log('🔍 Validating order...');
                await this.validateOrder(provider, orderHash, orderStruct.maker);
                console.log('✅ Order is valid and fillable');

                // Step 4: Check user requirements
                console.log('💰 Checking user balance and allowance...');
                const requirements = await this.checkUserRequirements(
                    provider,
                    userAddress,
                    orderStruct.takerAsset,
                    orderStruct.takingAmount
                );

                console.log('📊 User requirements check:', {
                    hasBalance: requirements.hasBalance,
                    hasAllowance: requirements.hasAllowance,
                    balance: ethers.formatUnits(requirements.balance, requirements.decimals),
                    required: ethers.formatUnits(requirements.required, requirements.decimals),
                    symbol: requirements.symbol
                });

                if (!requirements.hasBalance) {
                    throw new Error(`❌ Insufficient ${requirements.symbol} balance. Required: ${ethers.formatUnits(requirements.required, requirements.decimals)}, Available: ${ethers.formatUnits(requirements.balance, requirements.decimals)}`);
                }

                // Step 5: Approve tokens if needed
                if (!requirements.hasAllowance && requirements.symbol !== 'ETH') {
                    console.log('🔓 Token approval required...');
                    await this.approveToken(signer, orderStruct.takerAsset, orderStruct.takingAmount);
                    console.log('✅ Token approval completed');
                } else {
                    console.log('✅ Token already approved or ETH transaction');
                }

                // Step 6: Prepare transaction
                const fillAmount = orderStruct.takingAmount;
                const extensionHex =
                    orderData.data.extension && orderData.data.extension.startsWith('0x')
                        ? orderData.data.extension
                        : '0x';

                const extension = Extension.decode(extensionHex);

                // Create TakerTraits manually
                const takerTraits = TakerTraits.default()
                    .setAmountMode(AmountMode.maker)
                    .setExtension(extension);          

                // Get the encoded values
                const { trait, args } = takerTraits.encode();

                // Step 7: Create and send transaction
                console.log('🚀 Creating EOA order transaction...');
                const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_V6_ABI, signer);

                let fillTx;
                try {
                    const { r, vs } = await splitSignature(signature);
                    // try {
                    //     const gasEstimate = await contract.fillOrderArgs.estimateGas(
                    //         orderStruct,
                    //         r,
                    //         vs,
                    //         fillAmount,
                    //         trait,
                    //         args
                    //     );
                    //     console.log(gasEstimate);
                    //     const result = await contract.fillOrderArgs.staticCall(orderStruct,
                    //         r,
                    //         vs,
                    //         fillAmount,
                    //         trait,
                    //         args
                    //     );
                    //     console.log(result)
                    // } catch (error) {
                    //     console.log('Gas or Static call error:', error);
                    // }
                    fillTx = await contract.fillOrderArgs(
                        orderStruct,
                        r,
                        vs,
                        fillAmount,
                        trait,
                        args
                    );

                    console.log(`✅ Transaction sent successfully: ${fillTx.hash}`);
                } catch (txError) {
                    console.error('❌ Transaction failed:', txError);

                    // Parse specific transaction errors
                    if (txError.message.includes('user rejected')) {
                        throw new Error('Transaction was rejected by user');
                    } else if (txError.message.includes('insufficient funds')) {
                        throw new Error('Insufficient funds for transaction');
                    } else if (txError.code === -32603) {
                        throw new Error('RPC Error: Transaction validation failed. This might be due to insufficient balance, invalid order, or network issues.');
                    }

                    throw txError;
                }

                // Step 8: Wait for confirmation with timeout
                console.log('⏳ Waiting for transaction confirmation...');

                const receipt = await Promise.race([
                    fillTx.wait(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Transaction confirmation timeout')), confirmationTimeout)
                    )
                ]);

                console.log(`🎉 Transaction confirmed in block: ${receipt.blockNumber}`);
                console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

                // Step 9: Parse logs for actual filled amounts
                let actualMakingAmount = orderStruct.makingAmount.toString();
                let actualTakingAmount = orderStruct.takingAmount.toString();

                try {
                    const orderFilledTopic = ethers.id('OrderFilled(bytes32,uint256)');
                    const orderFilledLog = receipt.logs.find(log => log.topics[0] === orderFilledTopic);

                    if (orderFilledLog) {
                        const decodedLog = ethers.AbiCoder.defaultAbiCoder().decode(
                            ['bytes32', 'uint256'],
                            orderFilledLog.data
                        );
                        actualMakingAmount = decodedLog[1].toString();
                        console.log(`📊 Actual filled amount: ${actualMakingAmount}`);
                    }
                } catch (logError) {
                    console.warn('⚠️  Could not parse transaction logs:', logError);
                }

                const result = {
                    success: true,
                    transactionHash: fillTx.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    orderHash,
                    filledMakingAmount: actualMakingAmount,
                    filledTakingAmount: actualTakingAmount,
                    attempt
                };

                console.log('🎊 Order filled successfully!', result);
                return result;

            } catch (error) {
                console.error(`❌ Attempt ${attempt} failed:`, error.message);

                // Don't retry for certain types of errors
                if (
                    error.message.includes('rejected by user') ||
                    error.message.includes('Order is fully filled') ||
                    error.message.includes('Order has expired') ||
                    error.message.includes('Insufficient') ||
                    attempt === maxRetries
                ) {
                    throw error;
                }

                // Wait before retrying
                const retryDelay = 3000 * attempt;
                console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
                await sleep(retryDelay);
            }
        }
    }
}

// Export additional utilities
export { normalizeAddress, splitSignature, sleep, retryWithBackoff };