"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import DataTable, { type Column } from "@/app/components/DataTable";
import Page from "@/app/components/Page";
import PaginationBar, { DEFAULT_PAGE_SIZE } from "@/app/components/Pagination";
import usePoolContract from "@/app/hooks/usePoolContract";
import PoolTokenBalance from "@/app/components/pollTokenBalance";
import { TickPrice, TickPriceRange } from "@/app/components/tickPrice";

type PoolRow = {
  id: string;
  pool: string;
  token0: string;
  token1: string;
  fee: string;
  tickLower: number;
  tickUpper: number;
  tick: number;
  sqrtPriceX96: bigint;
  liquidity: string;
};

const columns: Column<PoolRow>[] = [
  {
    header: "Token",
    cellClassName: "font-medium",
    cell: (row) => (
      <PoolTokenBalance pool={row.pool} token0={row.token0} token1={row.token1} />
    ),
  },
  {
    header: "Fee tier",
    cell: (row) => row.fee,
  },
  {
    header: "Set price range",
    cell: (row) => (
      <TickPriceRange
        pool={row.pool}
        token0={row.token0}
        token1={row.token1}
        tickLower={row.tickLower}
        tickUpper={row.tickUpper}
      />
    ),
  },
  {
    header: "Current price",
    cell: (row) => (
      <TickPrice
        pool={row.pool}
        token0={row.token0}
        token1={row.token1}
        tick={row.tick}
        sqrtPriceX96={row.sqrtPriceX96}
      />
    ),
  },
  {
    header: "Liquidity",
    headerClassName: "text-right",
    cellClassName: "text-right",
    cell: (row) => row.liquidity,
  },
];

export default function PoolPage() {
  const { poolData, error, isError, isLoading, isEmpty } = usePoolContract();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const rows: PoolRow[] = poolData.map((pool) => ({
    id: `${pool.pool}-${pool.index}`,
    pool: pool.pool,
    token0: pool.token0,
    token1: pool.token1,
    fee: pool.fee.toString(),
    tickLower: pool.tickLower,
    tickUpper: pool.tickUpper,
    tick: pool.tick,
    sqrtPriceX96: pool.sqrtPriceX96,
    liquidity: pool.liquidity.toString(),
  }));

  const total = rows.length;//总条数
  const totalPages = Math.max(1, Math.ceil(total / pageSize));//总页数
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);//分页后的数据
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const [poolType,setPoolType] = useState<string>("addPool");
  const addMyPool = () => {
    console.log("addMyPool");
  }
  const addPool = () => {
    setPoolType("addPool")
    console.log("addPool");
  }

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);//如果当前页数大于总页数，则设置为总页数
    }
  }, [page, totalPages]);
  return (
    <Page
      title="Pool"
      toolbar= {poolType === 'addPool' ? 'Pool List' : 'My Position'}
      actions={
        poolType === 'addPool' ?
          <>
            <Button variant="outline" onClick={() => setPoolType("myPosition")}>My Position</Button>
            <Button variant="default" onClick={() => addPool()}>Add Pool</Button>
          </>
          : 
          <>
          <Button variant="outline" onClick={() => setPoolType("addPool")}>Pool List</Button>
          <Button variant="default" onClick={() => addMyPool()}>Add</Button>
          </>
      }
    >
      {isLoading && <p>正在读取池子列表…</p>}
      {isError && (
        <p className="text-destructive">
          读取失败：
          {error?.message ??
            "getAllPools 调用 revert。请确认 .env.local 里是 PoolManager 合约地址，并已在 Sepolia 上部署。"}
        </p>
      )}
      {isEmpty && <p>当前还没有池子，先创建一个 Pool。</p>}
      {!isLoading && !isError && (
        <>
          <DataTable columns={columns} data={pagedRows} rowKey={(row) => row.id} />
          <PaginationBar
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </Page>
  );
}
