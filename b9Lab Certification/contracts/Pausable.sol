pragma solidity ^0.4.13;
import "./interfaces/PausableI.sol";
import "./Owned.sol";

contract Pausable is PausableI, Owned{
    bool currentState;
    
    modifier isNewState(bool newState){
        require(currentState != newState);
        _;
    }
    
    modifier whenPaused{
        require(currentState);
        _;
    }
    
    modifier whenNotPaused{
        require(!currentState);
        _;
    }
    
    function Pausable (bool initialState) public
    {
        currentState = initialState;
    }

    function setPaused(bool newState)
        fromOwner
        isNewState(newState)
        public
        returns(bool success)
    {
        currentState = newState;
        LogPausedSet(msg.sender, newState);
        
        success = true;
    }

    function isPaused()
        public
        constant
        returns(bool isIndeed)
    {
        isIndeed = currentState;
    }
}