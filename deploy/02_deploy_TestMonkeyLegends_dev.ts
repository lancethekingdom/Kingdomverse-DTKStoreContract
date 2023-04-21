import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre as any
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const testking = await deploy('TestMonkeyLegends', {
    from: deployer,
    args: [],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  })

  console.log(
    `Test Monkey Legends has been deployed to ${network.name} at ${testking.address} with ${testking.gasEstimates} gas`,
  )
}

func.tags = ['development']

export default func
