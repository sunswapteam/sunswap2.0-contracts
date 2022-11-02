require('chai')
  .use(require('bn-chai')(web3.utils.BN))
  .use(require('chai-as-promised'))
  .should();

const {
  toBN,
  toChecksumAddress,
  keccak256,
  soliditySha3,
} = require('web3-utils');
const abi = require('web3-eth-abi');

const MaxUint256 = toBN(2).pow(toBN(256)).sub(toBN(1));
const PERMIT_TYPEHASH = keccak256(
  'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)',
);

function expectEmit(log, contract, name, args) {
  expect(log.address).to.be.equal(contract.address);
  expect(log.event).to.be.equal(name);
  expect(log.args.__length__).to.be.equal(args.length);
  for (let i = 0; i < args.length; i++) {
    expect(log.args[i].toString()).to.be.equal(args[i].toString());
  }
}

function expandTo18Decimals(n) {
  return toBN(n).mul(toBN(10).pow(toBN(18)));
}

function encodePrice(reserve0, reserve1) {
  return [
    reserve1.mul(toBN(2).pow(toBN(112))).div(reserve0),
    reserve0.mul(toBN(2).pow(toBN(112))).div(reserve1),
  ];
}

function getCreate2Address(factoryAddress, [tokenA, tokenB], bytecode) {
  const [token0, token1] =
    tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
  const create2Inputs = [
    '0xff',
    factoryAddress,
    soliditySha3(
      { t: 'address', v: token0 },
      { t: 'address', v: token1 },
    ).toString('hex'),
    keccak256(bytecode).toString('hex'),
  ];
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join('')}`;
  return toChecksumAddress(`0x${keccak256(sanitizedInputs).slice(-40)}`);
}

function getDomainSeparator(name, tokenAddress) {
  return keccak256(
    abi.encodeParameters(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(
          'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)',
        ),
        keccak256(name),
        keccak256('1'),
        1,
        tokenAddress,
      ],
    ),
  );
}

async function getApprovalDigest(token, approve, nonce, deadline) {
  const name = await token.name();
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address);
  return soliditySha3(
    {
      t: 'bytes1',
      v: '0x19',
    },
    {
      t: 'bytes1',
      v: '0x01',
    },
    {
      t: 'bytes32',
      v: DOMAIN_SEPARATOR,
    },
    {
      t: 'bytes32',
      v: keccak256(
        abi.encodeParameters(
          ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
          [
            PERMIT_TYPEHASH,
            approve.owner,
            approve.spender,
            approve.value,
            nonce,
            deadline,
          ],
        ),
      ),
    },
  );
}

module.exports = {
  expectEmit,
  expandTo18Decimals,
  encodePrice,
  getCreate2Address,
  getDomainSeparator,
  MaxUint256,
  PERMIT_TYPEHASH,
  getApprovalDigest,
};
