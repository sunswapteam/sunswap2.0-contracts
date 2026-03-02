# SunSwap2.0-contracts
> ⚠️ **DEPRECATED**: This project is no longer maintained. Please check out [sun-protocol/SunswapV2-Contracts](https://github.com/sun-protocol/SunswapV2-Contracts) instead.

This repository contains the core smart contracts for the SunSwap 2.0 Protocol.

## Core Contracts

`SunswapV2Pair`, LP token & liquidity pool，provides `mint`,`burn`,`swap` methods
`SunswapV2Factory`, Factory contract, create the pair contracts
`Sunswapv2Router02`, Router contract, used for liquidity management and multi-hop swaps.

## Deployments 

| contract                   | chain | address                            |
| :------------------------- | :---- | :--------------------------------- |
| Factory                    | TRON  | TKWJdrQkqHisa1X8HUdHEfREvTzw4pMAaY |
|                            | NILE  | THomLGMLhAjMecQf9FQjbZ8a1RtwsZLrGE |
| SwapRouter                 | TRON  | TNJVzGqKBWkJxJB5XYSqGAwUTV15U24pPq |
|                            | NILE  | TMn1qrmYUMSTXo9babrJLzepKZoPC7M6Sy |


## Compile and Deployment

To get started, first create and initialize a [NodeJS 8.0+ environment](https://github.com/nodejs/node). Next, clone the repo and install the developer dependencies:

### Setup

```bash
git clone https://github.com/sunswapteam/sunswap2.0-contracts.git
cd sunswap2.0-contracts
npm install
```

### OS requirement

- Linux
- Mac OS X

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

## Community

If you have any questions about this project, or wish to engage with us:

- [Telegram](https://t.me/SunIO_Defi)
- [Twitter](https://twitter.com/defi_sunio)
