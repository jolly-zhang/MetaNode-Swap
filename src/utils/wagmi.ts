import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import {sepolia} from 'wagmi/chains';

const ProjectId = 'e3242412afd6123ce1dda1de23a8c016'

export const config = getDefaultConfig({
  appName: 'Meta Node Stake',
  ssr: true,
  projectId: ProjectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://sepolia.infura.io/v3/d8ed0bd1de8242d998a1405b6932ab33'),
  },
})