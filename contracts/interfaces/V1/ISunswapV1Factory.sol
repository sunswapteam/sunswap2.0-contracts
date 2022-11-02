// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.12 <0.8.0;

interface ISunswapV1Factory {
    function getExchange(address) external view returns (address);
}
