pragma solidity >=0.5.0;

interface ISunswapV2Callee {
    function SunswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
}