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

  const makingAmount = ethers.parseUnits(intent.price_target, assetFrom.decimals);

  let targetPrice;

  if (intent.trigger === "price_based") {
    targetPrice = parseFloat(intent.amount);
  } else {
    const fromPrice = parseFloat(assetFrom.price);
    const percentage = parseFloat(intent.trigger_value) / 100;
    const direction = intent.trigger_direction || "down";

    if (direction === "up") {
      targetPrice = fromPrice * (1 + percentage);
    } else {
      targetPrice = fromPrice * (1 - percentage);
    }
  }
  const targetValue = intent.price_target;
  const currentValue = assetTo.price * intent.amount

  // const total = parseFloat(intent.amount) * targetPrice; // incorrect
  const takingAmount = ethers.parseUnits(
    targetPrice.toFixed(assetTo.decimals),
    assetTo.decimals
  );

  const orderInfo = {
    makerAsset: assetFrom.address,
    takerAsset: assetTo.address,
    makingAmount,
    takingAmount,
    maker: userAddress,
    receiver: userAddress,
  };

  const feeInfo = await getGasfee(orderInfo);
  const tradeRes = await getTradeSummary(orderInfo, feeInfo, tokenDetails)
  const result = {
    ...tradeRes,
    targetValue,
    currentValue
  }

  return {
    orderInfo, 
    tradeInfo: result,
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
