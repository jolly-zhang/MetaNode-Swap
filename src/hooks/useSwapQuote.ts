"use client";

import { useEffect, useMemo, useState } from "react";
import { useSimulateContract } from "wagmi";
import { type Address, zeroAddress } from "viem";
import { SWAP_ROUTER_ABI } from "../contracts/swapRouterAbi";
import { SwapRouterAddress } from "../utils/env";

export type QuoteMode = "exactIn" | "exactOut";

type UseSwapQuoteArgs = {
  tokenIn?: Address;
  tokenOut?: Address;
  indexPath?: readonly number[];
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

const useSwapQuote = ({
  tokenIn,
  tokenOut,
  indexPath,
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
    Boolean(indexPath?.length);

  const exactInEnabled =
    canQuote && mode === "exactIn" && Boolean(debouncedAmountIn && debouncedAmountIn > BigInt(0));

  const exactOutEnabled =
    canQuote &&
    mode === "exactOut" &&
    Boolean(debouncedAmountOut && debouncedAmountOut > BigInt(0));

  const quoteExactInput = useSimulateContract({
    address: SwapRouterAddress,
    abi: SWAP_ROUTER_ABI,
    functionName: "quoteExactInput",
    args:
      tokenIn && tokenOut && indexPath && debouncedAmountIn
        ? [
            {
              tokenIn,
              tokenOut,
              indexPath: [...indexPath],
              amountIn: debouncedAmountIn,
              sqrtPriceLimitX96: BigInt(0),
            },
          ]
        : undefined,
    query: { enabled: exactInEnabled },
  });

  const quoteExactOutput = useSimulateContract({
    address: SwapRouterAddress,
    abi: SWAP_ROUTER_ABI,
    functionName: "quoteExactOutput",
    args:
      tokenIn && tokenOut && indexPath && debouncedAmountOut
        ? [
            {
              tokenIn,
              tokenOut,
              indexPath: [...indexPath],
              amount: debouncedAmountOut,
              sqrtPriceLimitX96: BigInt(0),
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
