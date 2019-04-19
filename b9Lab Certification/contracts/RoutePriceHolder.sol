pragma solidity ^0.4.15;

import "./TollBoothHolder.sol";
import "./interfaces/RoutePriceHolderI.sol";
import "./Validations.sol";

contract RoutePriceHolder is TollBoothHolder, RoutePriceHolderI{
    mapping (bytes32 => uint) routePrice;
    
    modifier isNewPrice(address entryBooth, address exitBooth, uint priceWeis){
        require(routePrice[keccak256(entryBooth, exitBooth)] != priceWeis);
        _;
    }
    
    modifier isDifferentExit(address entryBooth, address exitBooth){
        require(entryBooth != exitBooth);
        _;
    }
    
    function RoutePriceHolder() public{}
    /**
     * Called by the owner of the RoutePriceHolder.
     *     It can be used to update the price of a route, including to zero.
     *     It should roll back if one of the booths is not a registered booth.
     *     It should roll back if there is no change in price.
     * @param entryBooth The address of the entry booth of the route set.
     * @param exitBooth The address of the exit booth of the route set.
     * @param priceWeis The price in weis of the new route.
     * @return Whether the action was successful.
     * Emits LogPriceSet.
     */
    
    function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis)
        fromOwner
        isValidAddress(entryBooth)
        isValidAddress(exitBooth)
        isActiveTollBooth(entryBooth)
        isActiveTollBooth(exitBooth)
        isNewPrice(entryBooth, exitBooth, priceWeis)
        isDifferentExit(entryBooth, exitBooth)
        public
        returns(bool success){
        
        routePrice[keccak256(entryBooth, exitBooth)] = priceWeis;
        LogRoutePriceSet(msg.sender, entryBooth, exitBooth, priceWeis);
        
        success = true;
    }

    /**
     * @param entryBooth The address of the entry booth of the route. It should accept a 0 address.
     * @param exitBooth The address of the exit booth of the route. It should accept a 0 address.
     * @return priceWeis The price in weis of the route.
     *     If the route is not known or if any address is not a booth it should return 0.
     *     If the route is invalid, it should return 0.
     */
    function getRoutePrice(address entryBooth, address exitBooth)
        isActiveTollBooth(entryBooth)
        isActiveTollBooth(exitBooth)
        isDifferentExit(entryBooth, exitBooth)
        constant
        public
        returns(uint priceWeis){
            
        //if(entryBooth == exitBooth) return 0;
        //if (!isTollBooth(entryBooth)) return 0;
        //if (!isTollBooth(exitBooth)) return 0;
      
        priceWeis = routePrice[keccak256(entryBooth, exitBooth)];
    }
}