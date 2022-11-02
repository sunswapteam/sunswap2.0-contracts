// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.12 <0.8.0;

interface ISunswapV2Callee {
    function sunswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
}
