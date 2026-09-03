// Factory 合约地址（根据你的部署填写）
export const FACTORY_ADDRESS = '0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B';

// Factory 合约 ABI
export const FACTORY_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'sqrtPriceX96', type: 'uint160' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'createAndInitializePoolIfNecessary',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'payable',
    type: 'function',
  },
  // 查询池子是否存在的函数（如果有）
  // {
  //   inputs: [
  //     { name: 'token0', type: 'address' },
  //     { name: 'token1', type: 'address' },
  //     { name: 'fee', type: 'uint24' },
  //   ],
  //   name: 'getPool',
  //   outputs: [{ name: 'pool', type: 'address' }],
  //   stateMutability: 'view',
  //   type: 'function',
  // }
] as const;