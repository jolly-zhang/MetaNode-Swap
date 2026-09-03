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
