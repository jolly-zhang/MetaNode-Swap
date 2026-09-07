export type PoolRow = {
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
    index: number;
  };

  export type PositionInfo ={
    id: number
    owner: string
    token0: string
    token1: string
    index: number
    fee: number
    liquidity: string
    tickLower: number
    tickUpper: number
    tokensOwed0: string
    tokensOwed1: string
    feeGrowthInside0LastX128: bigint
    feeGrowthInside1LastX128: bigint
  }

  export interface CollectEvent {
    owner: string;
    recipient: `0x${string}`;
    amount0: bigint;
    amount1: bigint;
  }
  
  export interface BurnEvent {
    owner: string;
    amount: bigint;
    amount0: bigint;
    amount1: bigint;
  }