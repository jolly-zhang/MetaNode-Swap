export const quoterAbi = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint32[]", "name": "indexPath", "type": "uint32[]" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct IQuoter.QuoteExactInputParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "quoteExactInput",
    "outputs": [
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint32[]", "name": "indexPath", "type": "uint32[]" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct IQuoter.QuoteExactOutputParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "quoteExactOutput",
    "outputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;