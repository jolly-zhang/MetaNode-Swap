"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
    useConnectorClient,
    useReadContracts,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";
import {
    type Address,
    erc20Abi,
    formatUnits,
    type Hash,
    maxUint256,
    parseUnits,
    zeroAddress,
} from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import { Coins, Lock, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { PoolRow } from "@/types";
import { POSITION_MANAGER_ABI } from "@/contracts/positionAbi";
import { PositionManagerAddress } from "@/utils/env";
import usePoolTokenMeta from "@/hooks/usePoolTokenMeta";
import { config } from "@/utils/wagmi";
import { sqrtPriceX96ToPrice, tickToPrice } from "@/utils/sqrtPrice";

const formSchema = z
    .object({
        amount0: z.string(),
        amount1: z.string(),
    })
    .refine((values) => Number(values.amount0) > 0 || Number(values.amount1) > 0, {
        message: "至少填写一种代币数量",
        path: ["amount0"],
    });

type FormValues = z.infer<typeof formSchema>;

const MINT_GAS_LIMIT = BigInt(3_000_000);

const shortAddress = (value: string) =>
    `${value.slice(0, 10)}...${value.slice(-8)}`;

const Badge = ({
    children,
    tone = "outline",
}: {
    children: ReactNode;
    tone?: "outline" | "default";
}) => (
    <span
        className={
            tone === "default"
                ? "ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                : "ml-auto rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
        }
    >
        {children}
    </span>
);

type AddPositionDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pool: PoolRow | null;
    onCreated?: () => void;
};

export default function AddPositionDialog({
    open,
    onOpenChange,
    pool,
    onCreated,
}: AddPositionDialogProps) {
    const { data: connectorClient } = useConnectorClient();
    const address = connectorClient?.account.address;
    const { writeContractAsync, isPending, reset } = useWriteContract();
    const [hash, setHash] = useState<Hash>();
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { symbol0, symbol1, decimals0, decimals1 } = usePoolTokenMeta({
        pool: pool?.pool ?? "",
        token0: pool?.token0 ?? "",
        token1: pool?.token1 ?? "",
    });

    const walletReads = useReadContracts({
        contracts:
            address && pool
                ? [
                    {
                        address: pool.token0 as Address,
                        abi: erc20Abi,
                        functionName: "balanceOf",
                        args: [address],
                    },
                    {
                        address: pool.token1 as Address,
                        abi: erc20Abi,
                        functionName: "balanceOf",
                        args: [address],
                    },
                    {
                        address: pool.token0 as Address,
                        abi: erc20Abi,
                        functionName: "allowance",
                        args: [address, PositionManagerAddress],
                    },
                    {
                        address: pool.token1 as Address,
                        abi: erc20Abi,
                        functionName: "allowance",
                        args: [address, PositionManagerAddress],
                    },
                ]
                : [],
        query: { enabled: Boolean(open && address && pool) },
    });

    const wallet0 = walletReads.data?.[0]?.result;
    const wallet1 = walletReads.data?.[1]?.result;
    const allowance0 = walletReads.data?.[2]?.result;
    const allowance1 = walletReads.data?.[3]?.result;
    const token0Decimals = decimals0 == null ? undefined : Number(decimals0);
    const token1Decimals = decimals1 == null ? undefined : Number(decimals1);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount0: "",
            amount1: "",
        },
    });

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
        query: { enabled: Boolean(hash) },
    });

    useEffect(() => {
        if (!open) return;
        form.reset({ amount0: "", amount1: "" });
        setSubmitError(null);
        setHash(undefined);
        reset();
    }, [open, pool, form, reset]);

    useEffect(() => {
        if (!isSuccess) return;
        onCreated?.();
        onOpenChange(false);
    }, [isSuccess, onCreated, onOpenChange]);
    //授权代币
    const approveIfNeeded = async (
        token: Address,
        amount: bigint,
        allowance: bigint | undefined,
    ) => {
        if (amount === BigInt(0) || (allowance != null && allowance >= amount)) return;
        const approveHash = await writeContractAsync({
            address: token,
            abi: erc20Abi,
            functionName: "approve",
            args: [PositionManagerAddress, maxUint256],
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
    };
    //创建流动性
    const onSubmit = async (values: FormValues) => {
        setSubmitError(null);
        if (!pool) {
            setSubmitError("请先选择一个池子");
            return;
        }
        if (!address) {
            setSubmitError("请先连接钱包");
            return;
        }
        if (PositionManagerAddress === zeroAddress) {
            setSubmitError("未配置 PositionManager 地址");
            return;
        }
        if (token0Decimals == null || token1Decimals == null) {
            setSubmitError("正在读取代币精度，请稍后再试");
            return;
        }

        let amount0Desired: bigint;
        let amount1Desired: bigint;
        try {
            amount0Desired = parseUnits(values.amount0 || "0", token0Decimals);
            amount1Desired = parseUnits(values.amount1 || "0", token1Decimals);
        } catch {
            setSubmitError("请输入有效的代币数量");
            return;
        }
        if (amount0Desired === BigInt(0) && amount1Desired === BigInt(0)) {
            setSubmitError("至少填写一种代币数量");
            return;
        }

        const latest = await walletReads.refetch();
        const balance0 = latest.data?.[0]?.result ?? wallet0;
        const balance1 = latest.data?.[1]?.result ?? wallet1;
        const latestAllowance0 = latest.data?.[2]?.result ?? allowance0;
        const latestAllowance1 = latest.data?.[3]?.result ?? allowance1;
        if (balance0 == null || balance1 == null) {
            setSubmitError("正在读取钱包余额，请稍后再试");
            return;
        }
        if (amount0Desired > BigInt(0) && balance0 < amount0Desired) {
            setSubmitError(
                `${symbol0 ?? "Token0"} 余额不足：当前 ${formatUnits(balance0, token0Decimals)}，需要 ${formatUnits(amount0Desired, token0Decimals)}`,
            );
            return;
        }
        if (amount1Desired > BigInt(0) && balance1 < amount1Desired) {
            setSubmitError(
                `${symbol1 ?? "Token1"} 余额不足：当前 ${formatUnits(balance1, token1Decimals)}，需要 ${formatUnits(amount1Desired, token1Decimals)}`,
            );
            return;
        }

        try {
            await approveIfNeeded(pool.token0 as Address, amount0Desired, latestAllowance0);
            await approveIfNeeded(pool.token1 as Address, amount1Desired, latestAllowance1);
            const txHash = await writeContractAsync({
                address: PositionManagerAddress,
                abi: POSITION_MANAGER_ABI,
                functionName: "mint",
                args: [
                    {
                        token0: pool.token0 as Address,
                        token1: pool.token1 as Address,
                        index: pool.index,
                        amount0Desired,
                        amount1Desired,
                        recipient: address,
                        deadline: BigInt(Math.floor(Date.now() / 1000) + 20 * 60),
                    },
                ],
                gas: MINT_GAS_LIMIT,
            });
            setHash(txHash);
        } catch (err) {
            const message = err instanceof Error ? err.message : "添加流动性失败";
            if (message.includes("ERC20InsufficientBalance")) {
                setSubmitError("钱包里对应代币余额为 0，无法添加仓位。请先获取测试代币后再试。");
                return;
            }
            setSubmitError(message);
        }
    };

    const busy = isPending || isConfirming;
    const currentPrice =
        pool && token0Decimals != null && token1Decimals != null
            ? sqrtPriceX96ToPrice(pool.sqrtPriceX96, token0Decimals, token1Decimals)
            : "...";
    const priceLower =
        pool && token0Decimals != null && token1Decimals != null
            ? tickToPrice(pool.tickLower, token0Decimals, token1Decimals)
            : "...";
    const priceUpper =
        pool && token0Decimals != null && token1Decimals != null
            ? tickToPrice(pool.tickUpper, token0Decimals, token1Decimals)
            : "...";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Position</DialogTitle>
                </DialogHeader>
                {!pool ? (
                    <p className="text-sm text-muted-foreground">请从 Pool List 选择一个池子。</p>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="amount0"
                                render={({ field }: { field: ControllerRenderProps<FormValues, "amount0"> }) => (
                                    <FormItem>
                                        <FormLabel>Deposit amounts</FormLabel>
                                        <div className="relative border border-primary/20 rounded-lg p-2 ">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex-1">
                                                    <FormControl>
                                                        <Input
                                                            step="any"
                                                            placeholder={"0"}
                                                            disabled={busy}
                                                            {...field}
                                                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                        />
                                                    </FormControl>
                                                </div>
                                                <div className="">{symbol0 ?? "Token0"}</div>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <FormDescription>
                                                    $:0.00
                                                </FormDescription>
                                                <div>
                                                    Balance: {wallet0 != null && token0Decimals != null
                                                        ? formatUnits(wallet0, token0Decimals)
                                                        : "查询中..."}
                                                </div>
                                            </div>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="amount1"
                                render={({ field }: { field: ControllerRenderProps<FormValues, "amount1"> }) => (
                                    <FormItem>
                                        <div className="relative border border-primary/20 rounded-lg p-2 ">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex-1">
                                                    <FormControl>
                                                        <Input
                                                            step="any"
                                                            placeholder={"0"}
                                                            disabled={busy}
                                                            {...field}
                                                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                        />
                                                    </FormControl>
                                                </div>
                                                <div className="">{symbol1 ?? "Token0"}</div>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <FormDescription>
                                                    $:0.00
                                                </FormDescription>
                                                <div>
                                                    Balance: {wallet1 != null && token1Decimals != null
                                                        ? formatUnits(wallet1, token1Decimals)
                                                        : "查询中..."}
                                                </div>
                                            </div>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                          
                            <div>
                                Fee tier: {Number(pool.fee) / 10000}%
                            </div>
                            <div>
                                price range: {priceLower} - {priceUpper}
                            </div>
                            <div>
                                Current price: {currentPrice}
                            </div>
                         

                            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                            {hash && (
                                <p className="break-all text-xs text-muted-foreground">交易哈希：{hash}</p>
                            )}

                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                                    取消
                                </Button>
                                <Button type="submit" className="flex-1" disabled={busy || !address}>
                                    {isConfirming ? "确认中…" : isPending ? "签名中…" : "创建"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
