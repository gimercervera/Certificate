pragma solidity ^0.4.15;
import "./interfaces/DepositHolderI.sol";
import "./Owned.sol";

contract DepositHolder is DepositHolderI, Owned{
    uint currentDeposit;
    
    modifier isNewDeposit(uint depositWeis){
        require(currentDeposit != depositWeis);
        _;
    }

    function DepositHolder(uint initialDepositWeis) 
        public
        isGreaterThanZero(initialDepositWeis)
    {
        currentDeposit = initialDepositWeis;
    }
    
    /**
     * Called by the owner of the DepositHolder.
     *     It should roll back if the argument is no different from the current deposit.
     * @param depositWeis The value of the deposit being set, measure in weis.
     * @return Whether the action was successful.
     * Emits LogDepositSet.
     */
    function setDeposit(uint depositWeis)
        fromOwner
        isGreaterThanZero(depositWeis)
        isNewDeposit(depositWeis)
        public
        returns(bool success)
    {
        currentDeposit = depositWeis;
        LogDepositSet(msg.sender, currentDeposit);
        
        success = true;
    }

    function getDeposit()
        constant
        public
        returns(uint weis){
        
        weis = currentDeposit;
    }
}