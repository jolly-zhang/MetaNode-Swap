import { type Address, isAddress, zeroAddress } from "viem";

const rawAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const rawPositionAddress =
  process.env.NEXT_PUBLIC_POSITION_MANAGER_ADDRESS ?? "";

export const SwapContractAddress: Address = isAddress(rawAddress)
  ? rawAddress
  : zeroAddress;

export const PositionManagerAddress: Address = isAddress(rawPositionAddress)
  ? rawPositionAddress
  : zeroAddress;
