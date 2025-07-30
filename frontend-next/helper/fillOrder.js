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
      return BigInt(500000); // Increased fallback
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
  'function fillOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) payable returns (uint256, uint256, bytes32)',
  'function fillOrderArgs((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) payable returns (uint256, uint256, bytes32)',
  'function fillContractOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes signature, uint256 amount, uint256 takerTraits) returns (uint256, uint256, bytes32)',
  'function rawRemainingInvalidatorForOrder(address maker, bytes32 orderHash) view returns (uint256)',
  'function hashOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) view returns (bytes32)',
  'function checkPredicate(bytes predicate) view returns (bool)'
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
 * Helper function to convert address to packed format used by 1inch V6
 */
function packAddress(address) {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  const hex = address.replace('0x', '');
  return BigInt('0x' + hex);
}

/**
 * Helper function to split signature into r, s, v components for V6
 */
function splitSignature(signature) {
  try {
    const sig = ethers.Signature.from(signature);

    // V6 uses packed vs format (v + s)
    let vs = BigInt(sig.s);
    if (sig.v === 28) {
      // Set the highest bit for v=28
      vs = BigInt(sig.s) | (BigInt(1) << BigInt(255));
    }

    return {
      r: sig.r,
      vs: '0x' + vs.toString(16).padStart(64, '0')
    };
  } catch (error) {
    throw new Error(`Invalid signature format: ${error.message}`);
  }
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
    try {
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
    } catch (error) {
      throw new Error(`Failed to parse order struct: ${error.message}`);
    }
  }

  /**
   * Check if user has sufficient balance and allowance
   */
  async checkUserRequirements(provider, userAddress, tokenAddress, amount) {
    const isETH = tokenAddress === ethers.ZeroAddress ||
      tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    if (isETH) {
      const balance = await provider.getBalance(userAddress);
      return {
        hasBalance: balance >= amount,
        hasAllowance: true,
        balance,
        allowance: BigInt(0),
        symbol: 'ETH',
        decimals: 18,
        required: amount
      };
    }

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
   * Approve tokens for the limit order contract with retry mechanism
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
   * Enhanced gas estimation with multiple fallbacks
   */
  async estimateGasForOrder(provider, orderStruct, signature, fillAmount, isContractMaker) {
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_V6_ABI, signer);
    const takerTraits = BigInt(0);

    try {
      let gasEstimate;

      if (isContractMaker) {
        gasEstimate = await contract.fillContractOrder.estimateGas(
          orderStruct,
          signature,
          fillAmount,
          takerTraits
        );
      } else {
        const { r, vs } = splitSignature(signature);
        gasEstimate = await contract.fillOrderArgs.estimateGas(
          orderStruct,
          r,
          vs,
          fillAmount,
          takerTraits,
          '0x',
          {
            value: ethers.parseEther('0') // or non-zero ETH if required
          }
        );
      }
      return gasEstimate;
    } catch (error) {
      console.warn('Gas estimation failed:', error);
      // Return higher fallback based on order type
      return isContractMaker ? BigInt(6000) : BigInt(10000);
    }
  }

  /**
   * Fill a complete limit order using V6 contract with enhanced error handling
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
          makingAmount: orderData.data.makingAmount,
          takingAmount: orderData.data.takingAmount,
          maker: orderData.data.maker
        });

        // Step 2: Validate order is still fillable
        console.log('🔍 Validating order...');
        await this.validateOrder(provider, orderHash, orderData.data.maker);
        console.log('✅ Order is valid and fillable');

        // Step 3: Parse order struct for V6
        const orderStruct = this.parseOrderStruct(orderData);
        console.log('✅ Order formatted for V6');

        // Step 4: Check user requirements
        console.log('💰 Checking user balance and allowance...');
        const requirements = await this.checkUserRequirements(
          provider,
          userAddress,
          orderData.takerAsset,
          BigInt(orderData.data.takingAmount)
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
          await this.approveToken(signer, orderData.takerAsset, BigInt(orderData.data.takingAmount));
          console.log('✅ Token approval completed');
        } else {
          console.log('✅ Token already approved or ETH transaction');
        }

        // Step 6: Check if maker is contract
        const makerCode = await provider.getCode(orderData.data.maker);
        const isContractMaker = makerCode !== '0x';
        console.log(`📋 Maker type: ${isContractMaker ? 'Contract' : 'EOA'}`);

        // Step 7: Estimate gas
        console.log('⛽ Estimating gas...');
        const gasEstimate = await this.estimateGasForOrder(
          provider,
          orderStruct,
          signature,
          BigInt(orderData.data.takingAmount),
          isContractMaker
        );
        console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);

        // Step 8: Prepare transaction options
        const fillAmount = BigInt(orderData.data.takingAmount);
        const takerTraits = BigInt(0);

        const txOptions = {
          gasLimit: options.gasLimit ?? gasEstimate, // use `??` for nullish check
          ...(requirements.symbol === 'ETH' && {
            value: BigInt(fillAmount.toString()) // ensure BigInt if using ethers v6
          }),
          ...(options.gasPrice && {
            gasPrice: BigInt(options.gasPrice.toString())
          }),
          ...(options.maxFeePerGas && {
            maxFeePerGas: BigInt(options.maxFeePerGas.toString()),
            maxPriorityFeePerGas: BigInt(
              (options.maxPriorityFeePerGas ?? ethers.parseUnits('2', 'gwei')).toString()
            )
          })
        };


        console.log('📝 Transaction options:', {
          gasLimit: txOptions.gasLimit.toString(),
          value: txOptions.value ? ethers.formatEther(txOptions.value) + ' ETH' : '0 ETH',
          hasGasPrice: !!txOptions.gasPrice,
          hasMaxFeePerGas: !!txOptions.maxFeePerGas
        });

        // Step 9: Create and send transaction
        console.log('🚀 Creating transaction...');
        const _signer = await provider.getSigner()
        const contract = new ethers.Contract(this.contractAddress, LIMIT_ORDER_V6_ABI, _signer);

        let fillTx;
        try {
          if (isContractMaker) {
            console.log('📤 Sending contract order transaction...');
            fillTx = await contract.fillContractOrder(
              orderStruct,
              signature,
              fillAmount,
              takerTraits,
              txOptions
            );
          } else {
            const { r, vs } = splitSignature(signature);
            console.log('📤 Sending EOA order transaction...');
            fillTx = await contract.fillOrder(
              orderStruct,
              r,
              vs,
              fillAmount,
              takerTraits,
              txOptions
            );
          }

          console.log(`✅ Transaction sent successfully: ${fillTx.hash}`);
        } catch (txError) {
          console.error('❌ Transaction failed:', txError);

          // Parse specific transaction errors
          if (txError.message.includes('user rejected')) {
            throw new Error('Transaction was rejected by user');
          } else if (txError.message.includes('insufficient funds')) {
            throw new Error('Insufficient funds for transaction');
          } else if (txError.message.includes('gas')) {
            throw new Error(`Gas related error: ${txError.message}`);
          } else if (txError.code === -32603) {
            throw new Error('RPC Error: Transaction validation failed. This might be due to insufficient balance, invalid order, or network issues.');
          }

          throw txError;
        }

        // Step 10: Wait for confirmation with timeout
        console.log('⏳ Waiting for transaction confirmation...');

        const receipt = await Promise.race([
          fillTx.wait(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), confirmationTimeout)
          )
        ]);

        console.log(`🎉 Transaction confirmed in block: ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

        // Step 11: Parse logs for actual filled amounts
        let actualMakingAmount = orderData.data.makingAmount;
        let actualTakingAmount = orderData.data.takingAmount;

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
          isContractMaker,
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

  /**
   * Estimate gas for filling an order
   */
  async estimateGas(provider, orderHash, signature) {
    try {
      const orderData = await getOrderDetails(orderHash);
      const orderStruct = this.parseOrderStruct(orderData);

      const makerCode = await provider.getCode(orderData.data.maker);
      const isContractMaker = makerCode !== '0x';

      return await this.estimateGasForOrder(
        provider,
        orderStruct,
        signature,
        BigInt(orderData.data.takingAmount),
        isContractMaker
      );
    } catch (error) {
      console.warn('Gas estimation failed:', error);
      return BigInt(500000);
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
export { packAddress, splitSignature, sleep, retryWithBackoff };