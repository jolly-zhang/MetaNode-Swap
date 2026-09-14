"use client";

import { useEffect, useState } from "react";
import { encodeSqrtRatioX96, nearestUsableTick, TickMath } from "@uniswap/v3-sdk"
import { useConnectorClient, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, erc20Abi, getAddress, type Hash, isAddress, parseUnits, zeroAddress } from "viem";
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FACTORY_ABI } from "@/contracts/addPoolAbi";
import { SwapContractAddress } from "@/utils/env";
import type { ControllerRenderProps } from "react-hook-form"
// 费率选项
const FEE_OPTIONS = [
  { value: 500, label: "0.05% (稳定币对)" },
  { value: 3000, label: "0.3% (标准)" },
  { value: 10000, label: "1% (波动对)" },
]
// Tick 范围（最大范围）
const MIN_TICK = -887272
const MAX_TICK = 887272
//  表单验证 
const formSchema = z.object({
  token0: z.string()
    .length(42, "合约地址必须为 42 个字符（含 0x）")
    .regex(/^0x[a-fA-F0-9]{40}$/, "请输入有效的以太坊合约地址"),
  token1: z.string()
    .length(42, "合约地址必须为 42 个字符（含 0x）")
    .regex(/^0x[a-fA-F0-9]{40}$/, "请输入有效的以太坊合约地址"),
  fee: z.number(),
  price: z.string()
    .regex(/^\d*\.?\d*$/, "请输入有效数字")
    .refine((val) => parseFloat(val) > 0, "价格必须大于 0")
    .refine((val) => parseFloat(val) < 1e12, "价格不能超过 1e12"),
  tickLower: z.string()
    .regex(/^\d*\.?\d*$/, "请输入有效数字")
    .refine((val) => parseFloat(val) > 0, "最低价格必须大于 0"),
  tickUpper: z.string()
    .regex(/^\d*\.?\d*$/, "请输入有效数字")
    .refine((val) => parseFloat(val) > 0, "最高价格必须大于 0"),
}).refine((data) => parseFloat(data.tickLower) < parseFloat(data.tickUpper), {
  message: "最高价格必须大于最低价格",
  path: ["tickLower"],
}).refine((data) => data.token0.trim().toLowerCase() !== data.token1.trim().toLowerCase(), {
  message: '两个代币地址不能相同',
  path: ['token1'],
});

// 表单值类型
type FormValues = z.infer<typeof formSchema>

//获取tick间隔
function getTickSpacing(fee: number): number {
  switch (fee) {
    case 500:
      return 10
    case 3000:
      return 60
    case 10000:
      return 200
    default:
      return 60
  }
}
//格式化价格字符串，去掉末尾的0
const formatPriceForParse = (price: number, decimals: number) => {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("价格必须大于 0");
  }
  const digits = Math.min(Math.max(decimals, 0), 18);
  return price.toFixed(digits).replace(/\.?0+$/, "") || "0";
};
// 将价格转换成sqrtPriceX96
const priceToSqrtRatio = (price: number, decimals0: number, decimals1: number) => {
  // 1. 把 1 个 token0 转换成最小单位
  const amount0 = parseUnits("1", decimals0);
  // 2. 把价格转换成 token1 的数量，再转为最小单位
  const amount1 = parseUnits(formatPriceForParse(price, decimals1), decimals1);
  // 3. 计算 sqrtPriceX96 = sqrt(amount1 / amount0) * 2^96
  return encodeSqrtRatioX96(amount1.toString(), amount0.toString());
};
//将价格转换成sqrtPriceX96
const priceToSqrtPriceX96 = (price: number, decimals0: number, decimals1: number) => {
  return BigInt(priceToSqrtRatio(price, decimals0, decimals1).toString());
};
//将价格转换成tick，并确保tick在范围内
const priceToTick = (price: number, decimals0: number, decimals1: number, fee: number) => {
  const tick = TickMath.getTickAtSqrtRatio(priceToSqrtRatio(price, decimals0, decimals1));
  const usable = nearestUsableTick(tick, getTickSpacing(fee));
  return Math.max(MIN_TICK, Math.min(MAX_TICK, usable));
};

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
  const [hash, setHash] = useState<Hash>();
  // 表单
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token0: "",
      token1: "",
      fee: 3000,
      price: "3000",
      tickLower: "",
      tickUpper: "",
    },
  })
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
    alert(`添加池子交易成功,交易哈希: ${hash}`);
  }, [isSuccess, onCreated, onOpenChange]);
  //弹框关闭重置表单和状态
  useEffect(() => {
    if (open) return;
    form.reset();//重置表单
    setHash(undefined);
    reset();
  }, [open, reset]);

  const token0Watch = form.watch("token0");
  const token1Watch = form.watch("token1");
  const decimalsReady = isAddress(token0Watch) && isAddress(token1Watch);
  const tokenDecimals = useReadContracts({
    contracts: decimalsReady
      ? [
          { address: getAddress(token0Watch), abi: erc20Abi, functionName: "decimals" },
          { address: getAddress(token1Watch), abi: erc20Abi, functionName: "decimals" },
        ]
      : [],
    query: { enabled: decimalsReady },
  });
  const formDecimals0 = tokenDecimals.data?.[0]?.result == null ? undefined : Number(tokenDecimals.data[0].result);
  const formDecimals1 = tokenDecimals.data?.[1]?.result == null ? undefined : Number(tokenDecimals.data[1].result);
  //点击提交交易
  const onSubmit = async (values: FormValues) => {
    if (!address) {
      alert("请先连接钱包");
      return;
    }
    if (SwapContractAddress === zeroAddress) {
      alert("未配置 PoolManager 合约地址");
      return;
    }

    try {
      //格式转换，去掉首尾空格
      const address0 = getAddress(values.token0.trim()) as Address;
      const address1 = getAddress(values.token1.trim()) as Address;
      if (formDecimals0 == null || formDecimals1 == null) {
        alert("正在读取代币精度，请稍后再试");
        return;
      }
      let token0 = address0;
      let token1 = address1;
      let price = Number(values.price);
      let lowerPrice = Number(values.tickLower);
      let upperPrice = Number(values.tickUpper);
      let decimals0 = formDecimals0;
      let decimals1 = formDecimals1;
      if (address0.toLowerCase() > address1.toLowerCase()) {
        token0 = address1;
        token1 = address0;
        decimals0 = formDecimals1;
        decimals1 = formDecimals0;
        price = 1 / price;
        const nextLower = 1 / upperPrice;
        const nextUpper = 1 / lowerPrice;
        lowerPrice = nextLower;
        upperPrice = nextUpper;
      }
      const tickLower = priceToTick(lowerPrice, decimals0, decimals1, values.fee);
      const tickUpper = priceToTick(upperPrice, decimals0, decimals1, values.fee);
      // if (tickLower >= tickUpper) {
      //   alert("价格上限必须大于下限");
      //   return;
      // }

      const params = {
        token0,
        token1,
        fee: values.fee,
        tickLower,
        tickUpper,
        sqrtPriceX96: priceToSqrtPriceX96(price, decimals0, decimals1),
      };

      const txHash = await writeContractAsync({
        address: SwapContractAddress,
        abi: FACTORY_ABI,
        functionName: "createAndInitializePoolIfNecessary",
        args: [params],
      });
      setHash(txHash);
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建池子失败");
    }
  };
  const busy = isPending || isConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pool</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Token 0 */}
            <FormField
              control={form.control}
              name="token0"
              render={({ field }: { field: ControllerRenderProps<FormValues, "token0"> }) => (
                <FormItem>
                  <FormLabel>token0</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      disabled={busy}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Token 1 */}
            <FormField
              control={form.control}
              name="token1"
              render={({ field }: { field: ControllerRenderProps<FormValues, "token1"> }) => (
                <FormItem>
                  <FormLabel>token1</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      disabled={busy}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fee */}
            <FormField
              control={form.control}
              name="fee"
              render={({ field }: { field: ControllerRenderProps<FormValues, "fee"> }) => (
                <FormItem>
                  <FormLabel>fee</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString()}
                    disabled={busy}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="choose fee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FEE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    费率越高，适合波动性越大的交易对
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }: { field: ControllerRenderProps<FormValues, "price"> }) => (
                <FormItem>
                  <FormLabel>Current price</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如: 3000 (1 token0 = 3000 token1)"
                      name={field.name}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      disabled={busy}
                    />
                  </FormControl>
                  <FormDescription>
                    1 个 token0 等于多少个 token1
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 高级选项：自定义 Tick 范围 */}
            <div className="text-sm font-medium mb-2">Set price range</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tickLower"
                render={({ field }: { field: ControllerRenderProps<FormValues, "tickLower"> }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Low price"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        disabled={busy}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tickUpper"
                render={({ field }: { field: ControllerRenderProps<FormValues, "tickUpper"> }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="High price"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        disabled={busy}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={busy}
                className="flex-1"
              >
                {isPending ? "⏳ 提交中..." :
                  isConfirming ? `⏳ 确认中...` :
                    "创建池子"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                取消
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
