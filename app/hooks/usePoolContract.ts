"use client";

import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { zeroAddress } from "viem";
import { POOL_MANAGER_ABI } from "../contracts/poolAbi";
import { SwapContractAddress } from "../utils/env";

const usePoolContract = () => {
  const { data, error, isError, isLoading } = useReadContract({
    address: SwapContractAddress,
    abi: POOL_MANAGER_ABI,
    functionName: "getAllPools",
    // chainId: sepolia.id,
    query: {
      enabled: SwapContractAddress !== zeroAddress,
    },
  });

  const poolData = data ?? [];

  return {
    poolData,
    error,
    isError,
    isLoading,
    isEmpty: !isLoading && !isError && poolData.length === 0,
  };
};

export default usePoolContract;
