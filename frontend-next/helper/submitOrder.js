import { MakerTraits, Address, FetchProviderConnector, Sdk } from '@1inch/limit-order-sdk';
import { ethers } from 'ethers';
import { abi as erc20Abi } from './abi'
import { config } from '../config/index';
import { insertOrder, insertTrigger } from './apiHelper';

export const confirmOrder = async (provider, orderInfo, tradeInfo) => {
    try {
        const {
            makerAsset,
            makingAmount,
        } = orderInfo;
        const { targetValue, currentValue } = tradeInfo;
        
        const signer = await provider.getSigner();
        const walletAddress = await signer.getAddress();
        if (parseFloat(currentValue) < parseFloat(targetValue)){
            const trigger = {
                makerAsset: orderInfo.makerAsset.toString(),
                takerAsset: orderInfo.takerAsset.toString(),
                makingAmount: orderInfo.makingAmount.toString(),
                takingAmount: orderInfo.takingAmount.toString(),
                maker: orderInfo.maker.toString(),
                receiver: orderInfo.receiver.toString(),
                status: 'open',
                targetValue: targetValue,
                walletId: walletAddress.toString().toLowerCase(),
            }
            await insertTrigger(trigger)
            return {
                status: true,
                type: 'trigger'
            }
        }
        const making = new Address(makerAsset);

        // ✅ 1. Check and approve token if needed
        console.log('Checking token allowance...');
        await approveTokenIfNeeded(making.toString(), makingAmount, signer);

        const apiConfig = {
            networkId: config.chainId,
            authKey: `${config.oneInch.apiKey}`,
            httpConnector: new FetchProviderConnector(),
            baseUrl: `${config.oneInch.proxy}/orderbook/v4.0`
        };

        const sdk = new Sdk(apiConfig);

        const expiresIn = BigInt(parseInt(config.expiry))
        const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn
        const makerTraits = MakerTraits.default()
            .withExpiration(expiration)
            .allowMultipleFills()
            .allowPartialFills()

        const cleanedOrder = {
            makerAsset: new Address(orderInfo.makerAsset),
            takerAsset: new Address(orderInfo.takerAsset),
            makingAmount: orderInfo.makingAmount,
            takingAmount: orderInfo.takingAmount,
            maker: orderInfo.maker,
            receiver: orderInfo.receiver,
        };
        const limitOrder = await sdk.createOrder(cleanedOrder, makerTraits)

        const typedData = limitOrder.getTypedData(config.chainId)
        const signature = await signer.signTypedData(
            typedData.domain,
            { Order: typedData.types.Order },
            typedData.message
        )

        const orderHash = limitOrder.getOrderHash(1)

        await sdk.submitOrder(limitOrder, signature)

        const orderBody = {
            orderHash,
            walletAddress,
            signature,
            ...tradeInfo,
        }
        const insertedOrder = await insertOrder(orderBody)
        if (!insertedOrder) {
            return {
                success: fail,
                type: 'order'
            }
        }
        return {
            success: true,
            type: 'order' 
        }
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
