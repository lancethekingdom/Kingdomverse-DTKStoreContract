import { BigNumber, ethers } from 'ethers'
import { UnitParser } from '../__test__/utils/UnitParser'

export function isBN(object: any) {
  return (
    ethers.BigNumber.isBigNumber(object) || object instanceof ethers.BigNumber
  )
}

export function parseNumber(num: BigNumber | number) {
  if (isBN(num)) {
    try {
      const parsed = (num as ethers.BigNumber).toNumber()
      return parsed
    } catch (err) {
      const parsed = UnitParser.fromEther(num as BigNumber)
      return parsed
    }
  } else {
    return num
  }
}
