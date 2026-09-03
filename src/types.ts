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
  };