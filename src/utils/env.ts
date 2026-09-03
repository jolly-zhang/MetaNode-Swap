import { type Address, isAddress, zeroAddress } from "viem";

const rawAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const rawPositionAddress =
  process.env.NEXT_PUBLIC_POSITION_MANAGER_ADDRESS ?? "";
const rawSwapRouterAddress =
  process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS ?? "";

export const SwapContractAddress: Address = isAddress(rawAddress)
  ? rawAddress
  : zeroAddress;

export const PositionManagerAddress: Address = isAddress(rawPositionAddress)
  ? rawPositionAddress
  : zeroAddress;

export const SwapRouterAddress: Address = isAddress(rawSwapRouterAddress)
  ? rawSwapRouterAddress
  : zeroAddress;
