"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useConnectorClient,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import {
  type Address,
  erc20Abi,
  formatUnits,
  getAddress,
  type Hash,
  maxUint256,
  parseUnits,
  zeroAddress,
} from "viem";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePoolContract } from "@/hooks/usePoolContract";
import useSwapQuote, { getSwapRoute, type QuoteMode } from "@/hooks/useSwapQuote";
import { swapRouterAbi } from "@/contracts/swapAbi";
import { SwapRouterAddress } from "@/utils/env";
import { config } from "@/utils/wagmi";

const SWAP_TOKENS = [
  {
    symbol: "MNTokenA",
    address: getAddress("0x4798388e3adE569570Df626040F07DF71135C48E"),
  },
  {
    symbol: "MNTokenB",
    address: getAddress("0x5A4eA3a013D42Cfd1B1609d19f6eA998EeE06D30"),
  },
  {
    symbol: "MNTokenC",
    address: getAddress("0x86B5df6FF459854ca91318274E47F4eEE245CF28"),
  },
  {
    symbol: "MNTokenD",
    address: getAddress("0x7af86B1034AC4C925Ef5C3F637D1092310d83F03"),
  },
] as const;

const formSchema = z
  .object({
    tokenIn: z.string(),
    tokenOut: z.string(),
    amountIn: z.string(),
    amountOut: z.string(),
  })
  .refine((values) => !values.tokenIn || !values.tokenOut || values.tokenIn !== values.tokenOut, {
    message: "买入和卖出代币不能相同",
    path: ["tokenOut"],
  });

type FormValues = z.infer<typeof formSchema>;

const SLIPPAGE_BPS = BigInt(50);
const DEADLINE_SECONDS = 20 * 60;
const SWAP_GAS_LIMIT = BigInt(3_000_000);

const findTokenBySymbol = (symbol: string) =>
  SWAP_TOKENS.find((token) => token.symbol === symbol);

const parseAmount = (value: string, decimals: number | undefined) => {
  if (decimals == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") return undefined;
  try {
    const amount = parseUnits(trimmed, decimals);
    return amount > BigInt(0) ? amount : undefined;
  } catch {
    return undefined;
  }
};

export default function SwapPage() {
  const { data: connectorClient } = useConnectorClient();
  const address = connectorClient?.account.address;
  const { poolData } = usePoolContract();
  const [quoteMode, setQuoteMode] = useState<QuoteMode>("exactIn");
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<Hash>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenIn: "",
      tokenOut: "",
      amountIn: "",
      amountOut: "",
    },
  });

  const tokenInSymbol = form.watch("tokenIn");
  const tokenOutSymbol = form.watch("tokenOut");
  const amountIn = form.watch("amountIn");
  const amountOut = form.watch("amountOut");

  const tokenIn = findTokenBySymbol(tokenInSymbol)?.address;
  const tokenOut = findTokenBySymbol(tokenOutSymbol)?.address;

  const tokenDecimals = useReadContracts({
    contracts: tokenIn && tokenOut
      ? [
          { address: tokenIn, abi: erc20Abi, functionName: "decimals" },
          { address: tokenOut, abi: erc20Abi, functionName: "decimals" },
        ]
      : [],
    query: { enabled: Boolean(tokenIn && tokenOut) },
  });

  const tokenBalances = useReadContracts({
    contracts: address && tokenIn && tokenOut
      ? [
          { address: tokenIn, abi: erc20Abi, functionName: "balanceOf", args: [address] },
          { address: tokenOut, abi: erc20Abi, functionName: "balanceOf", args: [address] },
          { address: tokenIn, abi: erc20Abi, functionName: "allowance", args: [address, SwapRouterAddress] },
        ]
      : [],
    query: { enabled: Boolean(address && tokenIn && tokenOut) },
  });

  const decimalsIn =
    tokenDecimals.data?.[0]?.result == null
      ? undefined
      : Number(tokenDecimals.data[0].result);
  const decimalsOut =
    tokenDecimals.data?.[1]?.result == null
      ? undefined
      : Number(tokenDecimals.data[1].result);
  const balanceInRaw = tokenBalances.data?.[0]?.result;
  const balanceOutRaw = tokenBalances.data?.[1]?.result;
  const allowanceIn = tokenBalances.data?.[2]?.result;

  const swapRoute = useMemo(
    () => getSwapRoute(poolData, tokenIn, tokenOut),
    [poolData, tokenIn, tokenOut],
  );

  const amountInWei = quoteMode === "exactIn" ? parseAmount(amountIn, decimalsIn) : undefined;
  const amountOutWei = quoteMode === "exactOut" ? parseAmount(amountOut, decimalsOut) : undefined;

  const { quotedAmountIn, quotedAmountOut, isQuoting, quoteError } = useSwapQuote({
    tokenIn,
    tokenOut,
    indexPath: swapRoute?.indexPath,
    sqrtPriceLimitX96: swapRoute?.sqrtPriceLimitX96,
    amountIn: amountInWei,
    amountOut: amountOutWei,
    mode: quoteMode,
    enabled: Boolean(tokenIn && tokenOut && swapRoute),
  });

  useEffect(() => {
    if (quoteMode !== "exactIn" || quotedAmountOut == null || decimalsOut == null) return;
    form.setValue("amountOut", formatUnits(quotedAmountOut, decimalsOut), { shouldValidate: false });
  }, [quoteMode, quotedAmountOut, decimalsOut, form]);

  useEffect(() => {
    if (quoteMode !== "exactOut" || quotedAmountIn == null || decimalsIn == null) return;
    form.setValue("amountIn", formatUnits(quotedAmountIn, decimalsIn), { shouldValidate: false });
  }, [quoteMode, quotedAmountIn, decimalsIn, form]);

  useEffect(() => {
    if (quoteMode === "exactIn" && !amountIn.trim()) {
      form.setValue("amountOut", "", { shouldValidate: false });
    }
    if (quoteMode === "exactOut" && !amountOut.trim()) {
      form.setValue("amountIn", "", { shouldValidate: false });
    }
  }, [amountIn, amountOut, form, quoteMode]);

  useEffect(() => {
    if (!isSuccess) return;
    form.setValue("amountIn", "");
    form.setValue("amountOut", "");
    void tokenBalances.refetch();
  }, [form, isSuccess, tokenBalances]);

  const approveIfNeeded = async (amount: bigint) => {
    if (!tokenIn) return;
    if (allowanceIn != null && allowanceIn >= amount) return;
    const approveHash = await writeContractAsync({
      address: tokenIn,
      abi: erc20Abi,
      functionName: "approve",
      args: [SwapRouterAddress, maxUint256],
    });
    await waitForTransactionReceipt(config, { hash: approveHash });
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setHash(undefined);

    if (!address) {
      setSubmitError("请先连接钱包");
      return;
    }
    if (SwapRouterAddress === zeroAddress) {
      setSubmitError("未配置 SwapRouter 地址");
      return;
    }
    if (!tokenIn || !tokenOut) {
      setSubmitError("请选择买入和卖出代币");
      return;
    }
    if (!swapRoute) {
      setSubmitError("该交易对暂无可用池子");
      return;
    }
    if (decimalsIn == null || decimalsOut == null) {
      setSubmitError("正在读取代币精度，请稍后再试");
      return;
    }

    const inAmount = parseAmount(values.amountIn, decimalsIn);
    const outAmount = parseAmount(values.amountOut, decimalsOut);
    if (!inAmount || !outAmount) {
      setSubmitError("请先输入数量并完成询价");
      return;
    }

    const neededIn =
      quoteMode === "exactIn"
        ? inAmount
        : (inAmount * (BigInt(10000) + SLIPPAGE_BPS)) / BigInt(10000);
    const latestBalances = await tokenBalances.refetch();
    const latestBalanceIn = latestBalances.data?.[0]?.result ?? balanceInRaw;
    if (latestBalanceIn == null) {
      setSubmitError("正在读取钱包余额，请稍后再试");
      return;
    }
    if (latestBalanceIn < neededIn) {
      setSubmitError(
        `${tokenInSymbol} 余额不足：当前 ${formatUnits(latestBalanceIn, decimalsIn)}，本次需要 ${formatUnits(neededIn, decimalsIn)}。请先向钱包 ${address.slice(0, 6)}…${address.slice(-4)} 转入该代币后再 Swap。`,
      );
      return;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);

    try {
      if (quoteMode === "exactIn") {
        const amountOutMinimum = (outAmount * (BigInt(10000) - SLIPPAGE_BPS)) / BigInt(10000);
        await approveIfNeeded(inAmount);
        const txHash = await writeContractAsync({
          address: SwapRouterAddress,
          abi: swapRouterAbi,
          functionName: "exactInput",
          args: [
            {
              tokenIn,
              tokenOut,
              indexPath: swapRoute.indexPath,
              recipient: address,
              deadline,
              amountIn: inAmount,
              amountOutMinimum,
              sqrtPriceLimitX96: swapRoute.sqrtPriceLimitX96,
            },
          ],
          gas: SWAP_GAS_LIMIT,
        });
        setHash(txHash);
      } else {
        const amountInMaximum = (inAmount * (BigInt(10000) + SLIPPAGE_BPS)) / BigInt(10000);
        await approveIfNeeded(amountInMaximum);
        const txHash = await writeContractAsync({
          address: SwapRouterAddress,
          abi: swapRouterAbi,
          functionName: "exactOutput",
          args: [
            {
              tokenIn,
              tokenOut,
              indexPath: swapRoute.indexPath,
              recipient: address,
              deadline,
              amountOut: outAmount,
              amountInMaximum,
              sqrtPriceLimitX96: swapRoute.sqrtPriceLimitX96,
            },
          ],
          gas: SWAP_GAS_LIMIT,
        });
        setHash(txHash);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Swap 失败";
      if (message.includes("ERC20InsufficientBalance")) {
        setSubmitError(
          `${tokenInSymbol} 余额为 0，无法支付本次兑换。请先获取该测试代币后再试。`,
        );
        return;
      }
      setSubmitError(message);
    }
  };

  const pairReady = Boolean(tokenIn && tokenOut && tokenIn !== tokenOut);
  const missingPool = pairReady && !swapRoute;
  const busy = isPending || isConfirming;
  const amountInWeiForBalance = parseAmount(amountIn, decimalsIn);
  const neededIn =
    amountInWeiForBalance == null
      ? undefined
      : quoteMode === "exactOut"
        ? (amountInWeiForBalance * (BigInt(10000) + SLIPPAGE_BPS)) / BigInt(10000)
        : amountInWeiForBalance;
  const insufficientBalance =
    address != null &&
    neededIn != null &&
    balanceInRaw != null &&
    balanceInRaw < neededIn;

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-[#edf1f7] bg-[#f8fafc] p-4">
      <div className="mb-2 font-bold">Swap</div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-3 border border-[#edf1f7] p-4">
            <FormField
              control={form.control}
              name="amountIn"
              render={({ field }: { field: ControllerRenderProps<FormValues, "amountIn"> }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormControl>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      className="h-12 w-full bg-transparent text-3xl font-semibold text-black caret-black outline-none placeholder:text-black/30"
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={(event) => {
                        setQuoteMode("exactIn");
                        field.onChange(event.target.value);
                      }}
                    />
                  </FormControl>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quoteMode === "exactOut" && isQuoting ? "询价中…" : tokenInSymbol || "卖出"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tokenIn"
              render={({ field }: { field: ControllerRenderProps<FormValues, "tokenIn"> }) => (
                <FormItem className="flex shrink-0 flex-col items-end gap-2">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 min-w-28 rounded-full border border-[#e5eaf2] bg-white px-3 shadow-none">
                        <SelectValue placeholder="选择代币" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="end" className="min-w-36">
                      {SWAP_TOKENS.map((token) => (
                        <SelectItem key={token.address} value={token.symbol}>
                          {token.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Balance:{" "}
                    {address
                      ? balanceInRaw != null && decimalsIn != null
                        ? formatUnits(balanceInRaw, decimalsIn)
                        : "查询中..."
                      : "未连接"}
                    {address && balanceInRaw != null && decimalsIn != null && (
                      <button
                        type="button"
                        className="ml-1 font-medium text-primary"
                        disabled={busy || balanceInRaw === BigInt(0)}
                        onClick={() => {
                          setQuoteMode("exactIn");
                          form.setValue("amountIn", formatUnits(balanceInRaw, decimalsIn));
                        }}
                      >
                        MAX
                      </button>
                    )}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-3 border border-[#edf1f7] p-4">
            <FormField
              control={form.control}
              name="amountOut"
              render={({ field }: { field: ControllerRenderProps<FormValues, "amountOut"> }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormControl>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      className="h-12 w-full bg-transparent text-3xl font-semibold text-black caret-black outline-none placeholder:text-black/30"
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={(event) => {
                        setQuoteMode("exactOut");
                        field.onChange(event.target.value);
                      }}
                    />
                  </FormControl>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quoteMode === "exactIn" && isQuoting ? "询价中…" : tokenOutSymbol || "买入"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tokenOut"
              render={({ field }: { field: ControllerRenderProps<FormValues, "tokenOut"> }) => (
                <FormItem className="flex shrink-0 flex-col items-end gap-2">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 min-w-28 rounded-full border border-[#e5eaf2] bg-white px-3 shadow-none">
                        <SelectValue placeholder="选择代币" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="end" className="min-w-36">
                      {SWAP_TOKENS.map((token) => (
                        <SelectItem key={token.address} value={token.symbol}>
                          {token.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Balance:{" "}
                    {address
                      ? balanceOutRaw != null && decimalsOut != null
                        ? formatUnits(balanceOutRaw, decimalsOut)
                        : "查询中..."
                      : "未连接"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {insufficientBalance && (
            <p className="text-sm text-destructive">
              {tokenInSymbol} 余额不足，当前钱包没有足够的卖出代币。
            </p>
          )}
          {missingPool && (
            <p className="text-sm text-destructive">该交易对暂无可用池子，无法询价。</p>
          )}
          {quoteError && (
            <p className="text-sm text-destructive">
              询价失败：{quoteError.message}
            </p>
          )}

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          {hash && (
            <p className="break-all text-xs text-muted-foreground">交易哈希：{hash}</p>
          )}

          <Button
            className="mt-2 w-full"
            size="lg"
            type="submit"
            disabled={busy || isQuoting || !address || missingPool || insufficientBalance}
          >
            {!address
              ? "请先连接钱包"
              : insufficientBalance
                ? "余额不足"
                : isConfirming
                  ? "确认中…"
                  : isPending
                    ? "签名中…"
                    : "Swap"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
