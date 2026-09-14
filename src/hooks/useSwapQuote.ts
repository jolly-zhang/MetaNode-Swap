"use client";

import { useEffect, useMemo, useState } from "react";
import { useSimulateContract } from "wagmi";
import { TickMath } from "@uniswap/v3-sdk";
import { type Address, zeroAddress } from "viem";
import { quoterAbi } from "@/contracts/swapRouterAbi";
import { SwapRouterAddress } from "@/utils/env";

export type QuoteMode = "exactIn" | "exactOut";
//池子数据结构
export type PoolLike = {
  token0: string;
  token1: string;
  index: number | bigint;
  fee?: number | bigint;
  tick?: number;
  liquidity?: bigint | string;
  tickLower?: number;
  tickUpper?: number;
};
//兑换路径信息
type SwapRoute = {
  indexPath: number[];//兑换路径（tick 数组）
  sqrtPriceLimitX96: bigint;//价格限制
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
//泛型，支持任意类型
const useDebouncedValue = <T,>(value: T, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    //400ms秒后，输入值的副本被赋值给 debounced
    const timer = window.setTimeout(() => setDebounced(value), delay);
    //清除定时器
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
// 控制兑换范围，极限版本
const computeSqrtPriceLimitX96 = (_pools: readonly PoolLike[], zeroForOne: boolean) => {
  if (zeroForOne) {
    return BigInt(TickMath.MIN_SQRT_RATIO.toString()) + BigInt(1);
  }
  return BigInt(TickMath.MAX_SQRT_RATIO.toString()) - BigInt(1);
};

//控制兑换范围,基于基于池子 tick 范围
// const computeSqrtPriceLimitX96ByTickRange = (pools: readonly PoolLike[], zeroForOne: boolean) => {
//   if (pools.length === 0) return undefined;
//   const pool = pools[0] as PoolLike;
//   // 1、校验 tick 数据
//   if (pool.tickLower === undefined || pool.tickUpper === undefined) {
//     // 2、回退到极限值
//     if (zeroForOne) {
//       return BigInt(TickMath.MIN_SQRT_RATIO.toString()) + BigInt(1);
//     }
//     return BigInt(TickMath.MAX_SQRT_RATIO.toString()) - BigInt(1);
//   }
//   // 3、根据方向计算
//   if (zeroForOne) {
//     // 价格下降 → 限制在 tickLower
//     return TickMath.getSqrtRatioAtTick(pool.tickLower);
//   }
//   // 4、价格上升 → 限制在 tickUpper
//   return TickMath.getSqrtRatioAtTick(pool.tickUpper);
// };


export const getSwapRoute = (
  pools: readonly PoolLike[],
  tokenIn?: string,
  tokenOut?: string,
): SwapRoute | undefined => {
  //如果买入卖出代币为空，返回undefined
  if (!tokenIn || !tokenOut) return undefined;
  const inAddr = tokenIn.toLowerCase();
  const outAddr = tokenOut.toLowerCase();
  if (inAddr === outAddr) return undefined;
  //token0/token1 顺序
  const token0 = inAddr < outAddr ? inAddr : outAddr;
  const token1 = inAddr < outAddr ? outAddr : inAddr;
  //买入卖出代币顺序
  const zeroForOne = inAddr < outAddr;
  //过滤出有流动性的池子，并且池子的token0/token1 顺序与买入卖出代币顺序一致
  const matches = pools.filter((pool) => {
    //流动性大于0
    const hasLiquidity = BigInt(pool.liquidity?.toString() ?? "0") > BigInt(0);
    return (
      hasLiquidity && pool.token0.toLowerCase() === token0 && pool.token1.toLowerCase() === token1
    );
  });
  if (matches.length === 0) return undefined;

  const sorted = [...matches].sort((a, b) => {
    const liqA = BigInt(a.liquidity?.toString() ?? "0");
    const liqB = BigInt(b.liquidity?.toString() ?? "0");
    // 1、按流动性降序（大的在前）
    if (liqA !== liqB) return liqB > liqA ? 1 : -1;
    //2、tick升序
    const tickA = a.tick ?? 0;
    const tickB = b.tick ?? 0;
    if (tickA !== tickB) {
      return zeroForOne ? tickB - tickA : tickA - tickB;
    }
    //3、流动性相同，按费率升序（小的在前）
    return Number(a.fee ?? 0) - Number(b.fee ?? 0);
  });

  const bestPools = sorted[0];//返回第一个数组对象，而不是对象
  console.log('bestPools====', bestPools);
  return {
    // indexPath: bestPools.map((pool) => Number(pool.index)),
    // sqrtPriceLimitX96: computeSqrtPriceLimitX96(bestPools, zeroForOne),
    indexPath: [Number(bestPools.index)],//一个池组的索引，单跳就一个池子，多跳就多个池子
    sqrtPriceLimitX96: computeSqrtPriceLimitX96([bestPools], zeroForOne),
  };
};

//模拟执行合约的写操作
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
