"use client";

import { useEffect, useState } from "react";
import { useConnectorClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, getAddress, type Hash, zeroAddress } from "viem";
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { FACTORY_ABI } from "@/contracts/addPoolAbi";
import { SwapContractAddress } from "@/utils/env";
import { TickMath } from '@uniswap/v3-sdk';
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
  // 可选：自定义 tick 范围（高级用户）.optional()表示可选
  tickLower: z.string().optional(),
  tickUpper: z.string().optional()
})
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
//计算tick
function calculateTicks(price: number, fee: number, priceRangePercent: number = 0.1) {
  const tickSpacing = getTickSpacing(fee)
  // 基础 tick（从价格计算）
  const tick = Math.floor(Math.log(price) / Math.log(1.0001))
  // 计算上下范围
  const tickRange = Math.floor(Math.log(1 + priceRangePercent) / Math.log(1.0001))
  const tickLower = Math.floor((tick - tickRange) / tickSpacing) * tickSpacing
  const tickUpper = Math.ceil((tick + tickRange) / tickSpacing) * tickSpacing
  return {
    tickLower: Math.max(MIN_TICK, tickLower),
    tickUpper: Math.min(MAX_TICK, tickUpper),
  }
}

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
      price: "",
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
      //格式转换，去掉首尾空格，转换为大小写地址
      const address0 = getAddress(values.token0.trim()) as Address;
      const address1 = getAddress(values.token1.trim()) as Address;
      if (address0.toLowerCase() === address1.toLowerCase()) {
        alert("两个代币地址不能相同");
        return;
      }
      //两个地址比较，小的那个给token0，大的那个给token1，并计算价格
      let token0 = address0;
      let token1 = address1;
      let price = Number(values.price);
      if (address0.toLowerCase() > address1.toLowerCase()) {
        token0 = address1;
        token1 = address0;
        price = 1 / price;
      }
      const customLower = values.tickLower?.trim();
      const customUpper = values.tickUpper?.trim();
      const ticks = customLower && customUpper ? {
        tickLower: Number(customLower),
        tickUpper: Number(customUpper),
      }
        : calculateTicks(price, values.fee);

      if (ticks.tickLower >= ticks.tickUpper) {
        alert("Tick 上限必须大于下限");
        return;
      }
      const tick = Math.floor(Math.log(price) / Math.log(1.0001));
      const params = {
        token0,
        token1,
        fee: values.fee,
        tickLower: ticks.tickLower,
        tickUpper: ticks.tickUpper,
        sqrtPriceX96: BigInt(TickMath.getSqrtRatioAtTick(tick).toString())
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
                  <FormLabel>代币 0 地址</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      disabled={busy}
                    />
                  </FormControl>
                  <FormDescription>
                    第一个代币的合约地址（按地址排序后较小的那个）
                  </FormDescription>
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
                  <FormLabel>代币 1 地址</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      disabled={busy}
                    />
                  </FormControl>
                  <FormDescription>
                    第二个代币的合约地址（按地址排序后较大的那个）
                  </FormDescription>
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
                  <FormLabel>费率</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString()}
                    disabled={busy}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择费率" />
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
                  <FormLabel>初始价格</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如: 3000 (1 token0 = 3000 token1)"
                      {...field}
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
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-2">高级选项（可选）</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tickLower"
                  render={({ field }: { field: ControllerRenderProps<FormValues, "tickLower"> }) => (
                    <FormItem>
                      <FormLabel>Tick 下限</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="自动计算"
                          {...field}
                          disabled={busy}
                        />
                      </FormControl>
                      <FormDescription>默认 -887272</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tickUpper"
                  render={({ field }: { field: ControllerRenderProps<FormValues, "tickUpper"> }) => (
                    <FormItem>
                      <FormLabel>Tick 上限</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="自动计算"
                          {...field}
                          disabled={busy}
                        />
                      </FormControl>
                      <FormDescription>默认 887272</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
