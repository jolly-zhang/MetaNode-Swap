export const SWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "indexPath", type: "uint32[]" },
          { name: "amountIn", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    name: "quoteExactInput",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "indexPath", type: "uint32[]" },
          { name: "amount", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    name: "quoteExactOutput",
    outputs: [{ name: "amountIn", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
