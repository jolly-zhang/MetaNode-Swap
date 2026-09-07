"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import DataTable, { type Column } from "@/components/DataTable";
import Page from "@/components/Page";
import PaginationBar, { DEFAULT_PAGE_SIZE } from "@/components/Pagination";
import { usePoolContract, usePositionContract } from "@/hooks/usePoolContract";
import PoolTokenBalance from "@/components/pollTokenBalance";
import { TickPrice, TickPriceRange } from "@/components/tickPrice";
import { PoolRow, PositionInfo } from "@/types";
import AddPoolDialog from "@/components/AddPoolDialog";
import AddPositionDialog from "@/components/AddPositionDialog";
import PositionTokenBalance, { PositionStatus, PositionTokensOwed } from "@/components/positionTokenBalance";
import PositionActions from "@/components/PositionActions";

const createPoolColumns = (
  onAddPosition: (row: PoolRow) => void,
): Column<PoolRow>[] => [
  {
    header: "Token",
    cellClassName: "font-medium",
    cell: (row) => (
      <PoolTokenBalance pool={row.pool} token0={row.token0} token1={row.token1} />
    ),
  },
  {
    header: "Fee tier",
    cell: (row) => `${Number(row.fee) / 10000}%`,
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
    cell: (row) => row.liquidity,
  },
  {
    header: "Action",
    headerClassName: "text-center",
    cellClassName: "text-right sticky right-0 bg-white",
    cell: (row) => (
      <Button variant="outline" onClick={() => onAddPosition(row)}>
        Add My Position
      </Button>
    ),
  },
];
const positionColumns: Column<PositionInfo>[] = [
  {
    header: "Id",
    cellClassName: "font-medium",
    cell: (row) => (row.id.toString()),
  },
  // {
  //   header: "Owner",
  //   cellClassName: "font-medium",
  //   cell: (row) => (row.owner),
  // },
  {
    header: "Token0/Token1",
    cellClassName: "font-medium",
    cell: (row) => (
      <PositionTokenBalance
        token0={row.token0}
        token1={row.token1}
        tickLower={row.tickLower}
        tickUpper={row.tickUpper}
        index={row.index}
        liquidity={row.liquidity}
        fee={row.fee}
      />),
  },
  {
    header: "Fee",
    cellClassName: "font-medium",
    cell: (row) => (`${Number(row.fee) / 10000}%`),
  },
  {
    header: "Liquidity",
    cellClassName: "font-medium",
    cell: (row) => (row.liquidity.toString()),
  },
  {
    header: "Tick Lower/Tick Upper",
    cellClassName: "font-medium",
    cell: (row) => (
      <TickPriceRange
        pool={row.token0}
        token0={row.token0}
        token1={row.token1}
        tickLower={row.tickLower}
        tickUpper={row.tickUpper}
      />
    ),
  },

  {
    header: "Tokens Owed0/Tokens Owed1",
    cellClassName: "font-medium",
    cell: (row) => (
      <PositionTokensOwed
        token0={row.token0}
        token1={row.token1}
        tokensOwed0={row.tokensOwed0}
        tokensOwed1={row.tokensOwed1}
      />
    ),
  },
  {
    header: "Status",
    cellClassName: "font-medium",
    cell: (row) => (
      <PositionStatus
        token0={row.token0}
        token1={row.token1}
        tickLower={row.tickLower}
        tickUpper={row.tickUpper}
        index={row.index}
        fee={row.fee}
      />
    ),
  },
  {
    header: "Action",
    headerClassName: "text-center",
    cellClassName: "text-right sticky right-0 bg-white",
    cell: (row) => <PositionActions positionId={row.id} />,
  }
];

export default function PoolPage() {
  const { poolData, error, isError, isLoading, isEmpty, refetch } = usePoolContract();
  const { positionData, error: positionError, isError: positionIsError, isLoading: positionIsLoading, isEmpty: positionIsEmpty, refetch: positionRefetch } = usePositionContract();
  console.log(poolData, positionData, positionError, positionIsError, positionIsLoading)

  //初始化池子列表
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
    index: Number(pool.index),
  }));

  const positionRows: PositionInfo[] = positionData.map((position) => ({
    id: position.id,
    owner: position.owner,
    token0: position.token0,
    token1: position.token1,
    index: position.index,
    fee: position.fee,
    liquidity: position.liquidity.toString(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    tokensOwed0: position.tokensOwed0.toString(),//已经赚取，但是尚未领取的手续费的余额
    tokensOwed1: position.tokensOwed1.toString(),
    feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
    feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
  }));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const total = rows.length;//总条数
  const totalPages = Math.max(1, Math.ceil(total / pageSize));//总页数
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);//分页后的数据
  const positionPagedRows = positionRows.slice((page - 1) * pageSize, page * pageSize);//分页后的数据
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const [poolType, setPoolType] = useState<string>("addPool");
  const [openAddPoolDialog, setOpenAddPoolDialog] = useState(false);
  const [openAddMyPositionDialog, setOpenAddMyPositionDialog] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolRow | null>(null);

  const columns = createPoolColumns((row) => {
    setSelectedPool(row);
    setOpenAddMyPositionDialog(true);
  }); 

  const addPool = () => {
    setPoolType("addPool")
    setOpenAddPoolDialog(true);
    console.log("addPool");
  }

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);//如果当前页数大于总页数，则设置为总页数
    }
  }, [page, totalPages]);



  if (poolType === 'addPool') {
    return (
      <Page
        title="Pool"
        toolbar="Pool List"
        actions={
          <>
            <Button variant="outline" onClick={() => setPoolType("myPosition")}>My Position</Button>
            <Button variant="default" onClick={() => addPool()}>Add Pool</Button>
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
        <AddPoolDialog
          open={openAddPoolDialog}
          onOpenChange={setOpenAddPoolDialog}
          onCreated={() => {
            void refetch();
          }}
        />
        <AddPositionDialog
          open={openAddMyPositionDialog}
          onOpenChange={(next) => {
            setOpenAddMyPositionDialog(next);
            if (!next) setSelectedPool(null);
          }}
          pool={selectedPool}
          onCreated={() => {
            void positionRefetch();
          }}
        />
      </Page>
      
    )
  } else {
    return (
      <Page
        title="Pool"
        toolbar="My Position"
        actions={
          <>
            <Button variant="outline" onClick={() => setPoolType("addPool")}>Pool List</Button>
          </>
        }
      >
        {positionIsLoading && <p>正在读取池子列表…</p>}
        {positionIsError && (
          <p className="text-destructive">
            读取失败：
            {error?.message ??
              "getAllPools 调用 revert。请确认 .env.local 里是 PoolManager 合约地址，并已在 Sepolia 上部署。"}
          </p>
        )}
        {positionIsEmpty && <p>当前还没有池子，先创建一个 Pool。</p>}
        {!positionIsLoading && !positionIsError && (
          <>
            <DataTable columns={positionColumns} data={positionPagedRows} rowKey={(row) => row.id.toString()} />
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
    )
  }

}
