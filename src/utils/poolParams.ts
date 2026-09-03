import { encodeSqrtRatioX96, nearestUsableTick, TickMath } from "@uniswap/v3-sdk";
import { type Address, getAddress, parseUnits } from "viem";

export const FEE_OPTIONS = [
  { value: 500, label: "0.05%" },
  { value: 3000, label: "0.3%" },
  { value: 10000, label: "1%" },
] as const;

const FEE_TICK_SPACING: Record<number, number> = {
  500: 10,
  3000: 60,
  10000: 200,
};

export const priceToSqrtRatio = (price: string) => {
  const trimmed = price.trim();
  if (!trimmed || Number(trimmed) <= 0) {
    throw new Error("价格必须大于 0");
  }
  const amount1 = parseUnits(trimmed, 18);
  const amount0 = parseUnits("1", 18);
  return encodeSqrtRatioX96(amount1.toString(), amount0.toString());
};

export const priceToSqrtPriceX96 = (price: string) => {
  return BigInt(priceToSqrtRatio(price).toString());
};

export const priceToUsableTick = (price: string, fee: number) => {
  const spacing = FEE_TICK_SPACING[fee] ?? 60;
  const tick = TickMath.getTickAtSqrtRatio(priceToSqrtRatio(price));
  return nearestUsableTick(tick, spacing);
};

const invertPrice = (price: string) => {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("价格必须大于 0");
  }
  return String(1 / value);
};

export const buildCreatePoolParams = ({
  token0,
  token1,
  fee,
  priceLower,
  priceUpper,
  initPrice,
}: {
  token0: string;
  token1: string;
  fee: number;
  priceLower: string;
  priceUpper: string;
  initPrice: string;
}) => {
  const address0 = getAddress(token0.trim()) as Address;
  const address1 = getAddress(token1.trim()) as Address;
  if (address0.toLowerCase() === address1.toLowerCase()) {
    throw new Error("两个代币地址不能相同");
  }

  let sorted0 = address0;
  let sorted1 = address1;
  let lower = priceLower;
  let upper = priceUpper;
  let init = initPrice;

  if (address0.toLowerCase() > address1.toLowerCase()) {
    sorted0 = address1;
    sorted1 = address0;
    lower = invertPrice(priceUpper);
    upper = invertPrice(priceLower);
    init = invertPrice(initPrice);
  }

  const sqrtPriceX96 = priceToSqrtPriceX96(init);
  const tickLower = priceToUsableTick(lower, fee);
  const tickUpper = priceToUsableTick(upper, fee);

  if (tickLower >= tickUpper) {
    throw new Error("价格上限必须大于价格下限");
  }

  return {
    token0: sorted0,
    token1: sorted1,
    fee,
    tickLower,
    tickUpper,
    sqrtPriceX96,
  };
};
