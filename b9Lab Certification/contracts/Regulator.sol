pragma solidity ^0.4.15;

import "./Owned.sol";
import "./interfaces/RegulatorI.sol";
import "./Validations.sol";
//import "../utils/isAddress.js";
import "./TollBoothOperator.sol";

contract Regulator is RegulatorI, Owned{
    
    
    mapping(address => bool) public TollBoothOperatorDirectory;
    
    enum TypeOfVehicle {NaN, Motorbike, Car, Lorry}
    
    mapping(address => uint) public directoryVehicleType;
    
    modifier isValidOperator(address operator){
        require(isOperator(operator));
        _;
    }
    
    modifier isValidVehicleType(uint vehicleType){
        require(vehicleType != uint(TypeOfVehicle.NaN));
        _;
    }
    
    modifier isNewVehicleType(address vehicle, uint vehicleType){
        require(directoryVehicleType[vehicle] != vehicleType);
        _;
    }
    
    modifier isNotTheOwnerOfTheRegulator(address owner){
        require(getOwner() != owner);
        _;
    }
    /**
     * uint VehicleType:
     * 0: not a vehicle, absence of a vehicle
     * 1 and above: is a vehicle.
     * For instance:
     *   1: motorbike
     *   2: car
     *   3: lorry
     */
    
    function Regulator() public {}
    
    /**
     * Called by the owner of the regulator to register a new vehicle with its VehicleType.
     * @param vehicle The address of the vehicle being registered. This may be an externally
     *   owned account or a contract. The regulator does not care.
     * @param vehicleType The VehicleType of the vehicle being registered.
     *    passing 0 is equivalent to unregistering the vehicle.
     * @return Whether the action was successful.
     * Emits LogVehicleTypeSet
     */
     
    function setVehicleType(address vehicle, uint vehicleType)
        fromOwner
        isValidAddress(vehicle)
        isValidVehicleType(vehicleType)
        isNewVehicleType(vehicle, vehicleType)
        public
        returns(bool success){

        directoryVehicleType[vehicle] = vehicleType;
        LogVehicleTypeSet(msg.sender, vehicle, vehicleType);

        success = true;
    }
    
    function getVehicleType(address vehicle)
        isValidAddress(vehicle)
        constant
        public
        returns(uint vehicleType){

        vehicleType = directoryVehicleType[vehicle];
    }
    
      /**
     * Called by the owner of the regulator to deploy a new TollBoothOperator onto the network.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should start the TollBoothOperator in the `true` paused state.
     *     It should roll back if the rightful owner argument is the current owner of the regulator.
     * @param owner The rightful owner of the newly deployed TollBoothOperator.
     * @param deposit The initial value of the TollBoothOperator deposit.
     * @return The address of the newly deployed TollBoothOperator.
     * Emits LogTollBoothOperatorCreated with:
     *     The sender of the action.
     *     The address of the deployed TollBoothOperator.
     *     The rightful owner of the TollBoothOperator.
     *     the initial deposit value.
     */

    function createNewOperator(address owner, uint deposit)
        fromOwner
        isValidAddress(owner)
        isGreaterThanZero(deposit)
        isNotTheOwnerOfTheRegulator(owner)
        public
        returns(TollBoothOperatorI newOperator)
    {
        TollBoothOperator trustedTollBoothOperator = new TollBoothOperator(true, deposit, this);

        trustedTollBoothOperator.setOwner(owner);
        
        TollBoothOperatorDirectory[address(trustedTollBoothOperator)] = true;

        LogTollBoothOperatorCreated(msg.sender, trustedTollBoothOperator, owner, deposit);
        
        newOperator = trustedTollBoothOperator;
    }
    
    function removeOperator(address operator)
        fromOwner
        isValidAddress(operator)
        isValidOperator(operator)
        public
        returns(bool success)
    {
        TollBoothOperatorDirectory[operator] = false;
        
        LogTollBoothOperatorRemoved(msg.sender, operator);
        success = true;
    }
    
    /**
    * @param operator The address of the TollBoothOperator to test. It should accept a 0 address.
    * @return Whether the TollBoothOperator is indeed approved.
    */
    function isOperator(address operator)
        constant
        public
        returns(bool indeed)
    {
        indeed = TollBoothOperatorDirectory[operator]; 
    }
}