var router = artifacts.require("./SunswapV2Router02.sol");

const factory = artifacts.require("./SunswapV2Factory.sol")
const weth = 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a' 

module.exports = function(deployer) {
  deployer.deploy(router, factory.address, weth);
};
