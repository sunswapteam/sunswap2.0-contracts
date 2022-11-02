module.exports = {
  client: require('ganache-cli'),
  skipFiles: ['Migrations.sol', 'lib/'],
  mocha: {
    grep: '@skip-on-coverage', // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
  providerOptions: {
    allowUnlimitedContractSize: true,
    mnemonic:
      'grace silly cancel salmon vibrant later sentence such basket regular sunny satoshi',
    defaultBalanceEther: 10000000,
  },
};
