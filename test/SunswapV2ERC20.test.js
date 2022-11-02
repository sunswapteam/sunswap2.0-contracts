require('chai')
  .use(require('bn-chai')(web3.utils.BN))
  .use(require('chai-as-promised'))
  .should();
const { toBN, soliditySha3 } = require('web3-utils');
const { ecsign } = require('ethereumjs-util');

const {
  expandTo18Decimals,
  expectEmit,
  getDomainSeparator,
  MaxUint256,
  PERMIT_TYPEHASH,
  getApprovalDigest,
} = require('./shared/utilities');
const { pairFixture } = require('./shared/fixtures');
const { takeSnapshot, revertSnapshot } = require('./shared/ganacheHelper');

const ERC20 = artifacts.require('./ERC20');

const TOTAL_SUPPLY = expandTo18Decimals(10000);
const TEST_AMOUNT = expandTo18Decimals(10);

contract('SunswapV2ERC20', (accounts) => {
  const banker = accounts[0];
  // key of ganache generated account
  const privateKey =
    '0x573386a41d3fdef8fa700a8b3fb9a51c55b0cb4de9162a04a1265f65489ba1ac';
  const to = accounts[1];
  let token;
  // eslint-disable-next-line no-unused-vars
  let snapshotId;

  before(async () => {
    token = await ERC20.new(TOTAL_SUPPLY);
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot();
  });

  describe('#constructor', () => {
    it('public members', async () => {
      const name = await token.name();
      expect(name).to.be.equal('Sunswap V2');
      expect(await token.symbol()).to.be.equal('UNI-V2');
      expect((await token.decimals()).toString()).to.be.equal('18');
      expect((await token.totalSupply()).toString()).to.be.equal(
        TOTAL_SUPPLY.toString(),
      );
      expect((await token.balanceOf(banker)).toString()).to.be.equal(
        TOTAL_SUPPLY.toString(),
      );
      expect((await token.DOMAIN_SEPARATOR()).toString()).to.be.equal(
        getDomainSeparator(name, token.address).toString(),
      );
      expect((await token.PERMIT_TYPEHASH()).toString()).to.be.equal(
        PERMIT_TYPEHASH.toString(),
      );
    });
  });

  describe('#approve', () => {
    it('approve:success', async () => {
      const result = await token.approve(to, TEST_AMOUNT);
      expectEmit(result.logs[0], token, 'Approval', [banker, to, TEST_AMOUNT]);
      expect((await token.allowance(banker, to)).toString()).to.be.equal(
        TEST_AMOUNT.toString(),
      );
    });
  });

  describe('#transfer', () => {
    it('transfer:success', async () => {
      const result = await token.transfer(to, TEST_AMOUNT);
      expectEmit(result.logs[0], token, 'Transfer', [banker, to, TEST_AMOUNT]);
      expect((await token.balanceOf(banker)).toString()).to.be.equal(
        TOTAL_SUPPLY.sub(TEST_AMOUNT).toString(),
      );
      expect((await token.balanceOf(to)).toString()).to.be.equal(
        TEST_AMOUNT.toString(),
      );
    });

    it('transfer:fail', async () => {
      await token
        .transfer(to, TOTAL_SUPPLY.add(toBN(1)))
        .should.be.rejectedWith('ds-math-sub-underflow');
      await token
        .transfer(banker, 1, { from: to })
        .should.be.rejectedWith('ds-math-sub-underflow');
    });
  });

  describe('#transferFrom', () => {
    it('transferFrom:success', async () => {
      await token.approve(to, TEST_AMOUNT);
      const result = await token.transferFrom(banker, to, TEST_AMOUNT, {
        from: to,
      });
      expectEmit(result.logs[0], token, 'Transfer', [banker, to, TEST_AMOUNT]);
      expect((await token.allowance(banker, to)).toString()).to.be.equal('0');
      expect((await token.balanceOf(banker)).toString()).to.be.equal(
        TOTAL_SUPPLY.sub(TEST_AMOUNT).toString(),
      );
      expect((await token.balanceOf(to)).toString()).to.be.equal(
        TEST_AMOUNT.toString(),
      );
    });

    it('transferFrom:max', async () => {
      await token.approve(to, MaxUint256.toString());
      const result = await token.transferFrom(banker, to, TEST_AMOUNT, {
        from: to,
      });
      expectEmit(result.logs[0], token, 'Transfer', [banker, to, TEST_AMOUNT]);
      expect((await token.allowance(banker, to)).toString()).to.be.equal(
        MaxUint256.toString(),
      );
      expect((await token.balanceOf(banker)).toString()).to.be.equal(
        TOTAL_SUPPLY.sub(TEST_AMOUNT).toString(),
      );
      expect((await token.balanceOf(to)).toString()).to.be.equal(
        TEST_AMOUNT.toString(),
      );
    });
  });

  describe('#permit', () => {
    it('permit:success', async () => {
      const nonce = await token.nonces(banker);
      const deadline = MaxUint256;
      const digest = await getApprovalDigest(
        token,
        { owner: banker, spender: to, value: TEST_AMOUNT },
        nonce,
        deadline,
      );
      /*
      const { msg, hash, r, s, v } = web3.eth.accounts.sign(
        digest.slice(2).toString(),
        privateKey,
      );
      */
      // unsafe signature with out eth fixed prefix
      const { v, r, s } = ecsign(
        Buffer.from(digest.slice(2), 'hex'),
        Buffer.from(privateKey.slice(2), 'hex'),
      );

      const result = await token.permit(
        banker,
        to,
        TEST_AMOUNT,
        deadline,
        v,
        r,
        s,
      );
      expectEmit(result.logs[0], token, 'Approval', [banker, to, TEST_AMOUNT]);
      expect((await token.allowance(banker, to)).toString()).to.be.equal(
        TEST_AMOUNT.toString(),
      );
      expect((await token.nonces(banker)).toString()).to.be.equal('1');
    });
  });

  afterEach(async () => {
    await revertSnapshot(snapshotId.result);
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot();
  });
});
