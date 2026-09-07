"use client";

import { useEffect, useState } from "react";
import {
  useConnectorClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { type Hash, zeroAddress } from "viem";
import { Button } from "@/components/ui/button";
import { POSITION_MANAGER_ABI } from "@/contracts/positionAbi";
import { PositionManagerAddress } from "@/utils/env";
import { usePoolContract, usePositionContract } from "@/hooks/usePoolContract";

const TX_GAS_LIMIT = BigInt(3_000_000);

export default function PositionActions({ positionId }: { positionId: number }) {
  const { data: connectorClient } = useConnectorClient();
  const address = connectorClient?.account.address;
  const { writeContractAsync, isPending, reset } = useWriteContract();
  const { refetch: refetchPositions } = usePositionContract();
  const { refetch: refetchPools } = usePoolContract();

  const [hash, setHash] = useState<Hash>();
  const [action, setAction] = useState<"burn" | "collect" | null>(null);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  useEffect(() => {
    if (!isSuccess || !action) return;
    const done = action;
    void refetchPositions();
    void refetchPools();
    setHash(undefined);
    setAction(null);
    reset();
    alert(done === "burn" ? "已移除流动性，请再点 Collect 取回代币" : "已提取代币");
  }, [isSuccess, action, refetchPositions, refetchPools, reset]);

  const busy = isPending || isConfirming;

  const send = async (next: "burn" | "collect") => {
    if (!address) {
      alert("请先连接钱包");
      return;
    }
    if (PositionManagerAddress === zeroAddress) {
      alert("未配置 PositionManager 合约地址");
      return;
    }

    try {
      setAction(next);
      const id = BigInt(positionId);
      const txHash =
        next === "burn"
          ? await writeContractAsync({
              address: PositionManagerAddress,
              abi: POSITION_MANAGER_ABI,
              functionName: "burn",
              args: [id],
              gas: TX_GAS_LIMIT,
            })
          : await writeContractAsync({
              address: PositionManagerAddress,
              abi: POSITION_MANAGER_ABI,
              functionName: "collect",
              args: [id, address],
              gas: TX_GAS_LIMIT,
            });
      setHash(txHash);
    } catch (err) {
      setAction(null);
      alert(err instanceof Error ? err.message : "交易失败");
    }
  };

  return (
    <>
      <Button variant="link" onClick={() => void send("burn")} disabled={busy}>
        {busy && action === "burn" ? "Remove…" : "Remove"}
      </Button>
      <Button variant="link" onClick={() => void send("collect")} disabled={busy}>
        {busy && action === "collect" ? "Collect…" : "Collect"}
      </Button>
    </>
  );
}
