var factory = artifacts.require('./SunswapV2Factory.sol');

const feeToSetter = 'TD8yz5cppxLgNPGKK87L4YCgUTvoxwMUox';

module.exports = function (deployer, network) {
  if (network == 'nile') deployer.deploy(factory, feeToSetter);
};
