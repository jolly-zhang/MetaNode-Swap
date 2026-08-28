export const POOL_MANAGER_ABI = [
  {
    inputs: [],
    name: "getAllPools",
    outputs: [
      {
        name: "poolsInfo",
        type: "tuple[]",
        components: [
          { name: "pool", type: "address" },
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "index", type: "uint32" },
          { name: "fee", type: "uint24" },
          { name: "feeProtocol", type: "uint8" },
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "tick", type: "int24" },
          { name: "sqrtPriceX96", type: "uint160" },
          { name: "liquidity", type: "uint128" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
