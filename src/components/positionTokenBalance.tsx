"use client";

import { formatUnits } from "viem";
import { usePoolContract } from "@/hooks/usePoolContract";
import usePoolTokenMeta from "@/hooks/usePoolTokenMeta";
import { getPositionTokenAmounts } from "@/utils/sqrtPrice";
//格式化代币数量显示，显示两个小数位
const formatToken = (
  amount: bigint | undefined,
  symbol: string | undefined,
  decimals: number | undefined,
) => {
  if (amount == null || !symbol || decimals == null) return "...";
  return `${symbol}(${parseFloat(formatUnits(amount, decimals)).toFixed(2)})`;
};

export default function PositionTokenBalance({
  token0,
  token1,
  tickLower,
  tickUpper,
  index,
  liquidity,
  fee,
}: {
  token0: string;
  token1: string;
  tickLower: number;
  tickUpper: number;
  index: number;
  liquidity: string;
  fee: number;
}) {
  // 1. 查找对应的池子数据
  const { poolData } = usePoolContract();
  const pool = poolData.find(
    (item) =>
      item.token0.toLowerCase() === token0.toLowerCase() &&
      item.token1.toLowerCase() === token1.toLowerCase() &&
      Number(item.index) === Number(index) &&
      Number(item.fee) === Number(fee),
  );
// 2. 获取代币元数据（符号、精度）
  const holder = pool?.pool ?? token0;
  const { symbol0, decimals0, symbol1, decimals1, isLoading } = usePoolTokenMeta({
    pool: holder,
    token0,
    token1,
  });

  if (isLoading || decimals0 == null || decimals1 == null) {
    return <div>...</div>;
  }
 // 3. 计算当前 tick
  const currentTick = Number(pool?.tick);
  // 4. 计算头寸中的代币数量
  const { amount0, amount1 } = getPositionTokenAmounts(
    liquidity,
    tickLower,
    tickUpper,
    currentTick,
  );
  return (
    <div>
      {formatToken(amount0, symbol0, decimals0)} /
      {formatToken(amount1, symbol1, decimals1)}
    </div>
  );
}
// 5. 计算头寸状态
export function PositionStatus({
  token0,
  token1,
  tickLower,
  tickUpper,
  index,
  fee,
}: {
  token0: string;
  token1: string;
  tickLower: number;
  tickUpper: number;
  index: number;
  fee: number;
}) {
  const { poolData } = usePoolContract();
  const pool = poolData.find(
    (item) =>
      item.token0.toLowerCase() === token0.toLowerCase() &&
      item.token1.toLowerCase() === token1.toLowerCase() &&
      Number(item.index) === Number(index) &&
      Number(item.fee) === Number(fee),
  );

  if (pool == null) return <span>...</span>;

  const currentTick = Number(pool.tick);
  if (currentTick < tickLower) return <span>低于区间</span>;
  if (currentTick >= tickUpper) return <span>高于区间</span>;
  return <span>活跃</span>;
}

export function PositionTokensOwed({
  token0,
  token1,
  tokensOwed0,
  tokensOwed1,
}: {
  token0: string;
  token1: string;
  tokensOwed0: string;
  tokensOwed1: string;
}) {
  const { symbol0, decimals0, symbol1, decimals1, isLoading } = usePoolTokenMeta({
    pool: token0,
    token0,
    token1,
  });

  if (isLoading || decimals0 == null || decimals1 == null) {
    return <span>...</span>;
  }

  return (
    <span>
      {formatToken(BigInt(tokensOwed0 || "0"), symbol0, decimals0)} /
      {formatToken(BigInt(tokensOwed1 || "0"), symbol1, decimals1)}
    </span>
  );
}
