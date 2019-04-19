pragma solidity ^0.4.15;

contract Validations {
  
    modifier isValidAddress(address testAddress){
        require(testAddress != address(0));
        _;
    }
  
    modifier isGreaterThanZero(uint value){
        require(value > 0);
        _;
    }
  
    modifier isGreaterOrEqualThanZero(uint value){
        require(value >= 0);
        _;
    }
}