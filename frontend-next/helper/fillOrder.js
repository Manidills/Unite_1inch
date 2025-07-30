// utils/orderFiller.js
import { ethers } from 'ethers';
import { useState, useCallback } from 'react';
import { getOrderDetails } from '../helper/apiHelper';

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
  
  const estimateGas = useCallback(async (provider, orderHash, signature) => {
    try {
      return await filler.estimateGas(provider, orderHash, signature);
    } catch (err) {
      console.warn('Gas estimation failed:', err);
      return BigInt(300000);
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
    estimateGas,
    validateOrder,
    loading,
    error,
    clearError: () => setError(null)
  };
};

const LIMIT_ORDER_PROTOCOL_ADDRESSES = {
  1: '0x111111125421ca6dc452d289314280a0f8842a65',     // Ethereum mainnet
};

// Updated ABI for 1inch V6 contract
const LIMIT_ORDER_V6_ABI = [
  // V6 fillOrder function with correct signature
  'function fillOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) payable returns (uint256, uint256, bytes32)',
  
  // Alternative fillOrderArgs if you need to pass additional data
  'function fillOrderArgs((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) payable returns (uint256, uint256, bytes32)',
  
  // For contract orders (if maker is a contract)
  'function fillContractOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes signature, uint256 amount, uint256 takerTraits) returns (uint256, uint256, bytes32)',
  
  // Utility functions
  'function rawRemainingInvalidatorForOrder(address maker, bytes32 orderHash) view returns (uint256)',
  'function hashOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) view returns (bytes32)',
  'function checkPredicate(bytes predicate) view returns (bool)'
];

// ERC20 ABI for token operations
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

/**
 * Helper function to convert address to packed format used by 1inch V6
 */
function packAddress(address) {
  // Remove 0x prefix and convert to BigInt
  const hex = address.replace('0x', '');
  return BigInt('0x' + hex);
}

/**
 * Helper function to split signature into r, s, v components for V6
 */
function splitSignature(signature) {
  const sig = ethers.Signature.from(signature);
  
  // V6 uses packed vs format (v + s)
  let vs = sig.s;
  if (sig.v === 28) {
    // Set the highest bit for v=28
    vs = BigInt(sig.s) | (BigInt(1) << BigInt(255));
  }
  
  return {
    r: sig.r,
    vs: '0x' + vs.toString(16).padStart(64, '0')
  };
}

/**
 * Simple Order Filler Class for 1inch V6
 */
export class SimpleOrderFiller {
  constructor(chainId) {
    this.chainId = chainId;
    this.contractAddress = LIMIT_ORDER_PROTOCOL_ADDRESSES[chainId];
    
    if (!this.contractAddress) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }

  /**
   * Convert API order data to V6 contract struct format
   */
  parseOrderStruct(orderData) {
    return {
      salt: BigInt(orderData.data.salt || '0'),
      maker: packAddress(orderData.data.maker),
      receiver: packAddress(orderData.data.receiver || orderData.data.maker),
      makerAsset: packAddress(orderData.makerAsset),
      takerAsset: packAddress(orderData.takerAsset),
      makingAmount: BigInt(orderData.data.makingAmount),
      takingAmount: BigInt(orderData.data.takingAmount),
      makerTraits: BigInt(orderData.data.makerTraits || '0')
    };
  }

  /**
   * Check if user has sufficient balance and allowance
   */
  async checkUserRequirements(provider, userAddress, tokenAddress, amount) {
    // Handle ETH case
    if (tokenAddress === ethers.ZeroAddress || tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      const balance = await provider.getBalance(userAddress);
      return {
        hasBalance: balance >= amount,
        hasAllowance: true, // ETH doesn't need allowance
        balance,
        allowance: BigInt(0),
        symbol: 'ETH',
        decimals: 18,
        required: amount
      };
    }

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Check balance
    const balance = await tokenContract.balanceOf(userAddress);
    const hasBalance = balance >= amount;
    
    // Check allowance
    const allowance = await tokenContract.allowance(userAddress, this.contractAddress);
    const hasAllowance = allowance >= amount;
    
    // Get token info
    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    return {
      hasBalance,
      hasAllowance,
      balance,
      allowance,
      symbol,
      decimals,
      required: amount
    };
  }

  /**
   * Approve tokens for the limit order contract
   */
  async approveToken(signer, tokenAddress, amount) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    console.log('Approving tokens...');
    const tx = await tokenContract.approve(this.contractAddress, amount);
    console.log(`Approval tx: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Approval confirmed in block: ${receipt.blockNumber}`);
    
    return receipt;
  }

  /**
   * Check if order is still valid and fillable
   */
  async validateOrder(provider, orderHash, makerAddress) {
    const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_V6_ABI, provider);
    
    // Check remaining amount using the V6 function
    const remaining = await contract.rawRemainingInvalidatorForOrder(makerAddress, orderHash);
    
    if (remaining !== BigInt(0)) {
      throw new Error('Order is fully filled or cancelled');
    }
    
    return remaining;
  }

  /**
   * Fill a complete limit order using V6 contract
   */
  async fillCompleteOrder(signer, orderHash, signature, options = {}) {
    try {
      console.log(`Starting to fill order: ${orderHash}`);
      
      const provider = signer.provider;
      const userAddress = await signer.getAddress();
      
      // Step 1: Fetch order data
      console.log('Fetching order data...');
      const orderData = await getOrderDetails(orderHash);
      console.log('Order data received:', {
        makerAsset: orderData.makerAsset,
        takerAsset: orderData.takerAsset,
        makingAmount: orderData.data.makingAmount,
        takingAmount: orderData.data.takingAmount,
        maker: orderData.data.maker
      });
      
      // Step 2: Validate order is still fillable
      console.log('Validating order...');
      await this.validateOrder(provider, orderHash, orderData.data.maker);
      
      // Step 3: Parse order struct for V6
      const orderStruct = this.parseOrderStruct(orderData);
      console.log('Validated and formatted order for V6');

      // Step 4: Check user requirements
      console.log('Checking user balance and allowance...');
      const requirements = await this.checkUserRequirements(
        provider,
        userAddress,
        orderData.takerAsset,
        BigInt(orderData.data.takingAmount)
      );
      
      console.log('User requirements:', {
        hasBalance: requirements.hasBalance,
        hasAllowance: requirements.hasAllowance,
        balance: ethers.formatUnits(requirements.balance, requirements.decimals),
        required: ethers.formatUnits(requirements.required, requirements.decimals),
        symbol: requirements.symbol
      });
      
      if (!requirements.hasBalance) {
        throw new Error(`Insufficient ${requirements.symbol} balance. Required: ${ethers.formatUnits(requirements.required, requirements.decimals)}, Available: ${ethers.formatUnits(requirements.balance, requirements.decimals)}`);
      }
      
      // Step 5: Approve tokens if needed (skip for ETH)
      if (!requirements.hasAllowance && requirements.symbol !== 'ETH') {
        console.log('Token approval required...');
        await this.approveToken(signer, orderData.takerAsset, BigInt(orderData.data.takingAmount));
        console.log('Token approval completed');
      } else {
        console.log('Token already approved or ETH transaction');
      }
      
      // Step 6: Prepare signature for V6
      const { r, vs } = splitSignature(signature);
      
      // Step 7: Fill the order using V6 contract
      console.log('Filling order with V6 contract...');
      const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_V6_ABI, signer);
      
      const fillAmount = BigInt(orderData.data.takingAmount); // Amount taker wants to fill
      const takerTraits = BigInt(0); // Default taker traits
      
      const txOptions = {
        gasLimit: options.gasLimit || 300000,
        ...(requirements.symbol === 'ETH' && { value: fillAmount }), // Add ETH value if needed
        ...(options.gasPrice && { gasPrice: options.gasPrice }),
        ...(options.maxFeePerGas && { 
          maxFeePerGas: options.maxFeePerGas,
          maxPriorityFeePerGas: options.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei')
        })
      };
      
      // Determine if maker is a contract (use fillContractOrder) or EOA (use fillOrder)
      const makerCode = await provider.getCode(orderData.data.maker);
      const isContractMaker = makerCode !== '0x';
      
      let fillTx;
      
      if (isContractMaker) {
        // Use fillContractOrder for contract makers
        fillTx = await contract.fillContractOrder(
          orderStruct,
          signature, // Full signature for contract orders
          fillAmount,
          takerTraits,
          txOptions
        );
      } else {
        // Use fillOrder for EOA makers
        fillTx = await contract.fillOrder(
          orderStruct,
          r,
          vs,
          fillAmount,
          takerTraits,
          txOptions
        );
      }
      
      console.log(`Fill transaction sent: ${fillTx.hash}`);
      
      // Step 8: Wait for confirmation
      const receipt = await fillTx.wait();
      console.log(`Fill transaction confirmed in block: ${receipt.blockNumber}`);
      
      // Parse logs to get actual filled amounts
      let actualMakingAmount = orderData.data.makingAmount;
      let actualTakingAmount = orderData.data.takingAmount;
      
      // Look for OrderFilled event in logs
      const orderFilledTopic = ethers.id('OrderFilled(bytes32,uint256)');
      const orderFilledLog = receipt.logs.find(log => log.topics[0] === orderFilledTopic);
      
      if (orderFilledLog) {
        const decodedLog = ethers.AbiCoder.defaultAbiCoder().decode(
          ['bytes32', 'uint256'], 
          orderFilledLog.data
        );
        actualMakingAmount = decodedLog[1].toString();
      }
      
      return {
        success: true,
        transactionHash: fillTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        orderHash,
        filledMakingAmount: actualMakingAmount,
        filledTakingAmount: actualTakingAmount,
        isContractMaker
      };
      
    } catch (error) {
      console.error('Fill order failed:', error);
      
      // Parse specific V6 errors
      if (error.message.includes('OrderExpired')) {
        throw new Error('Order has expired');
      } else if (error.message.includes('InvalidatedOrder')) {
        throw new Error('Order has been cancelled or invalidated');
      } else if (error.message.includes('InsufficientBalance')) {
        throw new Error('Insufficient balance to fill order');
      } else if (error.message.includes('TakingAmountExceeded')) {
        throw new Error('Taking amount exceeded available');
      }
      
      throw error;
    }
  }

  /**
   * Estimate gas for filling an order
   */
  async estimateGas(provider, orderHash, signature) {
    try {
      const orderData = await getOrderDetails(orderHash);
      const orderStruct = this.parseOrderStruct(orderData);
      const { r, vs } = splitSignature(signature);
      
      const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_V6_ABI, provider);
      
      const fillAmount = BigInt(orderData.data.takingAmount);
      const takerTraits = BigInt(0);
      
      // Check if maker is contract
      const makerCode = await provider.getCode(orderData.data.maker);
      const isContractMaker = makerCode !== '0x';
      
      let gasEstimate;
      
      if (isContractMaker) {
        gasEstimate = await contract.fillContractOrder.estimateGas(
          orderStruct,
          signature,
          fillAmount,
          takerTraits
        );
      } else {
        gasEstimate = await contract.fillOrder.estimateGas(
          orderStruct,
          r,
          vs,
          fillAmount,
          takerTraits
        );
      }
      
      return gasEstimate;
    } catch (error) {
      console.warn('Gas estimation failed:', error);
      return BigInt(400000); // Higher fallback for V6
    }
  }

  /**
   * Get order hash using the V6 contract
   */
  async getOrderHash(provider, orderData) {
    const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_V6_ABI, provider);
    const orderStruct = this.parseOrderStruct(orderData);
    
    return await contract.hashOrder(orderStruct);
  }
}

// Export additional utilities
export { packAddress, splitSignature };