"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import VolumeChart from "@/components/VolumeChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type PoolTransaction = {
  id: string;
  tx_hash: string;
  timestamp: string;
  type: "buy" | "sell" | "mint" | "burn";
  wallet: string;
  amount_eth: string | null;
  amount_usdc: string | null;
  amount_usd: string | null;
};

const typeLabel: Record<PoolTransaction["type"], string> = {
  buy: "买入 ETH",
  sell: "卖出 ETH",
  mint: "添加",
  burn: "移除",
};

function formatTime(timestamp: string) {
  const elapsed = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}分`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时`;
  return `${Math.floor(hours / 24)}天`;
}

const PAGE_SIZE = 50;

const TYPE_FILTERS: { value: PoolTransaction["type"]; label: string }[] = [
  { value: "buy", label: "买入" },
  { value: "sell", label: "卖出" },
  { value: "burn", label: "移除" },
  { value: "mint", label: "添加" },
];

function TypeFilter({
  selected,
  onToggle,
}: {
  selected: PoolTransaction["type"][];
  onToggle: (type: PoolTransaction["type"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="筛选类型"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground"
      >
        <ChevronsUpDown className="size-3.5 text-gray-400" />
        类型
      </button>
      {open ? (
        <div className="absolute top-full left-0 z-50 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
          {TYPE_FILTERS.map((item) => {
            const checked = selected.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onToggle(item.value)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm hover:bg-gray-50"
              >
                <span>{item.label}</span>
                <span
                  className={
                    checked
                      ? "grid size-5 place-items-center rounded-[5px] bg-[#FF37C7] text-white"
                      : "size-5 rounded-[5px] border border-gray-300"
                  }
                >
                  {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type LogsPage = {
  rows: PoolTransaction[];
  hasMore: boolean;
  next: { timestamp: string; id: string } | null;
};

function formatWallet(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

const fiveDecimals = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 5,
  minimumFractionDigits: 2,
});

const sixSigFigs = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 6,
  minimumSignificantDigits: 3,
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const twoDecimals = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const threeSigFigs = new Intl.NumberFormat("en-US", {
  minimumSignificantDigits: 3,
  maximumSignificantDigits: 3,
});

const compactUsd = new Intl.NumberFormat("en-US", {
  notation: "compact",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatUsd(value: string | null) {
  if (value == null) return "-";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs === 0) return "US$0.00";
  if (abs < 1) return `${sign}US$${threeSigFigs.format(abs)}`;
  if (abs < 1_000_000) return `${sign}US$${twoDecimals.format(abs)}`;
  return `${sign}US$${compactUsd.format(abs)}`;
}

function formatToken(value: string | null) {
  if (value == null) return "-";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs === 0) return "0";
  if (abs < 0.00001) return `${sign}<0.00001`;
  if (abs < 1) return `${sign}${fiveDecimals.format(abs)}`;
  if (abs < 10_000) return `${sign}${sixSigFigs.format(abs)}`;
  return `${sign}${twoDecimals.format(abs)}`;
}

export default function UserDataPage() {
  const [tableData, setTableData] = useState<PoolTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<PoolTransaction["type"][]>(
    TYPE_FILTERS.map((item) => item.value)
  );
  const cursorRef = useRef<LogsPage["next"]>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);
  const typesRef = useRef(selectedTypes);
  const requestRef = useRef(0);

  const loadPage = useCallback(async (initial: boolean) => {
    if (!initial && (loadingMoreRef.current || !hasMoreRef.current)) return;
    const requestId = ++requestRef.current;
    if (typesRef.current.length === 0) {
      cursorRef.current = null;
      hasMoreRef.current = false;
      setTableData([]);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    if (initial) setLoading(true);
    else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (!initial && cursorRef.current) {
        params.set("before", cursorRef.current.timestamp);
        params.set("beforeId", cursorRef.current.id);
      }
      if (typesRef.current.length < TYPE_FILTERS.length) {
        params.set("types", typesRef.current.join(","));
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logs?${params}`);
      if (!res.ok) {
        throw new Error("请求失败");
      }
      const data = (await res.json()) as LogsPage;
      if (requestRef.current !== requestId) return;
      cursorRef.current = data.next;
      hasMoreRef.current = data.hasMore;
      setTableData((current) => (initial ? data.rows : [...current, ...data.rows]));
      setError("");
    } catch (err) {
      if (requestRef.current === requestId && initial) {
        setError(err instanceof Error ? err.message : "加载失败");
      }
    } finally {
      if (requestRef.current === requestId) {
        if (initial) setLoading(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, []);

  function toggleType(type: PoolTransaction["type"]) {
    const next = typesRef.current.includes(type)
      ? typesRef.current.filter((item) => item !== type)
      : [...typesRef.current, type];
    typesRef.current = next;
    setSelectedTypes(next);
    cursorRef.current = null;
    hasMoreRef.current = false;
    setTableData([]);
    loadPage(true);
  }

  useEffect(() => {
    loadPage(true);
  }, [loadPage]);

  function onTableScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 120) return;
    loadPage(false);
  }

  return (
    <div>
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
        <h1 className="text-2xl font-bold mb-4 p-4">ETH/USDC</h1>
      </div>
      <h1 className="text-2xl font-bold mb-4">交易量</h1>
      <VolumeChart />

      <h1 className="text-2xl font-bold mb-4">交易</h1>
      {error ? <div className="p-4">{error}</div> : null}
      <div
        className="max-h-[480px] overflow-y-auto [&_[data-slot=table-container]]:overflow-visible"
        onScroll={onTableScroll}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-10 h-10 w-[100px] bg-white">时间</TableHead>
              <TableHead className="sticky top-0 z-10 h-10 overflow-visible bg-white">
                <TypeFilter selected={selectedTypes} onToggle={toggleType} />
              </TableHead>
              <TableHead className="sticky top-0 z-10 h-10 bg-white text-right">USD</TableHead>
              <TableHead className="sticky top-0 z-10 h-10 bg-white text-right">ETH</TableHead>
              <TableHead className="sticky top-0 z-10 h-10 bg-white text-right">USDC</TableHead>
              <TableHead className="sticky top-0 z-10 h-10 bg-white text-right">钱包地址</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.id} className="h-11">
                <TableCell>{formatTime(row.timestamp)}</TableCell>
                <TableCell className={row.type === "sell" || row.type === "burn" ? "text-red-500" : "text-green-600"}>
                  {typeLabel[row.type]}
                </TableCell>
                <TableCell className="text-right">{formatUsd(row.amount_usd)}</TableCell>
                <TableCell className="text-right">{formatToken(row.amount_eth)}</TableCell>
                <TableCell className="text-right">{formatToken(row.amount_usdc)}</TableCell>
                <TableCell className="text-right">{formatWallet(row.wallet)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && tableData.length === 0 ? <p className="p-4 text-sm text-gray-500">加载中…</p> : null}
        {!loading && !error && tableData.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">没有符合类型的交易</p>
        ) : null}
        {loadingMore ? <p className="py-3 text-center text-sm text-gray-500">加载更多…</p> : null}
      </div>
    </div>
  );
}