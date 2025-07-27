import { MakerTraits, Address, FetchProviderConnector, Sdk } from '@1inch/limit-order-sdk';
import { ethers } from 'ethers';
import { abi as erc20Abi } from './abi'
import { config } from '../config/index';
import { insertOrderIntoDB } from './apiHelper';

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

        const apiConfig = {
            networkId: config.chainId,
            authKey: `${config.oneInch.apiKey}`,
            httpConnector: new FetchProviderConnector()
        };

        const sdk = new Sdk(apiConfig);

        const expiresIn = BigInt(6000)
        const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn
        const makerTraits = MakerTraits.default()
            .withExpiration(expiration)
            .allowMultipleFills()
            .allowPartialFills()

        const limitOrder = await sdk.createOrder(orderInfo, makerTraits)

        const typedData = limitOrder.getTypedData(chainId)
        const signature = await maker.signTypedData(
            typedData.domain,
            { Order: typedData.types.Order },
            typedData.message
        )

        console.log('✅ limitOrder', limitOrder)
        console.log('✅ signature', signature)
        const orderHash = limitOrder.getOrderHash(1)

        await sdk.submitOrder(limitOrder, signature)

        const orderBody = {
            orderHash,
            ...tradeInfo,
        }
        const insertOrder = await insertOrderIntoDB(orderBody)
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
