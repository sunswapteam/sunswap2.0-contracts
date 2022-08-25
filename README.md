# SunSwap2.0-contracts

[![Tests](https://github.com/sunswapteam/sunswap2.0-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/sunswapteam/sunswap2.0-contracts/actions/workflows/tests.yml)

This repository contains the core smart contracts for the SunSwap 2.0 Protocol.

## Compile and Deployment

To get started, first create and initialize a [NodeJS 8.0+ environment](https://github.com/nodejs/node). Next, clone the repo and install the developer dependencies:

### Setup

```bash
git clone https://github.com/sunswapteam/sunswap2.0-contracts.git
cd sunswap2.0-contracts
pip install
```

### OS requirement
 * Linux
 * Mac OS X

### Compile

```
npm run compile
```

### Deploy on Nile TestNet

Deploy the Sunswap 2.0 factory and router contract to the Nile TestNet.

```
export PRIVATE_KEY_NILE='Your private key'
npm run migrate
```


