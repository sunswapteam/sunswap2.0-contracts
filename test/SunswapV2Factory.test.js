require('chai')
  .use(require('bn-chai')(web3.utils.BN))
  .use(require('chai-as-promised'))
  .should();
const { toBN } = require('web3-utils');
const { expectEmit, getCreate2Address } = require('./shared/utilities');
const { factoryFixture } = require('./shared/fixtures');
const { takeSnapshot, revertSnapshot } = require('./shared/ganacheHelper');

const SunswapV2Pair = artifacts.require('./SunswapV2Pair');

const AddressZero = '0x0000000000000000000000000000000000000000';

contract('SunswapV2Factory', (accounts) => {
  const banker = accounts[0];
  const feeTo = accounts[1];
  const feeToSetter = accounts[2];
  let factory;
  // eslint-disable-next-line no-unused-vars
  let snapshotId;

  beforeEach(async () => {
    const fixture = await factoryFixture(banker);
    factory = fixture.factory;
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot();
  });

  describe('#constructor', () => {
    it('feeTo, feeToSetter, allPairsLength', async () => {
      expect(await factory.feeTo()).to.be.equal(AddressZero);
      expect(await factory.feeToSetter()).to.be.equal(banker);
      expect((await factory.allPairsLength()).toNumber()).to.be.equal(0);
    });
  });

  describe('#createPair', () => {
    const TEST_ADDRESSES = [
      '0x1000000000000000000000000000000000000000',
      '0x2000000000000000000000000000000000000000',
    ];
    async function createPair(tokens) {
      const bytecode = SunswapV2Pair.bytecode;
      const create2Address = getCreate2Address(
        factory.address,
        tokens,
        bytecode,
      );
      const result = await factory.createPair(...tokens);
      expectEmit(result.logs[0], factory, 'PairCreated', [
        TEST_ADDRESSES[0],
        TEST_ADDRESSES[1],
        create2Address,
        toBN(1),
      ]);

      await factory
        .createPair(...tokens)
        .should.be.rejectedWith('SunswapV2: PAIR_EXISTS');
      await factory
        .createPair(...tokens.slice().reverse())
        .should.be.rejectedWith('SunswapV2: PAIR_EXISTS');
      expect(await factory.getPair(...tokens)).to.be.equal(create2Address);
      expect(await factory.getPair(...tokens.slice().reverse())).to.be.equal(
        create2Address,
      );
      expect(await factory.allPairs(0)).to.be.equal(create2Address);
      expect((await factory.allPairsLength()).toNumber()).to.be.equal(1);

      const pair = await SunswapV2Pair.at(create2Address);
      expect(await pair.factory()).to.be.equal(factory.address);
      expect(await pair.token0()).to.be.equal(TEST_ADDRESSES[0]);
      expect(await pair.token1()).to.be.equal(TEST_ADDRESSES[1]);
    }

    it('createPair', async () => {
      await createPair(TEST_ADDRESSES);
    });

    it('createPair:reverse', async () => {
      await createPair(TEST_ADDRESSES.slice().reverse());
    });

    it('createPair:gas [ @skip-on-coverage ]', async () => {
      const result = await factory.createPair(...TEST_ADDRESSES);
      expect(result.receipt.gasUsed.toString()).to.be.equal('1985740');
    });
  });

  describe('#setFeeTo', () => {
    it('setFeeTo:FORBIDDEN', async () => {
      await factory
        .setFeeTo(feeTo, { from: feeTo })
        .should.be.rejectedWith('SunswapV2: FORBIDDEN');
    });

    it('setFeeTo:success', async () => {
      await factory.setFeeTo(feeTo, { from: banker });
      expect(await factory.feeTo()).to.be.equal(feeTo);
    });
  });

  describe('setFeeToSetter', () => {
    it('setFeeToSetter:FORBIDDEN', async () => {
      await factory
        .setFeeToSetter(feeToSetter, { from: feeToSetter })
        .should.be.rejectedWith('SunswapV2: FORBIDDEN');
    });
    it('setFeeToSetter:success', async () => {
      await factory.setFeeToSetter(feeToSetter, { from: banker });
      expect(await factory.feeToSetter()).to.be.equal(feeToSetter);
      await factory
        .setFeeToSetter(banker, { from: banker })
        .should.be.rejectedWith('SunswapV2: FORBIDDEN');
    });
  });

  afterEach(async () => {
    await revertSnapshot(snapshotId.result);
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot();
  });
});
