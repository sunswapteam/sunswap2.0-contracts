const { expandTo18Decimals } = require('./utilities');

const ERC20 = artifacts.require('./ERC20');
const SunswapV2Factory = artifacts.require('./SunswapV2Factory');
const SunswapV2Pair = artifacts.require('./SunswapV2Pair');

async function factoryFixture(banker) {
  const factory = await SunswapV2Factory.new(banker);
  return { factory };
}

async function pairFixture(banker) {
  const { factory } = await factoryFixture(banker);

  const tokenA = await ERC20.new(expandTo18Decimals(10000));
  const tokenB = await ERC20.new(expandTo18Decimals(10000));

  await factory.createPair(tokenA.address, tokenB.address);
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
  const pair = await SunswapV2Pair.at(pairAddress);

  const token0Address = await pair.token0();
  const token0 = tokenA.address === token0Address ? tokenA : tokenB;
  const token1 = tokenA.address === token0Address ? tokenB : tokenA;

  return { factory, token0, token1, pair };
}

module.exports = {
  factoryFixture,
  pairFixture,
};
