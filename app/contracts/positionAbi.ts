export const POSITION_MANAGER_ABI = [
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'getPositionInfo',
    outputs: [
      {
        components: [
          { name: 'owner', type: 'address' },
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'index', type: 'uint32' },
          { name: 'fee', type: 'uint24' },
          { name: 'liquidity', type: 'uint128' },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'tokensOwed0', type: 'uint256' },
          { name: 'tokensOwed1', type: 'uint256' },
        ],
        type: 'tuple',
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
