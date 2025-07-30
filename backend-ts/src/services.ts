import { Handler } from 'express';
import { MakerTraits, Address, FetchProviderConnector, Sdk } from '@1inch/limit-order-sdk';
import { Wallet, ethers } from 'ethers'
import { config } from './config/index'
import axios from 'axios';
import { abi as erc20Abi } from './config/abi'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient()

export const getAllChains: Handler = async (req, res) => {
    const url = `${config.oneInch.baseUrl}/portfolio/portfolio/v5.0/general/supported_chains`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${config.oneInch.apiKey}`,
            },
        });
        const data = response.data;
        return res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch chains" });
    }
}

export const getAllTokens: Handler = async (req, res) => {
    const url = `${config.oneInch.baseUrl}/swap/v5.2/1/tokens`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${config.oneInch.apiKey}`,
            },
        });
        const data = response.data;
        return res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch chains" });
    }
}

export const getTokenPrices: Handler = async (req, res) => {
    const { tokens } = req.query
    const url = `${config.oneInch.baseUrl}/price/v1.1/1/${tokens}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${config.oneInch.apiKey}`,
            },
            params: {
                currency: "USD",
            }
        });
        const data = response.data;
        return res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch chains" });
    }
}

export const getAllLimitOrdersByAddress: Handler = async (req, res) => {
    const address = config.wallet.address as string
    const url = `${config.oneInch.baseUrl}/orderbook/v4.0/1/address/${address}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${config.oneInch.apiKey}`,
            },
            params: {
                page: 1,
                limit: 100,
                statuses: "1,2,3",
                sortBy: "createDateTime",
            },
        });
        const data = response.data;
        return res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
}

export const postToOrderBook: Handler = async (req, res) => {
    const chainId = req.body.chainId as number
    try {
        const postBody = {
            "orderHash": "0xb38fb763d044ea23826018cec9541f3799ea887ec921107a9bb3c99182b8ea75",
            "signature": "string",
            "data": {
                "makerAsset": "0xdac17f958d2ee523a2206206994597c13d831ec7",
                "takerAsset": "0x111111111117dc0aa78b770fa6a738034120c302",
                "maker": "string",
                "receiver": "string",
                "makingAmount": "100000000",
                "takingAmount": "10000000000000000000",
                "salt": "17649669",
                "extension": "17649669",
                "makerTraits": "string"
            }
        }

        // Post to 1inch orderbook
        const response = await axios.post(
            `${config.oneInch.baseUrl}/orderbook/v4.0/${chainId}`,
            postBody,
            {
                headers: {
                    Authorization: `Bearer ${config.oneInch.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        res.status(200).json(response)
    } catch (error) {
        console.log(error)
        console.log(JSON.stringify(error))
        res.status(500).json({ error: "Failed to sign or post limit order" });
    }
}

export const createLimitOrder: Handler = async (req, res) => {
    const chainId = req.body.chainId as number
    try {
        const pk = config.wallet.privateKey as string
        const provider = new ethers.JsonRpcProvider(config.rpc.url)
        const maker = new Wallet(pk, provider)

        // Tokens
        const WETH = new Address('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
        const USDC = new Address('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')

        // ✅ 1. Approve WETH if needed
        const wethContract = new ethers.Contract(WETH.toString(), erc20Abi, maker)
        const amountToSell = ethers.parseUnits('0.001', 18)

        const allowance = await wethContract.allowance(maker.address, config.oneInch.allowanceTarget)

        console.log('✅ allowance', allowance)
        console.log('✅ amountToSell', amountToSell)
        let tx = await wethContract.approve(config.oneInch.allowanceTarget, ethers.MaxUint256)
        console.log('Waiting for approval tx to confirm...')
        tx = await tx.wait()
        console.log('✅ Token approved', tx)
        // ⚠ Wait briefly to allow on-chain state to sync
        await new Promise(resolve => setTimeout(resolve, 10000))
        const apiConfig = {
            networkId: chainId,
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

        const orderInfo = {
            makerAsset: WETH,
            takerAsset: USDC,
            makingAmount: ethers.parseUnits('0.001', 18),
            takingAmount: ethers.parseUnits('3', 6),
            maker: new Address(maker.address),
            receiver: new Address(maker.address),
        }
        const limitOrder = await sdk.createOrder(orderInfo, makerTraits)

        const typedData = limitOrder.getTypedData(chainId)
        const signature = await maker.signTypedData(
            typedData.domain,
            { Order: typedData.types.Order },
            typedData.message
        )

        console.log('✅ limitOrder', limitOrder)
        console.log('✅ signature', signature)
        const ordersubmitted = await sdk.submitOrder(limitOrder, signature)
        const orderHash = limitOrder.getOrderHash(1)

        const orderInfoString = await serializeLimitOrder(limitOrder)
        const ordersubmittedString = await serializeLimitOrder(ordersubmitted)
        console.log('✅ Order created and submitted!');

        const orderDetails = {
            walletId: maker.address.toString(),
            orderHash: orderHash.toString(),
            signature: signature.toString(),
            status: 'open',
            makerAsset: orderInfo.makerAsset.toString(),
            takerAsset: orderInfo.takerAsset.toString(),
            maker: orderInfo.maker.toString(),
            receiver: orderInfo.receiver.toString(),
            makingAmount: orderInfo.makingAmount.toString(),
            takingAmount: orderInfo.takingAmount.toString(),
            salt: orderInfoString,
            extension: ordersubmittedString,
            makerTraits: makerTraits.toString(),
        }

        res.status(200).json({ orderDetails })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Failed to sign or post limit order" });
    }
}

export const userLogin: Handler = async (req, res) => {
    try {
        const { walletAddress } = req.body
        const user = {
            walletAddress: walletAddress?.toString().toLowerCase(),
            lastLogin: new Date().toISOString() as string,
        }
        const result = await prisma.users.upsert({
            where: { walletAddress: walletAddress?.toString().toLowerCase() },
            create: user,
            update: user,
        });
        return res.status(200).json({
            success: true,
            message: "user logged in",
            data: result,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Failed to insert or update user" });
    }
}

async function serializeLimitOrder(order: any) {
    return JSON.stringify(order, (_, value) => {
        // Handle BigInt
        if (typeof value === 'bigint') {
            return value.toString();
        }

        // Handle Address, MakerTraits, and custom classes
        if (value && typeof value === 'object') {
            if ('val' in value) return value.val; // Address
            if ('value' in value && typeof value.value === 'bigint') return value.value.toString(); // MakerTraits
        }

        return value;
    });
}

export const createOrder: Handler = async (req, res) => {
    const { orderType } = req.query as { orderType?: string };
    try {
        const apiConfig = {
            networkId: config.chainId,
            authKey: `${config.oneInch.apiKey}`,
            httpConnector: new FetchProviderConnector()
        };

        const sdk = new Sdk(apiConfig);
        if (orderType === 'submitOrder') {
            const { orderDetails, limitOrder, signature } = req.body
            await sdk.submitOrder(limitOrder, signature);
            const order = {
                walletId: orderDetails.walletAddress as string,
                orderHash: orderDetails.orderHash as string,
                tokenPair: orderDetails.tokenPair as string,
                amount: orderDetails.amount as string,
                feePercent: orderDetails.feePercent as string,
                youReceive: orderDetails.youReceive as string,
                status: 'open',
                createdOn: new Date().toISOString()
            }
            const result = await prisma.orders.create({
                data: order
            });

            if (!result) {
                return res.status(400).json({
                    success: false,
                    error: 'Failed to insert order'
                })
            }
            return res.status(200).json({
                success: true,
                message: "order inserted in db",
                data: result
            })
        }
        if (orderType === 'createOrder') {

            const { orderInfo } = req.body

            const cleanedOrder = {
                makerAsset: new Address(orderInfo.makerAsset),
                takerAsset: new Address(orderInfo.takerAsset),
                makingAmount: BigInt(orderInfo.makingAmount),
                takingAmount: BigInt(orderInfo.takingAmount),
                maker: new Address(orderInfo.maker.val),
                receiver: new Address(orderInfo.receiver.val),
            };
            const expiresIn = BigInt(6000)
            const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn
            const makerTraits = MakerTraits.default()
                .withExpiration(expiration)
                .allowMultipleFills()
                .allowPartialFills()

            const limitOrder = await sdk.createOrder(cleanedOrder, makerTraits)
            const typedData = limitOrder.getTypedData(config.chainId)
            return res.status(200).json(typedData);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to insert order" });
    }
}

export const getGasFee: Handler = async (req, res) => {
    const { makerAsset, takerAsset, makerAmount, takerAmount } = req.query;
    const url = `${config.oneInch.baseUrl}/orderbook/v4.0/1/fee-info?makerAsset=${makerAsset}&takerAsset=${takerAsset}&makerAmount=${makerAmount}&takerAmount=${takerAmount}`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${config.oneInch.apiKey}`,
            },
        });
        const data = response.data;
        return res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch gas fee", err });
    }
}

export const insertOrder: Handler = async (req, res) => {
    const { orderBody } = req.body;
    try {
        const order = {
            walletId: orderBody.walletAddress?.toString().toLowerCase(),
            orderHash: orderBody.orderHash as string,
            signature: orderBody?.signature as string,
            tokenPair: orderBody.tokenPair as string,
            amount: orderBody.amount as string,
            feePercent: orderBody.feePercent as string,
            youReceive: orderBody.youReceive as string,
            status: 'open',
            createdOn: new Date().toISOString()
        }
        const result = await prisma.orders.create({
            data: order
        });

        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'Failed to insert order'
            })
        }
        return res.status(200).json({
            success: true,
            message: "order inserted in db",
            data: result
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to insert order" });
    }
}

export const getAllOrders: Handler = async (req, res) => {
    const { walletAddress } = req.query
    try {
        const result = await prisma.orders.findMany({
            where: {
                walletId: walletAddress?.toString().toLowerCase()
            }
        });

        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'Failed to fetch order'
            })
        }
        return res.status(200).json({
            success: true,
            message: "orders fetched successfully",
            data: result
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to insert order" });
    }
}

export const getOrderHistory: Handler = async (req, res) => {
    const { walletAddress } = req.query
    try {
        const result = await prisma.orders.findMany({
            where: {
                walletId: {
                    not: walletAddress?.toString().toLowerCase()
                },
            },
        });

        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'Failed to fetch order'
            })
        }
        return res.status(200).json({
            success: true,
            message: "orders fetched successfully",
            data: result
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to insert order" });
    }
}

export const getOrderByOrderHash: Handler = async (req, res) => {
    const { orderHash } = req.params
    const url = `${config.oneInch.baseUrl}/orderbook/v4.0/1/order/${orderHash}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${config.oneInch.apiKey}`,
            },
        });
        const data = response.data;
        return res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch order details" });
    }
}