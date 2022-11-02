// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.12 <0.8.0;

interface ISunswapV2Migrator {
    function migrate(address token, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external;
}
