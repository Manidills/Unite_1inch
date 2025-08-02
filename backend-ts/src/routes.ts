import express from 'express';
const router = express.Router();
import { 
    getAllChains,
    getAllLimitOrdersByAddress,
    userLogin,
    getAllTokens,
    getTokenPrices,
    createOrder,
    getGasFee,
    insertOrder,
    getAllOrders,
    getOrderHistory,
    getOrderByOrderHash,
    getPortfolioTokens,
} from './services';

router.post('/login', userLogin);
router.get('/chains', getAllChains);
router.get('/tokens', getAllTokens);
router.get('/prices', getTokenPrices);
router.get('/gasFee', getGasFee);
router.get('/limit-orders-by-address', getAllLimitOrdersByAddress);
router.get('/order-by-hash/:orderHash', getOrderByOrderHash);
router.post('/order', createOrder);
router.post('/insert-order', insertOrder);
router.get('/order-by-address', getAllOrders)
router.get('/order-history', getOrderHistory)
router.get('/portfolio/tokens', getPortfolioTokens)

export default router;