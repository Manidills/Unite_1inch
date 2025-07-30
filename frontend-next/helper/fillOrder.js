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

// Minimal ABI for filling orders
const LIMIT_ORDER_ABI = [
  'function fillOrder((address,address,uint256,uint256,uint256,address,address,address,uint256,bytes) order, bytes signature, bytes interaction, uint256 makingAmount, uint256 takingAmount) external payable returns (uint256, uint256, bytes32)',
  'function remaining(bytes32 orderHash) external view returns (uint256)'
];

// ERC20 ABI for token operations
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

/**
 * Simple Order Filler Class
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
   * Convert API order data to contract struct format
   */
  async parseOrderStruct(orderData) {
    return [
      orderData.makerAsset,                           // address makerAsset
      orderData.takerAsset,                           // address takerAsset
      orderData.data.makingAmount,                         // uint256 makingAmount
      orderData.data.takingAmount,                         // uint256 takingAmount
      orderData.data.salt || '0',                          // uint256 salt
      orderData.data.maker,                                // address maker
      orderData.data.receiver || orderData.data.maker,         // address receiver
      orderData.allowedSender || ethers.ZeroAddress, // address allowedSender
      orderData.data.makerTraits || '0',                   // uint256 makerTraits
      orderData.interactions || '0x'                  // bytes interactions
    ];
  }

  /**
   * Check if user has sufficient balance and allowance
   */
  async checkUserRequirements(provider, userAddress, tokenAddress, amount) {
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
  async validateOrder(provider, orderHash) {
    const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_ABI, provider);
    console.log('done')
    // Check remaining amount
    const remaining = await contract.remaining(orderHash);
    console.log('remaining', remaining)
    if (remaining === BigInt(0)) {
      console.log('error')
      throw new Error('Order is fully filled or cancelled');
    }
    
    return remaining;
  }

  /**
   * Fill a complete limit order
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
        takingAmount: orderData.data.takingAmount
      });
      
      // Step 2: Validate order is still fillable
      console.log('Validating order...');
      await this.validateOrder(provider, orderHash);
      
      // Step 3: Parse order struct
      const orderStruct = await this.parseOrderStruct(orderData);
      console.log('Validated and formatted order', orderStruct)

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
      
      // Step 5: Approve tokens if needed
      if (!requirements.hasAllowance) {
        console.log('Token approval required...');
        await this.approveToken(signer, orderData.takerAsset, BigInt(orderData.data.takingAmount));
        console.log('Token approval completed');
      } else {
        console.log('Token already approved');
      }
      
      // Step 6: Fill the order
      console.log('Filling order...');
      const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_ABI, signer);
      
      const txOptions = {
        gasLimit: options.gasLimit || 300000,
        ...(options.gasPrice && { gasPrice: options.gasPrice }),
        ...(options.maxFeePerGas && { 
          maxFeePerGas: options.maxFeePerGas,
          maxPriorityFeePerGas: options.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei')
        })
      };
      
      const fillTx = await contract.fillOrder(
        orderStruct,
        signature,
        '0x', // no interaction needed for simple fills
        BigInt(orderData.data.makingAmount), // fill complete making amount
        BigInt(orderData.data.takingAmount), // fill complete taking amount
        txOptions
      );
      
      console.log(`Fill transaction sent: ${fillTx.hash}`);
      
      // Step 7: Wait for confirmation
      const receipt = await fillTx.wait();
      console.log(`Fill transaction confirmed in block: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: fillTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        orderHash,
        filledAmount: orderData.data.makingAmount
      };
      
    } catch (error) {
      console.error('Fill order failed:', error);
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
      
      const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_ABI, provider);
      
      const gasEstimate = await contract.fillOrder.estimateGas(
        orderStruct,
        signature,
        '0x',
        BigInt(orderData.data.makingAmount),
        BigInt(orderData.data.takingAmount)
      );
      
      return gasEstimate;
    } catch (error) {
      console.warn('Gas estimation failed:', error);
      return BigInt(300000); // fallback gas limit
    }
  }
}
