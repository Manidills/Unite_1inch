export const config = {
    api: {
        baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    },
    oneInch: {
        apiKey: process.env.NEXT_PUBLIC_HACKER_KEY,
        baseUrl: process.env.NEXT_PUBLIC_ONE_INCH_BASE_URL,
        allowanceTarget: '0x111111125421ca6dc452d289314280a0f8842a65'
    },
    wallet: {
        privateKey: process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY,
        address: process.env.NEXT_PUBLIC_WALLET_ADDRESS,
    },
    rpc: {
        url: process.env.NEXT_PUBLIC_RPC_URL,
    },
    chainId: 1
};