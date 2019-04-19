pragma solidity ^0.4.15;

import "./interfaces/MultiplierHolderI.sol";
import "./Owned.sol";

contract MultiplierHolder is Owned, MultiplierHolderI{
    mapping(uint => uint) vehicleTypeMultiplier;
   
    modifier isNewMultiplier(uint vehicleType, uint multiplier){
        require(vehicleTypeMultiplier[vehicleType] != multiplier);
        _;
    }
    
    function MultiplierHolder() public{}
    
    /**
     * Called by the owner of the TollBoothOperator.
     *   Can be used to update a value.
     *   It should roll back if the vehicle type is 0.
     *   Setting the multiplier to 0 is equivalent to removing it and is acceptable.
     *   It should roll back if the same multiplier is already set to the vehicle type.
     * @param vehicleType The type of the vehicle being set.
     * @param multiplier The multiplier to use.
     * @return Whether the action was successful.
     * Emits LogMultiplierSet.
     */
     
     //vehicleType: 1 - motorbikes, 2 - cars, 3 - lorries.
    function setMultiplier(uint vehicleType, uint multiplier)
        fromOwner
        isGreaterThanZero(vehicleType)
        isGreaterOrEqualThanZero(multiplier)
        isNewMultiplier(vehicleType, multiplier)
        public
        returns(bool success)
    {
        vehicleTypeMultiplier[vehicleType] = multiplier;
        LogMultiplierSet(msg.sender, vehicleType, multiplier);
        success = true;
    }

    /**
     * @param vehicleType The type of vehicle whose multiplier we want
     *     It should accept a vehicle type equal to 0.
     * @return The multiplier for this vehicle type.
     *     A 0 value indicates a non-existent multiplier.
     */
    function getMultiplier(uint vehicleType)
        isGreaterOrEqualThanZero(vehicleType)
        constant
        public
        returns(uint multiplier){
        
        multiplier = vehicleTypeMultiplier[vehicleType];
    }

    /*
     * You need to create:
     *
     * - a contract named `MultiplierHolder` that:
     *     - is `OwnedI` and `MultiplierHolderI`.
     *     - has a constructor that takes no parameter.
     */        
}