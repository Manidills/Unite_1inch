import { Address, LimitOrder } from '@1inch/limit-order-sdk';
import { ethers } from 'ethers';
import { abi as erc20Abi } from './abi'
import { config } from '../config/index';
import { submitAndInsertOrder, createOrder } from './apiHelper';

export const confirmOrder = async (provider, orderInfo, tradeInfo) => {
    try {
        const {
            makerAsset,
            makingAmount,
        } = orderInfo;
        const signer = await provider.getSigner();

        const making = new Address(makerAsset);

        // ✅ 1. Check and approve token if needed
        console.log('Checking token allowance...');
        await approveTokenIfNeeded(making.toString(), makingAmount, signer);

        const typedData = await createOrder(orderInfo)
        const signature = await signer.signTypedData(
            typedData.domain,
            { Order: typedData.types.Order },
            typedData.message
        )

        console.log("message---------", typedData.message)
        const limitOrder = new LimitOrder(typedData.message); 
        console.log("limitorder---------", limitOrder)
        const orderHash = limitOrder.getOrderHash(1);
        console.log("limitorder---------", orderHash)
        const orderDetails = {
            orderHash,
            ...tradeInfo,
        }
        const insertOrder = await submitAndInsertOrder(orderDetails, limitOrder, signature)
        if (!insertOrder) {
            return false
        }
        return true
    } catch (error) {
        console.log(error)
        return false
    }
};

const approveTokenIfNeeded = async (tokenAddress, amount, signer) => {
    const account = await signer.getAddress();
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    // Check current allowance
    const allowance = await tokenContract.allowance(account, config.oneInch.allowanceTarget);
    if (allowance < amount) {
        console.log('Insufficient allowance, requesting approval...');
        // Request approval for maximum amount to avoid future approvals
        const tx = await tokenContract.approve(config.oneInch.allowanceTarget, ethers.MaxUint256);
        console.log('Waiting for approval transaction...', tx.hash);
        await tx.wait();
        console.log('✅ Token approved');
        // Wait briefly for on-chain state synchronization
        await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
        console.log('✅ Token already approved');
    }
};