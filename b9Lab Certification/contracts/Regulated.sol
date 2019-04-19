pragma solidity ^0.4.15;

import "./interfaces/RegulatedI.sol";
import "./Validations.sol";

contract Regulated is RegulatedI, Validations{
    address currentRegulator;
    bool public running;
    
    modifier isCurrentRegulator{
        require(currentRegulator == msg.sender); //careful
        _;
    }
    
    modifier isNewRegulator(address newRegulator){
        require(newRegulator != address(currentRegulator));
        _;
    }
    
    function Regulated (address initialRegulator) 
        public
        isValidAddress(initialRegulator)
    {
        currentRegulator = initialRegulator;
    }
    
    /**
     * Sets the new regulator for this contract.
     *     It should roll back if any address other than the current regulator of this contract
     *       calls this function.
     *     It should roll back if the new regulator address is 0.
     *     It should roll back if the new regulator is the same as the current regulator.
     * @param newRegulator The new desired regulator of the contract.
     * @return Whether the action was successful.
     * Emits LogRegulatorSet.
     */
    function setRegulator(address newRegulator)
        isValidAddress(newRegulator)
        isCurrentRegulator
        isNewRegulator(newRegulator)
        public
        returns(bool success)
    {
        address previousRegulator;
        
        previousRegulator = currentRegulator;
        currentRegulator = newRegulator;
        
        LogRegulatorSet(previousRegulator, currentRegulator);
        
        success = true;
    }
    
    function getRegulator()
        constant
        public
        returns(RegulatorI regulator)
    {
        regulator = RegulatorI(currentRegulator);
    }
}