import { TickMath } from "@uniswap/v3-sdk";

export const formatPrice = (price: number) => {
  if (!Number.isFinite(price) || price <= 0) return "0";
  if (price < 0.000001) return price.toFixed(10);
  if (price < 0.001) return price.toFixed(8);
  if (price < 1) return price.toFixed(6);
  if (price < 1000) return price.toFixed(4);
  return price.toFixed(2);
};

export const sqrtPriceX96ToPrice = (
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
) => {
  if (sqrtPriceX96 === BigInt(0)) return "0";

  const Q192 = BigInt(1) << BigInt(192);
  const precision = BigInt(18);
  const decimalAdjust = BigInt(decimals0 - decimals1);
  let numerator = sqrtPriceX96 * sqrtPriceX96 * BigInt(10) ** precision;
  let denominator = Q192;

  if (decimalAdjust >= BigInt(0)) {
    numerator *= BigInt(10) ** decimalAdjust;
  } else {
    denominator *= BigInt(10) ** -decimalAdjust;
  }

  const scaled = numerator / denominator;
  return formatPrice(Number(scaled) / 1e18);
};

export const tickToPrice = (
  tick: number,
  decimals0: number,
  decimals1: number,
) => {
  const sqrtPriceX96 = BigInt(TickMath.getSqrtRatioAtTick(tick).toString());
  return sqrtPriceX96ToPrice(sqrtPriceX96, decimals0, decimals1);
};

export const getPositionTokenAmounts = (
  liquidity: string | bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number,
) => {
  if (tickLower >= tickUpper) {
    return { amount0: BigInt(0), amount1: BigInt(0) };
  }

  const liq = BigInt(liquidity.toString());
  if (liq <= BigInt(0)) {
    return { amount0: BigInt(0), amount1: BigInt(0) };
  }

  const sqrtRatioA = BigInt(TickMath.getSqrtRatioAtTick(tickLower).toString());
  const sqrtRatioB = BigInt(TickMath.getSqrtRatioAtTick(tickUpper).toString());
  const sqrtRatio = BigInt(TickMath.getSqrtRatioAtTick(currentTick).toString());

  if (currentTick < tickLower) {
    return { amount0: getAmount0Delta(sqrtRatioA, sqrtRatioB, liq), amount1: BigInt(0) };
  }
  if (currentTick < tickUpper) {
    return {
      amount0: getAmount0Delta(sqrtRatio, sqrtRatioB, liq),
      amount1: getAmount1Delta(sqrtRatioA, sqrtRatio, liq),
    };
  }
  return { amount0: BigInt(0), amount1: getAmount1Delta(sqrtRatioA, sqrtRatioB, liq) };
};

const getAmount0Delta = (sqrtA: bigint, sqrtB: bigint, liquidity: bigint) => {
  const [lower, upper] = sqrtA > sqrtB ? [sqrtB, sqrtA] : [sqrtA, sqrtB];
  if (lower === BigInt(0)) return BigInt(0);
  const numerator1 = liquidity << BigInt(96);
  const numerator2 = upper - lower;
  return (numerator1 * numerator2) / upper / lower;
};

const getAmount1Delta = (sqrtA: bigint, sqrtB: bigint, liquidity: bigint) => {
  const [lower, upper] = sqrtA > sqrtB ? [sqrtB, sqrtA] : [sqrtA, sqrtB];
  return (liquidity * (upper - lower)) / (BigInt(1) << BigInt(96));
};
