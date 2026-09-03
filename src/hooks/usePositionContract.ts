"use client";

import {useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { POSITION_MANAGER_ABI } from "../contracts/positionAbi";
import { PositionManagerAddress } from "../utils/env";

type UsePositionContractArgs = {
  enabled?: boolean;
};

const usePositionContract = ({ enabled = true }: UsePositionContractArgs = {}) => {

  const { data, error, isError, isLoading } = useReadContract({
    address: PositionManagerAddress,
    abi: POSITION_MANAGER_ABI,
    functionName: "getPositionInfo",
    query: {
      enabled: enabled && PositionManagerAddress !== zeroAddress,
    },
  });

  const myPositionData = data ?? [];
  // const positionData = address
  //   ? allPositions.filter(
  //       (position) => position.owner.toLowerCase() === address.toLowerCase(),
  //     )
  //   : [];

  return {
    // positionData,
    myPositionData,
    error,
    isError,
    isLoading,
    isEmpty: !isLoading && !isError ,
  };
};

export default usePositionContract;
