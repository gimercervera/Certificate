pragma solidity ^0.4.15;

import "./Owned.sol";
import "./interfaces/TollBoothHolderI.sol";

contract TollBoothHolder is Owned, TollBoothHolderI{
    mapping (address => bool) tollBoothDirectory;

    modifier isActiveTollBooth(address tollBooth) {
        require(isTollBooth(tollBooth));
        _;
    }
    
    modifier isNewTollBooth(address tollBooth){
        require(!isTollBooth(tollBooth));
        _;
    }
    
    function TollBoothHolder() public {}
    
    /**
     * Called by the owner of the TollBoothOperator.
     *     It should roll back if the argument is already a toll booth.
     *     When part of TollBoothOperatorI, it should be possible to add toll booths even when
     *       the contract is paused.
     * @param tollBooth The address of the toll booth being added.
     * @return Whether the action was successful.
     * Emits LogTollBoothAdded
     */
     
    function addTollBooth(address tollBooth)
        fromOwner
        isValidAddress(tollBooth)
        isNewTollBooth(tollBooth)
        public
        returns(bool success)
    {
        
        tollBoothDirectory[tollBooth] = true;
        LogTollBoothAdded(msg.sender, tollBooth);

        success = true;
    }

    /**
     * @param tollBooth The address of the toll booth we enquire about.
     * @return Whether the toll booth is indeed part of the operator.
     */
    function isTollBooth(address tollBooth)
        constant
        public
        returns(bool isIndeed)
    {
        isIndeed = tollBoothDirectory[tollBooth];
    }

    /**
     * Called by the owner of the TollBoothOperator.
     *     It should roll back if the argument has already been removed.
     *     When part of TollBoothOperatorI, it should be possible to remove toll booth even when
     *       the contract is paused.
     * @param tollBooth The toll booth to remove.
     * @return Whether the action was successful.
     * Emits LogTollBoothRemoved
     */
    function removeTollBooth(address tollBooth)
        fromOwner
        isValidAddress(tollBooth)
        isActiveTollBooth(tollBooth)
        public
        returns(bool success)
    {
        tollBoothDirectory[tollBooth] = false;
        LogTollBoothRemoved(msg.sender, tollBooth);
        
        success = true;
    }
}