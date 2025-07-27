import { Handler } from 'express';
import crypto from 'crypto';
import { LimitOrder, MakerTraits, Address, Api, FetchProviderConnector, Sdk } from '@1inch/limit-order-sdk';
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
            "signature": "0x0cad028018580ecbfa04cd352020f7130cabd133941bcdd1e3be9daa1412dd65392b65fd4300dcf44addaeff7b9c4bd09cd67f0c46b737c0aba4cf311cb4068b1c",
            "data": {
                "makerAsset": "0xdac17f958d2ee523a2206206994597c13d831ec7",
                "takerAsset": "0x111111111117dc0aa78b770fa6a738034120c302",
                "maker": "0xc0182dcce8773d26acaddc0c09861d3ee11abf6b",
                "receiver": "0x0000000000000000000000000000000000000000",
                "makingAmount": "100000000",
                "takingAmount": "10000000000000000000",
                "salt": "17649669",
                "extension": "17649669",
                "makerTraits": "904625697166532776746648320380374280103673874893732578335248959948990709760"
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
            walletAddress: walletAddress as string,
            lastLogin: new Date().toISOString() as string,
        }
        const result = await prisma.users.upsert({
            where: { walletAddress: walletAddress },
            create: user,
            update: user,
        });
        return res.status(200).json("user logged in")
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
    try {
        const orderDetails = {
            walletId: req.body.walletAddress as string,
            orderHash: req.body.walletAddress as string,
            tokenPair: req.body.walletAddress as string,
            amount: req.body.walletAddress as string,
            feePercent: req.body.walletAddress as string,
            youReceive: req.body.walletAddress as string,
            status: 'open',
            createdOn: new Date().toISOString()
        }
        const result = await prisma.orders.create({
            data: orderDetails
        });
        if(!result) {
            return res.status(400).json({error: 'Failed to insert order'})
        }
        return res.status(200).json("order inserted in db")
    } catch (error) {
        res.status(500).json({ error: "Failed to insert order" });
    }
}