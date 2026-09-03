"use client";

import { useEffect, useState } from "react";
import { 
  useConnectorClient, //获取钱吧地址
  useSimulateContract,  // 1. 模拟交易
  useWriteContract,     // 2. 提交交易
  useWaitForTransactionReceipt // 3. 等待确认
} from "wagmi";
import { type Hash, zeroAddress } from "viem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FACTORY_ABI } from "@/contracts/addPoolAbi";
import { SwapContractAddress } from "@/utils/env";
import { buildCreatePoolParams, FEE_OPTIONS } from "@/utils/poolParams";

const inputClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type AddPoolDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export default function AddPoolDialog({
  open,
  onOpenChange,
  onCreated,
}: AddPoolDialogProps) {
  //链接钱包获取地址 useAccount()废弃
  const { data: connectorClient } = useConnectorClient();
  const address = connectorClient?.account.address;
  const { writeContractAsync, isPending, error, reset } = useWriteContract();

  const [token0, setToken0] = useState("");
  const [token1, setToken1] = useState("");
  const [fee, setFee] = useState(3000);
  const [priceLower, setPriceLower] = useState("1");
  const [priceUpper, setPriceUpper] = useState("40000");
  const [initPrice, setInitPrice] = useState("1");
  const [formError, setFormError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hash>();
  //一笔交易是否已经被区块链打包确认了。如果确认了，则可以调用onCreated回调函数
  //1、writeContractAsync → 得到 hash
  // 2、setHash(txHash)
  // 3、Hook 发现 hash 有值 → 开始等 receipt
  // 4、isSuccess 变 true → useEffect 里 refetch 并关弹框
  const { 
    isLoading: isConfirming, // 是否正在等待确认
    isSuccess // 是否成功确认
  } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },//没有hash不请求
  })
  //如果交易成功就刷新列表，并提示成功
  useEffect(() => {
    if (!isSuccess) return;
    onCreated?.();// 如果 onCreated 是 undefined，静默跳过，不报错，否则刷新pool列表
    onOpenChange(false);//关闭弹框
    alert("添加池子交易成功");
  }, [isSuccess, onCreated, onOpenChange]);
//弹框关闭重置表单和状态
  useEffect(() => {
    if (open) return;
    setFormError(null);
    setHash(undefined);
    reset();
  }, [open, reset]);
//点击提交交易
  const submit = async () => {
    setFormError(null);
    if (!address) {
      setFormError("请先连接钱包");
      return;
    }
    if (SwapContractAddress === zeroAddress) {
      setFormError("未配置 PoolManager 合约地址");
      return;
    }

    try {
      //表单
      const params = buildCreatePoolParams({
        token0,
        token1,
        fee,
        priceLower,
        priceUpper,
        initPrice,
      });
      //调用合约创建池子
      const txHash = await writeContractAsync({
        address: SwapContractAddress,
        abi: FACTORY_ABI,
        functionName: "createAndInitializePoolIfNecessary",
        args: [params],
      });
      setHash(txHash);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "创建池子失败");
    }
  };

  const busy = isPending || isConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pool</DialogTitle>
          <DialogDescription>
            填写两个代币地址、手续费和价格区间。提交后会创建并初始化池子，列表会自动刷新。
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="token0">Token0</FieldLabel>
            <input
              id="token0"
              value={token0}
              onChange={(event) => setToken0(event.target.value)}
              placeholder="0x..."
              className={inputClassName}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="token1">Token1</FieldLabel>
            <input
              id="token1"
              value={token1}
              onChange={(event) => setToken1(event.target.value)}
              placeholder="0x..."
              className={inputClassName}
            />
          </Field>
          <Field>
            <FieldLabel>Fee tier</FieldLabel>
            <Select
              value={String(fee)}
              onValueChange={(value) => {
                if (value) setFee(Number(value));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {FEE_OPTIONS.find((option) => option.value === fee)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FEE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="priceLower">价格下限</FieldLabel>
              <input
                id="priceLower"
                value={priceLower}
                onChange={(event) => setPriceLower(event.target.value)}
                className={inputClassName}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="priceUpper">价格上限</FieldLabel>
              <input
                id="priceUpper"
                value={priceUpper}
                onChange={(event) => setPriceUpper(event.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="initPrice">初始价格（token1 / token0）</FieldLabel>
            <input
              id="initPrice"
              value={initPrice}
              onChange={(event) => setInitPrice(event.target.value)}
              className={inputClassName}
            />
          </Field>
        </FieldGroup>
        {(formError || error) && (
          <p className="text-sm text-destructive">
            {formError ?? error?.message}
          </p>
        )}
        {hash && (
          <p className="text-xs text-muted-foreground break-all">
            交易已提交：{hash}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy}>
            {isConfirming ? "确认中…" : isPending ? "签名中…" : "创建 Pool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
