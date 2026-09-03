"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { type Address, erc20Abi, formatUnits, parseUnits } from "viem";
// import { ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import usePoolContract from "@/hooks/usePoolContract";
import useSwapQuote, { type QuoteMode } from "@/hooks/useSwapQuote";

type TokenOption = {
  address: Address;
  symbol: string;
  decimals: number;
};

// export default function SwapPage() {
//   const { address } = useAccount();
//   const { poolData, isLoading: isPoolsLoading } = usePoolContract();

//   const tokenAddresses = useMemo(() => {
//     const set = new Set<string>();
//     poolData.forEach((pool) => {
//       set.add(pool.token0.toLowerCase());
//       set.add(pool.token1.toLowerCase());
//     });
//     return [...set] as Address[];

export default function SwapPage() {
  return (
    <div className="rounded-2xl border border-[#edf1f7] bg-[#f8fafc] p-4 w-full mx-auto max-w-lg">
      <div className="mb-2  font-bold">Swap</div>
      {/* input */}
      <div className="flex items-center gap-3 border border-[#edf1f7 mb-4 p-4">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            className="h-12 w-full bg-transparent text-3xl font-semibold text-black caret-black outline-none placeholder:text-black/30"
          />
          <p className="mt-1 text-sm text-muted-foreground">$0.00</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Select>
            <SelectTrigger className="h-9 min-w-28 rounded-full border border-[#e5eaf2] bg-white px-3 shadow-none">
              <SelectValue placeholder="选择代币" />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-36">
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Balance:
          </p>
        </div>
      </div>
      {/* output */}
      <div className="flex items-center gap-3 border border-[#edf1f7 p-4">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            className="h-12 w-full bg-transparent text-3xl font-semibold text-black caret-black outline-none placeholder:text-black/30"
          />
          <p className="mt-1 text-sm text-muted-foreground">$0.00</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Select>
            <SelectTrigger className="h-9 min-w-28 rounded-full border border-[#e5eaf2] bg-white px-3 shadow-none">
              <SelectValue placeholder="选择代币" />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-36">
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Balance:
          </p>
        </div>
      </div>
      <Button className="w-full mt-2" size="lg">Swap</Button>
    </div>
  );
}
