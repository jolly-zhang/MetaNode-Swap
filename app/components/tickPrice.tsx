"use client";

import { TickMath } from "@uniswap/v3-sdk";
import usePoolTokenMeta from "@/app/hooks/usePoolTokenMeta";
import { sqrtPriceX96ToPrice, tickToPrice } from "@/app/utils/sqrtPrice";

type TickPriceProps = {
  pool: string;
  token0: string;
  token1: string;
  tick: number;
  sqrtPriceX96?: bigint;
};

type TickPriceRangeProps = {
  pool: string;
  token0: string;
  token1: string;
  tickLower: number;
  tickUpper: number;
};

export function TickPrice({
  pool,
  token0,
  token1,
  tick,
  sqrtPriceX96,
}: TickPriceProps) {
  const { decimals0, decimals1, isLoading } = usePoolTokenMeta({
    pool,
    token0,
    token1,
  });

  if (isLoading || decimals0 == null || decimals1 == null) {
    return <span>...</span>;
  }

  const priceX96 =
    sqrtPriceX96 && sqrtPriceX96 > BigInt(0)
      ? sqrtPriceX96
      : BigInt(TickMath.getSqrtRatioAtTick(tick).toString());

  return <span>{sqrtPriceX96ToPrice(priceX96, decimals0, decimals1)}</span>;
}

export function TickPriceRange({
  pool,
  token0,
  token1,
  tickLower,
  tickUpper,
}: TickPriceRangeProps) {
  const { decimals0, decimals1, isLoading } = usePoolTokenMeta({
    pool,
    token0,
    token1,
  });

  if (isLoading || decimals0 == null || decimals1 == null) {
    return <span>...</span>;
  }

  return (
    <span>
      {tickToPrice(tickLower, decimals0, decimals1)} -{" "}
      {tickToPrice(tickUpper, decimals0, decimals1)}
    </span>
  );
}
