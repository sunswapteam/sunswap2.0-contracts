require('chai')
  .use(require('bn-chai')(web3.utils.BN))
  .use(require('chai-as-promised'))
  .should();
const { toBN } = require('web3-utils');
const {
  expandTo18Decimals,
  encodePrice,
  expectEmit,
} = require('./shared/utilities');
const { pairFixture } = require('./shared/fixtures');
const {
  takeSnapshot,
  revertSnapshot,
  mineBlock,
} = require('./shared/ganacheHelper');

const MINIMUM_LIQUIDITY = toBN(10).pow(toBN(3));
const AddressZero = '0x0000000000000000000000000000000000000000';

contract('SunswapV2Pair', (accounts) => {
  const banker = accounts[0];
  const feeTo = accounts[1];
  let factory;
  let token0;
  let token1;
  let pair;
  // eslint-disable-next-line no-unused-vars
  let snapshotId;

  before(async () => {
    const fixture = await pairFixture(banker);
    factory = fixture.factory;
    token0 = fixture.token0;
    token1 = fixture.token1;
    pair = fixture.pair;
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot();
  });

  describe('#mint', () => {
    it('mint:success', async () => {
      const token0Amount = expandTo18Decimals(1);
      const token1Amount = expandTo18Decimals(4);
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, token1Amount);

      const expectedLiquidity = expandTo18Decimals(2);
      const result = await pair.mint(banker);
      expect(result.logs).to.have.lengthOf(4);
      expectEmit(result.logs[0], pair, 'Transfer', [
        AddressZero,
        AddressZero,
        MINIMUM_LIQUIDITY,
      ]);
      expectEmit(result.logs[1], pair, 'Transfer', [
        AddressZero,
        banker,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      ]);
      expectEmit(result.logs[2], pair, 'Sync', [token0Amount, token1Amount]);
      expectEmit(result.logs[3], pair, 'Mint', [
        banker,
        token0Amount,
        token1Amount,
      ]);
      expect((await pair.totalSupply()).toString()).to.be.equal(
        expectedLiquidity.toString(),
      );
      expect((await pair.balanceOf(banker)).toString()).to.be.equal(
        expectedLiquidity.sub(MINIMUM_LIQUIDITY).toString(),
      );
      expect((await token0.balanceOf(pair.address)).toString()).to.be.equal(
        token0Amount.toString(),
      );
      expect((await token1.balanceOf(pair.address)).toString()).to.be.equal(
        token1Amount.toString(),
      );
      const reserves = await pair.getReserves();
      expect(reserves[0].toString()).to.be.equal(token0Amount.toString());
      expect(reserves[1].toString()).to.be.equal(token1Amount.toString());
    });
  });

  async function addLiquidity(token0Amount, token1Amount) {
    await token0.transfer(pair.address, token0Amount);
    await token1.transfer(pair.address, token1Amount);
    await pair.mint(banker);
  }

  describe('#swap', () => {
    const swapTestCases = [
      [1, 5, 10, '1662497915624478906'],
      [1, 10, 5, '453305446940074565'],

      [2, 5, 10, '2851015155847869602'],
      [2, 10, 5, '831248957812239453'],

      [1, 10, 10, '906610893880149131'],
      [1, 100, 100, '987158034397061298'],
      [1, 1000, 1000, '996006981039903216'],
    ].map((a) =>
      a.map((n) => (typeof n === 'string' ? toBN(n) : expandTo18Decimals(n))),
    );
    swapTestCases.forEach((swapTestCase, i) => {
      it(`getInputPrice:${i}`, async () => {
        const [swapAmount, token0Amount, token1Amount, expectedOutputAmount] =
          swapTestCase;
        await addLiquidity(token0Amount, token1Amount);
        await token0.transfer(pair.address, swapAmount);
        await pair
          .swap(0, expectedOutputAmount.add(toBN(1)), banker, '0x')
          .should.be.rejectedWith('SunswapV2: K');
        await pair.swap(0, expectedOutputAmount, banker, '0x');
      });
    });
    const optimisticTestCases = [
      ['997000000000000000', 5, 10, 1], // given amountIn, amountOut = floor(amountIn * .997)
      ['997000000000000000', 10, 5, 1],
      ['997000000000000000', 5, 5, 1],
      [1, 5, 5, '1003009027081243732'], // given amountOut, amountIn = ceiling(amountOut / .997)
    ].map((a) =>
      a.map((n) => (typeof n === 'string' ? toBN(n) : expandTo18Decimals(n))),
    );
    optimisticTestCases.forEach((optimisticTestCase, i) => {
      it(`optimistic:${i}`, async () => {
        const [outputAmount, token0Amount, token1Amount, inputAmount] =
          optimisticTestCase;
        await addLiquidity(token0Amount, token1Amount);
        await token0.transfer(pair.address, inputAmount);
        await pair
          .swap(outputAmount.add(toBN(1)), 0, banker, '0x')
          .should.be.rejectedWith('SunswapV2: K');
        await pair.swap(outputAmount, 0, banker, '0x');
      });
    });

    it('swap:token0', async () => {
      const token0Amount = expandTo18Decimals(5);
      const token1Amount = expandTo18Decimals(10);
      await addLiquidity(token0Amount, token1Amount);

      const swapAmount = expandTo18Decimals(1);
      const expectedOutputAmount = toBN('1662497915624478906');
      await token0.transfer(pair.address, swapAmount);
      const result = await pair.swap(0, expectedOutputAmount, banker, '0x');
      expect(result.logs).to.have.lengthOf(3);
      expectEmit(result.logs[0], token1, 'Transfer', [
        pair.address,
        banker,
        expectedOutputAmount,
      ]);
      expectEmit(result.logs[1], pair, 'Sync', [
        token0Amount.add(swapAmount),
        token1Amount.sub(expectedOutputAmount),
      ]);
      expectEmit(result.logs[2], pair, 'Swap', [
        banker,
        swapAmount,
        0,
        0,
        expectedOutputAmount,
        banker,
      ]);
      const reserves = await pair.getReserves();
      expect(reserves[0].toString()).to.be.equal(
        token0Amount.add(swapAmount).toString(),
      );
      expect(reserves[1].toString()).to.be.equal(
        token1Amount.sub(expectedOutputAmount).toString(),
      );
      expect((await token0.balanceOf(pair.address)).toString()).to.be.equal(
        token0Amount.add(swapAmount).toString(),
      );
      expect((await token1.balanceOf(pair.address)).toString()).to.be.equal(
        token1Amount.sub(expectedOutputAmount).toString(),
      );
      const totalSupplyToken0 = await token0.totalSupply();
      const totalSupplyToken1 = await token1.totalSupply();
      expect((await token0.balanceOf(banker)).toString()).to.be.equal(
        totalSupplyToken0.sub(token0Amount).sub(swapAmount).toString(),
      );
      expect((await token1.balanceOf(banker)).toString()).to.be.equal(
        totalSupplyToken1
          .sub(token1Amount)
          .add(expectedOutputAmount)
          .toString(),
      );
    });

    it('swap:token1', async () => {
      const token0Amount = expandTo18Decimals(5);
      const token1Amount = expandTo18Decimals(10);
      await addLiquidity(token0Amount, token1Amount);

      const swapAmount = expandTo18Decimals(1);
      const expectedOutputAmount = toBN('453305446940074565');
      await token1.transfer(pair.address, swapAmount);
      const result = await pair.swap(expectedOutputAmount, 0, banker, '0x');
      expect(result.logs).to.have.lengthOf(3);
      expectEmit(result.logs[0], token0, 'Transfer', [
        pair.address,
        banker,
        expectedOutputAmount,
      ]);
      expectEmit(result.logs[1], pair, 'Sync', [
        token0Amount.sub(expectedOutputAmount),
        token1Amount.add(swapAmount),
      ]);
      expectEmit(result.logs[2], pair, 'Swap', [
        banker,
        0,
        swapAmount,
        expectedOutputAmount,
        0,
        banker,
      ]);
      const reserves = await pair.getReserves();
      expect(reserves[0].toString()).to.be.equal(
        token0Amount.sub(expectedOutputAmount).toString(),
      );
      expect(reserves[1].toString()).to.be.equal(
        token1Amount.add(swapAmount).toString(),
      );
      expect((await token0.balanceOf(pair.address)).toString()).to.be.equal(
        token0Amount.sub(expectedOutputAmount).toString(),
      );
      expect((await token1.balanceOf(pair.address)).toString()).to.be.equal(
        token1Amount.add(swapAmount).toString(),
      );
      const totalSupplyToken0 = await token0.totalSupply();
      const totalSupplyToken1 = await token1.totalSupply();
      expect((await token0.balanceOf(banker)).toString()).to.be.equal(
        totalSupplyToken0
          .sub(token0Amount)
          .add(expectedOutputAmount)
          .toString(),
      );
      expect((await token1.balanceOf(banker)).toString()).to.be.equal(
        totalSupplyToken1.sub(token1Amount).sub(swapAmount).toString(),
      );
    });

    it('swap:gas [ @skip-on-coverage ]', async () => {
      const token0Amount = expandTo18Decimals(5);
      const token1Amount = expandTo18Decimals(10);
      await addLiquidity(token0Amount, token1Amount);
      // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
      await mineBlock((await web3.eth.getBlock('latest', true)).timestamp + 1);
      await pair.sync();
      const swapAmount = expandTo18Decimals(1);
      const expectedOutputAmount = toBN('453305446940074565');
      await token1.transfer(pair.address, swapAmount);
      await mineBlock((await web3.eth.getBlock('latest', true)).timestamp + 1);
      const result = await pair.swap(expectedOutputAmount, 0, banker, '0x');
      expect(result.receipt.gasUsed.toString()).to.be.equal('73912');
    });

    it('price{0,1}CumulativeLast', async () => {
      const token0Amount = expandTo18Decimals(3);
      const token1Amount = expandTo18Decimals(3);
      await addLiquidity(token0Amount, token1Amount);

      const blockTimestamp = (await pair.getReserves())[2].toNumber();
      await mineBlock(blockTimestamp + 1);
      await pair.sync();

      const initialPrice = encodePrice(token0Amount, token1Amount);
      expect((await pair.price0CumulativeLast()).toString()).to.be.equal(
        initialPrice[0].toString(),
      );
      expect((await pair.price1CumulativeLast()).toString()).to.be.equal(
        initialPrice[1].toString(),
      );
      expect((await pair.getReserves())[2].toNumber()).to.be.equal(
        blockTimestamp + 1,
      );

      const swapAmount = expandTo18Decimals(3);
      await token0.transfer(pair.address, swapAmount);
      await mineBlock(blockTimestamp + 10);
      // swap to a new price eagerly instead of syncing
      await pair.swap(0, expandTo18Decimals(1), banker, '0x'); // make the price nice
      expect((await pair.price0CumulativeLast()).toString()).to.be.equal(
        initialPrice[0].mul(toBN(10)).toString(),
      );
      expect((await pair.price1CumulativeLast()).toString()).to.be.equal(
        initialPrice[1].mul(toBN(10)).toString(),
      );
      expect((await pair.getReserves())[2].toNumber()).to.be.equal(
        blockTimestamp + 10,
      );
      await mineBlock(blockTimestamp + 20);
      await pair.sync();
      const newPrice = encodePrice(
        expandTo18Decimals(6),
        expandTo18Decimals(2),
      );
      expect((await pair.price0CumulativeLast()).toString()).to.be.equal(
        initialPrice[0]
          .mul(toBN(10))
          .add(newPrice[0].mul(toBN(10)))
          .toString(),
      );
      expect((await pair.price1CumulativeLast()).toString()).to.be.equal(
        initialPrice[1]
          .mul(toBN(10))
          .add(newPrice[1].mul(toBN(10)))
          .toString(),
      );
      expect((await pair.getReserves())[2].toNumber()).to.be.equal(
        blockTimestamp + 20,
      );
    });
  });

  describe('#burn', () => {
    it('burn:success', async () => {
      const token0Amount = expandTo18Decimals(3);
      const token1Amount = expandTo18Decimals(3);
      await addLiquidity(token0Amount, token1Amount);

      const expectedLiquidity = expandTo18Decimals(3);
      await pair.transfer(
        pair.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      );
      const result = await pair.burn(banker);
      expect(result.logs).to.have.lengthOf(5);
      expectEmit(result.logs[0], pair, 'Transfer', [
        pair.address,
        AddressZero,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      ]);
      expectEmit(result.logs[1], token0, 'Transfer', [
        pair.address,
        banker,
        token0Amount.sub(toBN(1000)),
      ]);
      expectEmit(result.logs[2], token1, 'Transfer', [
        pair.address,
        banker,
        token1Amount.sub(toBN(1000)),
      ]);
      expectEmit(result.logs[3], pair, 'Sync', [1000, 1000]);
      expectEmit(result.logs[4], pair, 'Burn', [
        banker,
        token0Amount.sub(toBN(1000)),
        token1Amount.sub(toBN(1000)),
        banker,
      ]);
      expect((await pair.balanceOf(banker)).toString()).to.be.equal('0');
      expect((await pair.totalSupply()).toString()).to.be.equal(
        MINIMUM_LIQUIDITY.toString(),
      );
      expect((await token0.balanceOf(pair.address)).toString()).to.be.equal(
        '1000',
      );
      expect((await token1.balanceOf(pair.address)).toString()).to.be.equal(
        '1000',
      );
      const totalSupplyToken0 = await token0.totalSupply();
      const totalSupplyToken1 = await token1.totalSupply();
      expect((await token0.balanceOf(banker)).toString()).to.be.equal(
        totalSupplyToken0.sub(toBN(1000)).toString(),
      );
      expect((await token1.balanceOf(banker)).toString()).to.be.equal(
        totalSupplyToken1.sub(toBN(1000)).toString(),
      );
    });
  });

  describe('#feeTo', () => {
    it('feeTo:off', async () => {
      const token0Amount = expandTo18Decimals(1000);
      const token1Amount = expandTo18Decimals(1000);
      await addLiquidity(token0Amount, token1Amount);

      const swapAmount = expandTo18Decimals(1);
      const expectedOutputAmount = toBN('996006981039903216');
      await token1.transfer(pair.address, swapAmount);
      await pair.swap(expectedOutputAmount, 0, banker, '0x');

      const expectedLiquidity = expandTo18Decimals(1000);
      await pair.transfer(
        pair.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      );
      await pair.burn(banker);
      expect((await pair.totalSupply()).toString()).to.be.equal(
        MINIMUM_LIQUIDITY.toString(),
      );
    });

    it('feeTo:on', async () => {
      await factory.setFeeTo(feeTo);

      const token0Amount = expandTo18Decimals(1000);
      const token1Amount = expandTo18Decimals(1000);
      await addLiquidity(token0Amount, token1Amount);

      const swapAmount = expandTo18Decimals(1);
      const expectedOutputAmount = toBN('996006981039903216');
      await token1.transfer(pair.address, swapAmount);
      await pair.swap(expectedOutputAmount, 0, banker, '0x');

      const expectedLiquidity = expandTo18Decimals(1000);
      await pair.transfer(
        pair.address,
        expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      );
      await pair.burn(banker);
      expect((await pair.totalSupply()).toString()).to.be.equal(
        MINIMUM_LIQUIDITY.add(toBN('249750499251388')).toString(),
      );
      expect((await pair.balanceOf(feeTo)).toString()).to.be.equal(
        '249750499251388',
      );

      // using 1000 here instead of the symbolic MINIMUM_LIQUIDITY because the amounts only happen to be equal...
      // ...because the initial liquidity amounts were equal
      expect((await token0.balanceOf(pair.address)).toString()).to.be.equal(
        toBN(1000).add(toBN('249501683697445')).toString(),
      );
      expect((await token1.balanceOf(pair.address)).toString()).to.be.equal(
        toBN(1000).add(toBN('250000187312969')).toString(),
      );
    });
  });

  afterEach(async () => {
    await revertSnapshot(snapshotId.result);
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot();
  });
});
