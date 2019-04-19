// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import tollboothoperator_artifacts from '../../build/contracts/TollBoothOperator.json'

//const toBytes32 = require("../utils/toBytes32.js");

// MetaCoin is our usable abstraction, which we'll use through the code below.
var TollBoothOperator = contract(tollboothoperator_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var owner;
var vehicle1;
var vehicle2;
var entryTollbooth;
var exitTollbooth;
var tollboothoperator;

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the Regulator abstraction for Use.
    TollBoothOperator.setProvider(web3.currentProvider);
        
    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, _accs) {
      accounts = _accs;

      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accounts.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      if (accounts.length < 8) {
        alert("Not enough accounts! Make sure your have at leat eigth accounts.");
        return;
      }
      
      owner = accounts[1];
      vehicle1 = accounts[2];
      vehicle2 = accounts[3];
      entryTollbooth = accounts[4];
      exitTollbooth = accounts[5];

      var entry_booth_element = document.getElementById("tollbooth_1");
      entry_booth_element.innerHTML = entryTollbooth.valueOf();

      var exit_booth_element = document.getElementById("tollbooth_2");
      exit_booth_element.innerHTML = exitTollbooth.valueOf();

      self.deployContract(localStorage.getItem("storageName"));

    });
  },

  deployContract: function(_contract){
    
    var contractAddres = _contract;

    var tbo_address_element = document.getElementById("tbo_address");
    tbo_address.innerHTML = contractAddres.valueOf();

    tollboothoperator = TollBoothOperator.at(contractAddres);
    return tollboothoperator.getOwner.call()
    .then(function(_owner){
      var owner_element = document.getElementById("owner");
      owner_element.innerHTML = _owner.valueOf();
    })
    .then(function(){
      return tollboothoperator.setPaused(false, {from:owner, gas:30000}) //Gas used: 29197
    })
    .then(function(tx){
      console.log("Set paused: ", tx)
      var state_element = document.getElementById("paused");
      console.log("Is paused? ", tx.logs[0].args.newPausedState);
      var isPaused = tx.logs[0].args.newPausedState;
      state_element.innerHTML = isPaused;
    })
    .catch(function(e) {
      console.log(e);
      console.log("Error deploying contract; see log.");
    });

  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  addTollBooth:function(){
    var newBooth = document.getElementById("new_tollbooth").value;
    return tollboothoperator.addTollBooth(newBooth, {from: owner, gas: 50000}) //Gas used: 45697
    .then(function(tx) {
        console.log("TollBooth successfully registered!", tx); 
    }).catch(function(e) {
      console.log(e);
      console.log("Error registering a new tollbooth; see log.");
    });
  },

  isTollBooth:function(){
    var checkAddress = document.getElementById("address").value;

    return tollboothoperator.isTollBooth.call(checkAddress)
    .then(function(result) {
      var valid_tollbooth_element = document.getElementById("valid_tollbooth");
      valid_tollbooth_element.innerHTML = result.valueOf();
      if(result){
        console.log("Valid tollbooth!");
      }
      else{
        console.log("Not valid tollbooth!");
      }
    }).catch(function(e) {
      console.log(e);
      console.log("Error verifying address; see log.");
    });
  },

  setRoutePrice: function(){
    var self = this;
    var entryBooth = document.getElementById("entry_booth").value;
    var exitBooth = document.getElementById("exit_booth").value;
    var priceWeis = parseInt(document.getElementById("price").value);
    
    self.setStatus("Initiating transaction... (please wait)");

    return tollboothoperator.setRoutePrice(entryBooth, exitBooth, priceWeis, {from: owner, gas: 6721975}) //Gas used 49527
    .then(function(tx) {
        console.log("Route price successfully set!", tx);
        self.setStatus("Route price successfully set!");
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error registering a new route price; see log.");
    });
  },

  setMultiplier: function(){
    var vehicleType = parseInt(document.getElementById("vehicleType").value);
    var multiplier = parseInt(document.getElementById("multiplier").value);

    return tollboothoperator.setMultiplier(vehicleType, multiplier, {from: owner, gas: 50000}) //44673
    .then(function(tx) {
        console.log("Multiplier successfully set!", tx);
    }).catch(function(e) {
      console.log(e);
      console.log("Error registering a new multiplier; see log.");
    });
  },
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)

  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }
  App.start();
});
