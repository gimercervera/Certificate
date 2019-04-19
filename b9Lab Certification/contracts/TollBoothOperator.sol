pragma solidity ^0.4.15;

import "./Pausable.sol";
import "./Regulated.sol";
import "./DepositHolder.sol";
import "./MultiplierHolder.sol";
import "./RoutePriceHolder.sol";
import "./interfaces/TollBoothOperatorI.sol";
import "./FIFO.sol";

contract TollBoothOperator is Pausable, Regulated, MultiplierHolder, DepositHolder,FIFO, RoutePriceHolder, TollBoothOperatorI{
    uint collectedFeesAmount; 
        
    mapping (bytes32 => bool) public secretHashedDirectory;
    
    mapping (bytes32 => uint) public countPendingPayments;
    
     modifier isNotEntryBooth(address exitBooth, bytes32 exitSecretClear){
        require(vehicleEntryInfo[hashSecret(exitSecretClear)].entryBooth != exitBooth);
        _;
    }
    
    modifier isNewHash(bytes32 exitSecretHashed){
        require(!secretHashedDirectory[exitSecretHashed]);
        _;
    }
    
    modifier atLeastCountPendingPayments(address entryBooth, address exitBooth, uint count){
        require(!(count > getPendingPaymentCount(entryBooth, exitBooth)));
        _;
    }
    
    modifier isRegisteredVehicle(address vehicle){
        require(getRegulator().getVehicleType(vehicle) != 0);
        _;
    }

    modifier isDifferentTollBooth(address entryBooth, address exitBooth){
        require(entryBooth != exitBooth);
        _;
    }
    
    struct VehicleEntry { 
        address vehicle;
        address entryBooth;
        uint depositedWeis; // The amount deposited by the vehicle
    }
    
    mapping(bytes32 => VehicleEntry) vehicleEntryInfo;
    
    mapping(bytes32 => bytes32) vehicleExitSecretHashed;
    
    function TollBoothOperator(
        bool initialState, 
        uint initialDepositWei, 
        address regulator)
        Pausable(initialState)
        DepositHolder(initialDepositWei)
        Regulated(regulator)
        public
    {}

    /*
     * This provides a single source of truth for the encoding algorithm.
     * @param secret The secret to be hashed.
     * @return the hashed secret.
     */     
    function hashSecret(bytes32 secret)
        constant
        public
        returns(bytes32 hashed){
        
        hashed = keccak256(secret);
    }

     /*
     * Called by the vehicle entering a road system.
     * Off-chain, the entry toll booth will open its gate after a successful deposit and a confirmation
     * of the vehicle identity.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back when the vehicle is not a registered vehicle.
     *     It should roll back when the vehicle is not allowed on this road system.
     *     It should roll back if `entryBooth` is not a tollBooth.
     *     It should roll back if less than deposit * multiplier was sent alongside.
     *     It should roll back if `exitSecretHashed` has previously been used by anyone to enter.
     *     It should be possible for a vehicle to enter "again" before it has exited from the 
     *       previous entry.
     * @param entryBooth The declared entry booth by which the vehicle will enter the system.
     * @param exitSecretHashed A hashed secret that when solved allows the operator to pay itself.
     * @return Whether the action was successful.
     * Emits LogRoadEntered with:
     *     The sender of the action.
     *     The address of the entry booth.
     *     The hashed secret used to deposit.
     *     The amount deposited by the vehicle.
     */
    
    function enterRoad(address entryBooth, bytes32 exitSecretHashed)
        isGreaterThanZero(msg.value)
        whenNotPaused //It should roll back when the contract is in the `true` paused state.
        isActiveTollBooth(entryBooth)
        isNewHash(exitSecretHashed)
        isRegisteredVehicle(msg.sender)
        public
        payable
        returns (bool success)
    {
        uint vehicleType;
        uint multiplier;
        
        vehicleType = getRegulator().getVehicleType(msg.sender);
        require(vehicleType > 0);
        
        multiplier = getMultiplier(vehicleType);
        require(multiplier > 0);

        //It should roll back if less than deposit * multiplier was sent alongside.
        require(getDeposit() * multiplier <= msg.value);

        secretHashedDirectory[exitSecretHashed] = true; //Secret is used only once.
        
        vehicleEntryInfo[exitSecretHashed].vehicle = msg.sender;
        vehicleEntryInfo[exitSecretHashed].entryBooth = entryBooth;
        vehicleEntryInfo[exitSecretHashed].depositedWeis = msg.value;
        
        LogRoadEntered(msg.sender, entryBooth, exitSecretHashed, msg.value);
        success = true;
    }


    function getVehicleEntry(bytes32 exitSecretHashed)
        constant
        public
        returns(
            address vehicle,
            address entryBooth,
            uint depositedWeis)
    {
        vehicle = vehicleEntryInfo[exitSecretHashed].vehicle;
        entryBooth = vehicleEntryInfo[exitSecretHashed].entryBooth;
        depositedWeis = vehicleEntryInfo[exitSecretHashed].depositedWeis;
    }
    
    function getVehicleSecretHashed(bytes32 infoHash)
        constant
        public
        returns(
            bytes32 secretHashed)
    {
        secretHashed = vehicleExitSecretHashed[infoHash];
    }
    
    function setVehicleSecretHashed(bytes32 infoHash, bytes32 secretHashed)
        public
        returns(bool success)
    {
        vehicleExitSecretHashed[infoHash] = secretHashed;
        success = true;
    }
    

    /*
     * Called by the exit booth.
     *     It should roll back when the contract is in the `true` paused state. 
     *     It should roll back when the sender is not a toll booth.
     *     It should roll back if the exit is same as the entry.
     *     It should roll back if the secret does not match a hashed one.
     * @param exitSecretClear The secret given by the vehicle as it passed by the exit booth.
     * @return status:
     *   1: success, -> emits LogRoadExited
     *   2: pending oracle -> emits LogPendingPayment
     */
    
    function getExitData(bytes32 exitSecretHashed)
        constant
        public
        returns(uint multiplier,
            address vehicle,
            address entryBooth,
            uint depositedWeis)
    {
        uint vehicleType;
        
        (vehicle, entryBooth, depositedWeis) = getVehicleEntry(exitSecretHashed);
        vehicleType = getRegulator().getVehicleType(vehicle);
        multiplier = getMultiplier(vehicleType);
    }

    function reportExitRoad(bytes32 exitSecretClear)
        whenNotPaused
        isActiveTollBooth(msg.sender)
        isNotEntryBooth(msg.sender, exitSecretClear)
        public
        returns (uint status){
        bytes32 exitSecretHashed = hashSecret(exitSecretClear);
        uint refundWeis = 0;
        address entryBooth;
        uint depositedWeis;
        address exitBooth = msg.sender;
        address vehicle;
        uint multiplier;
        bytes32 pendingExitHashed;
        
        (multiplier, vehicle, entryBooth, depositedWeis) = getExitData(exitSecretHashed);

        uint finalFee;
        
        if(getRoutePrice(entryBooth, exitBooth) == 0){
            countPendingPayments[keccak256(entryBooth, exitBooth)] += 1;
            
            pendingExitHashed = keccak256(entryBooth, exitBooth, vehicle);
            
            setVehicleSecretHashed(pendingExitHashed, exitSecretHashed);
            
            push(pendingExitHashed);
            
            LogPendingPayment(exitSecretHashed, entryBooth, exitBooth);
            status = 2;
            return;
        }
        
        finalFee = getRoutePrice(entryBooth, exitBooth) * multiplier;
        
        //The vehicle exits the road. Avoid reentrance attack
        vehicleEntryInfo[exitSecretHashed].depositedWeis = 0;

        if (finalFee >= depositedWeis){
            collectedFeesAmount += depositedWeis;
        }
        else{
            refundWeis = depositedWeis - finalFee;
            collectedFeesAmount += finalFee;
            vehicle.transfer(refundWeis);
        }
        
        LogRoadExited(exitBooth, exitSecretHashed, finalFee, refundWeis);
        
        status = 1;
        return;
    }

    /*
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @return the number of payments that are pending because the price for the
     * entry-exit pair was unknown.
     */
    function getPendingPaymentCount(address entryBooth, address exitBooth)
        constant
        public
        returns (uint count){
        count = countPendingPayments[keccak256(entryBooth, exitBooth)];
    }

    function getRefundWeis(bytes32 exitSecretHashed, address exitBooth)
        constant
        public
        returns (uint refundWeis, address vehicle, uint finalFee)
        {
        uint multiplier;
        address entryBooth;
        uint depositedWeis;
        
        (multiplier, vehicle, entryBooth, depositedWeis) = getExitData(exitSecretHashed);
        
        finalFee = getRoutePrice(entryBooth, exitBooth) * multiplier;

        vehicleEntryInfo[exitSecretHashed].depositedWeis = 0;
        
        if (finalFee >= depositedWeis){
            collectedFeesAmount += depositedWeis;
            finalFee = depositedWeis;
        }
        else{
            collectedFeesAmount += finalFee;
            refundWeis = depositedWeis - finalFee;
        }
    }
    /*
     * Can be called by anyone. In case more than 1 payment was pending when the oracle gave a price.
     *     It should roll back when the contract is in `true` paused state.
     *     It should roll back if booths are not really booths.
     *     It should roll back if there are fewer than `count` pending payment that are solvable.
     *     It should roll back if `count` is `0`.
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @param count the number of pending payments to clear for the exit booth.
     * @return Whether the action was successful.
     * Emits LogRoadExited as many times as count.
     */
    function clearSomePendingPayments(address entryBooth, address exitBooth, uint count)
        whenNotPaused
        isActiveTollBooth(entryBooth)
        isActiveTollBooth(exitBooth)
        isGreaterThanZero(count)
        atLeastCountPendingPayments(entryBooth, exitBooth, count)
        public
        returns (bool success){
        
     
        uint finalFee;
        uint refundWeis;
        address vehicle;
        bytes32 exitSecretHashed;
        
        for(uint i = 0; i < count; i++){
            exitSecretHashed = getVehicleSecretHashed(pop());
        
            (refundWeis, vehicle, finalFee) = getRefundWeis(exitSecretHashed, exitBooth);
            
            if(refundWeis > 0)
                vehicle.transfer(refundWeis);

            reducePendingPayments(entryBooth, exitBooth);
            LogRoadExited(exitBooth, exitSecretHashed,finalFee,refundWeis);
        }
        success = true;
    }

    function reducePendingPayments(address entryBooth, address exitBooth)
    private
    {
        countPendingPayments[keccak256(entryBooth, exitBooth)] -= 1;
    }

    /*
     * @return The amount that has been collected through successful payments. This is the current
     *   amount, it does not reflect historical fees. So this value goes back to zero after a call
     *   to `withdrawCollectedFees`.
     */
    function getCollectedFeesAmount()
        constant
        public
        returns(uint amount)
    {
        amount = collectedFeesAmount;     
    }

    /*
     * Event emitted when the owner collects the fees.
     * @param owner The account that sent the request.
     * @param amount The amount collected.
     */

    /*
     * Called by the owner of the contract to withdraw all collected fees (not deposits) to date.
     *     It should roll back if any other address is calling this function.
     *     It should roll back if there is no fee to collect.
     *     It should roll back if the transfer failed.
     * @return success Whether the operation was successful.
     * Emits LogFeesCollected.
     */
    function withdrawCollectedFees()
        fromOwner
        isGreaterThanZero(collectedFeesAmount)
        public
        returns(bool success){
        
        uint withdrawAmount;
        address feesCollector;
     
        withdrawAmount = collectedFeesAmount;
        collectedFeesAmount = 0;
        
        feesCollector = getOwner();
        feesCollector.transfer(withdrawAmount);
        
        LogFeesCollected(feesCollector, withdrawAmount);
        success = true;
    }

    /*
     * This function overrides the eponymous function of `RoutePriceHolderI`, to which it adds the following
     * functionality:
     *     - If relevant, it will release 1 pending payment for this route. As part of this payment
     *       release, it will emit the appropriate `LogRoadExited` event.
     *     - In the case where the next relevant pending payment is not solvable, which can happen if,
     *       for instance the vehicle has had wrongly set values in the interim:
     *       - It should release 0 pending payment
     *       - It should not roll back the transaction
     *       - It should behave as if there had been no pending payment, apart from the higher gas consumed.
     *     - It should be possible to call it even when the contract is in the `true` paused state.
     * Emits LogRoadExited if applicable.
     */

    function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis)
        fromOwner
        isActiveTollBooth(entryBooth)
        isActiveTollBooth(exitBooth)
        isDifferentTollBooth(entryBooth, exitBooth)
        public
        returns(bool success){
        
        bytes32 routeHash;
        
        routeHash = keccak256(entryBooth, exitBooth);
        
        routePrice[routeHash] = priceWeis;

        LogRoutePriceSet(msg.sender, entryBooth, exitBooth, priceWeis);
        
        if (getPendingPaymentCount(entryBooth, exitBooth) > 0){
            clearSomePendingPayments(entryBooth, exitBooth, 1);
        }
        
        success = true;
    }
    
    function () public {
        // No donations.
    }
    
    /*
     * You need to create:
     *
     * - a contract named `TollBoothOperator` that:
     *     - is `OwnedI`, `PausableI`, `DepositHolderI`, `TollBoothHolderI`,
     *         `MultiplierHolderI`, `RoutePriceHolderI`, `RegulatedI` and `TollBoothOperatorI`.
     *     - has a constructor that takes:
     *         - one `bool` parameter, the initial paused state.
     *         - one `uint` parameter, the initial deposit wei value, which cannot be 0.
     *         - one `address` parameter, the initial regulator, which cannot be 0.
     */
}