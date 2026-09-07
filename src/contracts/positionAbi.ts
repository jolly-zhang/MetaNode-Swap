export const POSITION_MANAGER_ABI = [
  {
    inputs: [],
    name: "getAllPositions",
    outputs: [
      {
        components: [
          { name: "id", type: "uint32" },
          { name: "owner", type: "address" },
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "index", type: "uint32" },
          { name: "fee", type: "uint24" },
          { name: "liquidity", type: "uint128" },
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "tokensOwed0", type: "uint256" },
          { name: "tokensOwed1", type: "uint256" },
          { name: "feeGrowthInside0LastX128", type: "uint256" },
          { name: "feeGrowthInside1LastX128", type: "uint256" },
        ],
        name: "positionInfo",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "positionId", type: "uint256" }],
    name: "burn",
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "positionId", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    name: "collect",
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "index", type: "uint32" },
          { name: "amount0Desired", type: "uint256" },
          { name: "amount1Desired", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    name: "mint",
    outputs: [
      { name: "positionId", type: "uint256" },
      { name: "liquidity", type: "uint128" },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
] as const
