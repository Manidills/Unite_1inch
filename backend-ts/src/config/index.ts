import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 5001,
    oneInch: {
        apiKey: process.env.HACKER_KEY,
        baseUrl: process.env.ONE_INCH_BASE_URL,
        allowanceTarget: '0x111111125421ca6dc452d289314280a0f8842a65'
    },
    wallet: {
        privateKey: process.env.WALLET_PRIVATE_KEY,
        address: process.env.WALLET_ADDRESS,
    },
    rpc: {
        url: process.env.RPC_URL,
    }
};