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
} from './services';

router.post('/login', userLogin);
router.get('/chains', getAllChains);
router.get('/tokens', getAllTokens);
router.get('/prices', getTokenPrices);
router.get('/gasFee', getGasFee);
router.get('/limit-orders-by-address', getAllLimitOrdersByAddress);
router.post('/order', createOrder);
router.post('/insert-order', insertOrder);

export default router;