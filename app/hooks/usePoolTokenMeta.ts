"use client";

import { useReadContracts } from "wagmi";
import { erc20Abi, isAddress, type Address } from "viem";

type UsePoolTokenMetaArgs = {
  pool: string;
  token0: string;
  token1: string;
};

export default function usePoolTokenMeta({
  pool,
  token0,
  token1,
}: UsePoolTokenMetaArgs) {
  const holder = pool as Address;
  const token0Address = token0 as Address;
  const token1Address = token1 as Address;
  const enabled = isAddress(pool) && isAddress(token0) && isAddress(token1);

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: token0Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [holder],
      },
      { address: token0Address, abi: erc20Abi, functionName: "symbol" },
      { address: token0Address, abi: erc20Abi, functionName: "decimals" },
      {
        address: token1Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [holder],
      },
      { address: token1Address, abi: erc20Abi, functionName: "symbol" },
      { address: token1Address, abi: erc20Abi, functionName: "decimals" },
    ],
    query: { enabled },
  });

  return {
    isLoading,
    balance0: data?.[0].result,
    symbol0: data?.[1].result,
    decimals0: data?.[2].result,
    balance1: data?.[3].result,
    symbol1: data?.[4].result,
    decimals1: data?.[5].result,
  };
}
