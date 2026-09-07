"use client";

import { useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { POOL_MANAGER_ABI } from "../contracts/poolAbi";
import { POSITION_MANAGER_ABI } from "../contracts/positionAbi";
import { SwapContractAddress,PositionManagerAddress } from "../utils/env";
//获取pool列表
export const usePoolContract = () => {
  const { data, error, isError, isLoading, refetch } = useReadContract({
    address: SwapContractAddress,
    abi: POOL_MANAGER_ABI,
    functionName: "getAllPools",
    query: {
      enabled: SwapContractAddress !== zeroAddress,
    },
  });

  const poolData = data?? [];

  return {
    poolData:data ?? [],
    error,
    isError,
    isLoading,
    isEmpty: !isLoading && !isError && poolData.length === 0,
    refetch,
  };
};
export const usePositionContract = () => {
  const { data, error, isError, isLoading, refetch } = useReadContract({
    address: PositionManagerAddress,
    abi: POSITION_MANAGER_ABI,
    functionName: "getAllPositions",
    query: {
      enabled: PositionManagerAddress !== zeroAddress,
    },
  });
  const positionData = data ?? [];
  return {
    positionData,
    error,
    isError,
    isLoading,
    isEmpty: !isLoading && !isError && positionData.length === 0,
    refetch,
  };
};

