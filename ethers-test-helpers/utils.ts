import { BigNumber, ethers } from 'ethers'
import { UnitParser } from '../__test__/utils/UnitParser'

export function isBN(object: any) {
  return (
    ethers.BigNumber.isBigNumber(object) || object instanceof ethers.BigNumber
  )
}

export enum ParseNumberTypeEnum {
  DIRECT = 'DIRECT',
  ETHER = 'ETHER',
  BIGNUMBER = 'BIGNUMBER',
}

export type parseNumberOptionType = {
  type: ParseNumberTypeEnum
  decimal?: number
}

export function parseNumber(
  num: BigNumber | number,
  opt: parseNumberOptionType = {
    type: ParseNumberTypeEnum.DIRECT,
  },
) {
  if (isBN(num)) {
    try {
      switch (opt.type) {
        case ParseNumberTypeEnum.ETHER:
          return UnitParser.fromEther(num as BigNumber)
        case ParseNumberTypeEnum.BIGNUMBER:
          return UnitParser.fromBigNumber(num as BigNumber, opt.decimal ?? 18)
        case ParseNumberTypeEnum.DIRECT:
        default:
          return (num as ethers.BigNumber).toNumber()
      }
    } catch (err) {
      return UnitParser.fromEther(num as BigNumber)
    }
  } else {
    return num
  }
}
