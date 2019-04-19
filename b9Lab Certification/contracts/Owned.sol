pragma solidity ^0.4.15;

import "./interfaces/OwnedI.sol";
import "./Validations.sol";

contract Owned is OwnedI, Validations{
    address currentOwner;
    
    modifier fromOwner {
        require(msg.sender==currentOwner);
        _;
    }
    
    modifier isNewOwner(address newOwner){
        require(newOwner != currentOwner);
        _;
    }
    
    function Owned() public
    {
        currentOwner = msg.sender;
    }
    
    function setOwner(address newOwner) 
        fromOwner
        isValidAddress(newOwner)
        isNewOwner(newOwner)
        public
        returns(bool success)
    {
        address previousOwner;
        
        previousOwner = getOwner();
        currentOwner = newOwner;
        LogOwnerSet(previousOwner, currentOwner);
        
        success = true;
    }
    
    function getOwner() 
        constant
        public
        returns(address owner)
    {
        owner = currentOwner;
    }

}