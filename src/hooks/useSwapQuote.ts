"use client";

import { useEffect, useMemo, useState } from "react";
import { useSimulateContract } from "wagmi";
import { TickMath } from "@uniswap/v3-sdk";
import { type Address, zeroAddress } from "viem";
import { quoterAbi } from "@/contracts/swapRouterAbi";
import { SwapRouterAddress } from "@/utils/env";

export type QuoteMode = "exactIn" | "exactOut";

export type PoolLike = {
  token0: string;
  token1: string;
  index: number | bigint;
  fee?: number | bigint;
  tick?: number;
  liquidity?: bigint | string;
};

type SwapRoute = {
  indexPath: number[];
  sqrtPriceLimitX96: bigint;
};

type UseSwapQuoteArgs = {
  tokenIn?: Address;
  tokenOut?: Address;
  indexPath?: readonly number[];
  sqrtPriceLimitX96?: bigint;
  amountIn?: bigint;
  amountOut?: bigint;
  mode: QuoteMode;
  enabled?: boolean;
};

const useDebouncedValue = <T,>(value: T, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

const computeSqrtPriceLimitX96 = (_pools: readonly PoolLike[], zeroForOne: boolean) => {
  if (zeroForOne) {
    return BigInt(TickMath.MIN_SQRT_RATIO.toString()) + BigInt(1);
  }
  return BigInt(TickMath.MAX_SQRT_RATIO.toString()) - BigInt(1);
};

export const getSwapRoute = (
  pools: readonly PoolLike[],
  tokenIn?: string,
  tokenOut?: string,
): SwapRoute | undefined => {
  if (!tokenIn || !tokenOut) return undefined;
  const inAddr = tokenIn.toLowerCase();
  const outAddr = tokenOut.toLowerCase();
  if (inAddr === outAddr) return undefined;

  const token0 = inAddr < outAddr ? inAddr : outAddr;
  const token1 = inAddr < outAddr ? outAddr : inAddr;
  const zeroForOne = inAddr < outAddr;

  const matches = pools.filter((pool) => {
    const hasLiquidity = BigInt(pool.liquidity?.toString() ?? "0") > BigInt(0);
    return (
      hasLiquidity &&
      pool.token0.toLowerCase() === token0 &&
      pool.token1.toLowerCase() === token1
    );
  });
  if (matches.length === 0) return undefined;

  const sorted = [...matches].sort((a, b) => {
    const liqA = BigInt(a.liquidity?.toString() ?? "0");
    const liqB = BigInt(b.liquidity?.toString() ?? "0");
    if (liqA !== liqB) return liqB > liqA ? 1 : -1;
    const tickA = a.tick ?? 0;
    const tickB = b.tick ?? 0;
    if (tickA !== tickB) {
      return zeroForOne ? tickB - tickA : tickA - tickB;
    }
    return Number(a.fee ?? 0) - Number(b.fee ?? 0);
  });

  const bestPools = sorted.slice(0, 1);

  return {
    indexPath: bestPools.map((pool) => Number(pool.index)),
    sqrtPriceLimitX96: computeSqrtPriceLimitX96(bestPools, zeroForOne),
  };
};

const useSwapQuote = ({
  tokenIn,
  tokenOut,
  indexPath,
  sqrtPriceLimitX96,
  amountIn,
  amountOut,
  mode,
  enabled = true,
}: UseSwapQuoteArgs) => {
  const debouncedAmountIn = useDebouncedValue(amountIn);
  const debouncedAmountOut = useDebouncedValue(amountOut);

  const canQuote =
    enabled &&
    SwapRouterAddress !== zeroAddress &&
    Boolean(tokenIn) &&
    Boolean(tokenOut) &&
    tokenIn !== tokenOut &&
    Boolean(indexPath?.length) &&
    Boolean(sqrtPriceLimitX96 && sqrtPriceLimitX96 > BigInt(0));

  const exactInEnabled =
    canQuote &&
    mode === "exactIn" &&
    Boolean(debouncedAmountIn && debouncedAmountIn > BigInt(0));

  const exactOutEnabled =
    canQuote &&
    mode === "exactOut" &&
    Boolean(debouncedAmountOut && debouncedAmountOut > BigInt(0));

  const quoteExactInput = useSimulateContract({
    address: SwapRouterAddress,
    abi: quoterAbi,
    functionName: "quoteExactInput",
    args:
      tokenIn && tokenOut && indexPath && sqrtPriceLimitX96 && debouncedAmountIn
        ? [
            {
              tokenIn,
              tokenOut,
              indexPath: [...indexPath],
              amountIn: debouncedAmountIn,
              sqrtPriceLimitX96,
            },
          ]
        : undefined,
    query: { enabled: exactInEnabled },
  });

  const quoteExactOutput = useSimulateContract({
    address: SwapRouterAddress,
    abi: quoterAbi,
    functionName: "quoteExactOutput",
    args:
      tokenIn && tokenOut && indexPath && sqrtPriceLimitX96 && debouncedAmountOut
        ? [
            {
              tokenIn,
              tokenOut,
              indexPath: [...indexPath],
              amount: debouncedAmountOut,
              sqrtPriceLimitX96,
            },
          ]
        : undefined,
    query: { enabled: exactOutEnabled },
  });

  const quotedAmountOut = useMemo(() => {
    if (mode !== "exactIn") return undefined;
    return quoteExactInput.data?.result;
  }, [mode, quoteExactInput.data?.result]);

  const quotedAmountIn = useMemo(() => {
    if (mode !== "exactOut") return undefined;
    return quoteExactOutput.data?.result;
  }, [mode, quoteExactOutput.data?.result]);

  return {
    quotedAmountIn,
    quotedAmountOut,
    isQuoting:
      (exactInEnabled && quoteExactInput.isFetching) ||
      (exactOutEnabled && quoteExactOutput.isFetching),
    quoteError:
      mode === "exactIn" ? quoteExactInput.error : quoteExactOutput.error,
  };
};

export default useSwapQuote;
