import { JsonRpcProvider } from '@ethersproject/providers'

export async function getLastBlock(provider: JsonRpcProvider) {
    return await provider.getBlock('latest')
}