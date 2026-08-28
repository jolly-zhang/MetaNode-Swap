"use client";

import { formatUnits } from "viem";
import usePoolTokenMeta from "@/app/hooks/usePoolTokenMeta";

type PoolTokenPairProps = {
  pool: string;
  token0: string;
  token1: string;
};

const formatToken = (
  balance: bigint | undefined,
  symbol: string | undefined,
  decimals: number | undefined,
) => {
  if (balance == null || !symbol || decimals == null) return "...";
  return `${symbol}(${parseFloat(formatUnits(balance, decimals)).toFixed(2)})`;
};

export default function PoolTokenBalance({
  pool,
  token0,
  token1,
}: PoolTokenPairProps) {
  const { balance0, symbol0, decimals0, balance1, symbol1, decimals1 } =
    usePoolTokenMeta({ pool, token0, token1 });

  return (
    <div>
      {formatToken(balance0, symbol0, decimals0)} /{" "}
      {formatToken(balance1, symbol1, decimals1)}
    </div>
  );
}

export function TokenPairSymbols({
  token0,
  token1,
}: {
  token0: string;
  token1: string;
}) {
  const { symbol0, symbol1, isLoading } = usePoolTokenMeta({
    pool: token0,
    token0,
    token1,
  });

  if (isLoading || !symbol0 || !symbol1) return <span>...</span>;
  return (
    <span>
      {symbol0} / {symbol1}
    </span>
  );
}
