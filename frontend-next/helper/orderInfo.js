import { ethers } from 'ethers';
import { getGasfee } from './apiHelper'

async function getOrderInfoFromIntent(intent, tokenDetails, userAddress) {
  const assetFrom = tokenDetails.find(
    (token) => token.symbol.toLowerCase() === intent.asset_from.toLowerCase()
  );

  const assetTo = tokenDetails.find(
    (token) => token.symbol.toLowerCase() === intent.asset_to.toLowerCase()
  );

  if (!assetFrom || !assetTo) {
    throw new Error("Token details not found for assets in intent.");
  }

  const amount = intent.amount
  let makingAmount = (amount * assetTo.price).toFixed(assetFrom.decimals).toString(); 
  makingAmount = ethers.parseUnits(makingAmount, assetFrom.decimals);

  const takingAmount = ethers.parseUnits(amount, assetTo.decimals);

  const orderInfo = {
    makerAsset: assetFrom.address,
    takerAsset: assetTo.address,
    makingAmount,
    takingAmount,
    maker: userAddress,
    receiver: userAddress,
  };

  const feeInfo = await getGasfee(orderInfo);
  const tradeInfo = await getTradeSummary(orderInfo, feeInfo, tokenDetails)

  return {
    orderInfo, 
    tradeInfo,
  };
}

async function getTradeSummary(orderInfo, feeData, tokenDetails) {
  const {
    makerAsset,
    takerAsset,
    makingAmount,
    takingAmount,
    maker
  } = orderInfo;

  const whitelist = feeData.whitelist || {};
  const discountPercent = feeData.whitelistDiscountPercent || 0;
  const baseFeeBps = feeData.feeBps;

  const makerAddr = maker?.toLowerCase?.() || maker;
  const isWhitelisted = Object.keys(whitelist).some(addr => addr.toLowerCase() === makerAddr);
  const actualFeeBps = isWhitelisted
    ? Math.floor(baseFeeBps * (1 - discountPercent / 100))
    : baseFeeBps;

  const makerToken = tokenDetails.find(t => t.address.toLowerCase() === makerAsset.toLowerCase());
  const takerToken = tokenDetails.find(t => t.address.toLowerCase() === takerAsset.toLowerCase());

  if (!makerToken || !takerToken) {
    return { error: 'Token metadata missing' };
  }

  const takerDecimals = Number(takerToken.decimals);
  const makerDecimals = Number(makerToken.decimals);

  const takerAmountReadable = parseFloat(takingAmount) / 10 ** takerDecimals;
  const makerAmountReadable = parseFloat(makingAmount) / 10 ** makerDecimals;

  return {
    tokenPair: `${takerToken.symbol}/${makerToken.symbol}`,
    amount: `${makerAmountReadable} ${makerToken.symbol}`,
    feePercent: `${actualFeeBps / 100}%`,
    youReceive: `${takerAmountReadable.toFixed(6)} ${takerToken.symbol}`
  };
}

module.exports = { getOrderInfoFromIntent };
