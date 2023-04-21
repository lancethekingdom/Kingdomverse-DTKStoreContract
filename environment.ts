import { cleanEnv, str } from 'envalid'

// @ts-ignore
export const env = cleanEnv(process.env, {
  INFURA_API_KEY: str({ default: '' }),
  ROOT_WALLET_PRIVATE_KEY: str({
    default: '',
  }),
  ETHERSCAN_API_KEY: str({
    default: 'EBPDPC9MPZ7CBVHGYRGSSYE1CMSPKCNCB2',
  }),
})
