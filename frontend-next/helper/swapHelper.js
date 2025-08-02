import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { config } from '../config';

export const useSwap = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
  
    const swapTokens = useCallback(async (signer, params) => {
      setLoading(true);
      setError(null);
      
      try {
        // Build query string
        const query = new URLSearchParams({
          src: params.fromToken,
          dst: params.toToken,
          amount: params.amount,
          from: params.fromAddress,
          slippage: params.slippage || '1',
          ...(params.receiver && { receiver: params.receiver })
        });
  
        const response = await fetch(`/api/swap?${query}`);
        
        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(text || 'Invalid API response');
        }
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Swap API error');
        }
  
        const swapData = await response.json();
  
        // Execute swap
        const tx = {
          to: swapData.tx.to,
          data: swapData.tx.data,
          value: swapData.tx.value || '0',
          gasLimit: swapData.tx.gas || '500000'
        };
  
        const transaction = await signer.sendTransaction(tx);
        const receipt = await transaction.wait();
  
        return {
          transactionHash: transaction.hash,
          fromAmount: params.amount,
          toAmount: swapData.toTokenAmount,
          receipt
        };
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    }, []);
  
    return { swapTokens, loading, error };
  };