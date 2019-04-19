// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import tollboothoperator_artifacts from '../../build/contracts/TollBoothOperator.json'

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
var exitSecretHashed;
var enterRoadLog = [];

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the Regulator abstraction for Use.
    TollBoothOperator.setProvider(web3.currentProvider);
    //TollBoothOperator.setProvider(web3.currentProvider);
    
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

      self.vehiclesBalance();
      self.deployContract(localStorage.getItem("storageName"));
      self.getContractOwner();
    });
  },

  vehiclesBalance:function(){
    var vehicle1_element = document.getElementById("vehicle1");
    vehicle1_element.innerHTML = vehicle1.valueOf();

    var vehicle2_element = document.getElementById("vehicle2");
    vehicle2_element.innerHTML = vehicle2.valueOf();

    web3.eth.getBalance(vehicle1, function(err, _balance){
      if(err != null){
        self.setStatus("Error getting balance vehicle 1; see log.");
        return;
      }
      var balance = _balance.toString(10);
      
      var v1_balance_element = document.getElementById("v1_balance");
      var balanceInEther = web3.fromWei(balance, "ether");
      v1_balance_element.innerHTML = balanceInEther.valueOf();
    });

    web3.eth.getBalance(vehicle2, function(err, _balance){
      if(err != null){
        self.setStatus("Error getting balance vehicle 2; see log.");
        return;
      }
      var balance = _balance.toString(10);
      
      var v2_balance_element = document.getElementById("v2_balance");
      var balanceInEther = web3.fromWei(balance, "ether");
      v2_balance_element.innerHTML = balanceInEther.valueOf();
    });

  },
  
  deployContract: function(_contract){
    var self = this;
    var contractAddres = _contract;

    var tbo_address_element = document.getElementById("tbo_address");
    tbo_address.innerHTML = contractAddres.valueOf();
    tollboothoperator = TollBoothOperator.at(contractAddres);

    tollboothoperator.LogRoadEntered({}, {fromBlock: 0})
    .watch(function(err,vehicleEnterRoad){
      if(err){
        console.log("Error entering the road event", err);
      } 
      else{
        console.log("Log Enter road!", vehicleEnterRoad);
        enterRoadLog.push(vehicleEnterRoad);
      }
    });
  },

  getContractOwner:function(){
    return tollboothoperator.getOwner.call()
    .then(function(_owner){
        var owner_element = document.getElementById("owner");
        owner_element.innerHTML = _owner.valueOf();
    }).catch(function(e) {
      console.log(e);
      console.log("Error deploying contract; see log.");
    });
  },
  
  getExitSecretHashed:function(){
    var entrySecretClear = document.getElementById("exitSecretClear").value;
    
    return tollboothoperator.hashSecret.call(entrySecretClear)
    .then(function(_secret){
      var secret = _secret.toString(10);
      var secret_hashed_element = document.getElementById("exitSecretHashed");
      secret_hashed_element.innerHTML = secret.valueOf();
    }).catch(function(e) {
      console.log(e);
      console.log("Error setting a secret hashed; see log.");
    });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  enterRoad:function(){
    var self = this;
    
    var vehicle = document.getElementById("vehicle").value;
    var secret = document.getElementById("secret").value;
    var entryBooth = document.getElementById("entry_booth").value;
    var deposit = parseInt(document.getElementById("deposit").value);
    self.setStatus("Initiating transaction... (please wait)");

    return tollboothoperator.enterRoad(entryBooth, secret, {from: vehicle, value:deposit, gas:120000}) //Gas used: 115873
    .then(function(tx) {
        console.log("Enter road!", tx);
        self.setStatus("Enter road sucessfully done!");
        self.vehiclesBalance();
    }).catch(function(e) {
      console.log("Error entering road; see log.", e);
    });
  },

  refreshEnterRoad: function() {
    var table = document.getElementById("myTable");
    
    var size = table.rows.length;

    for(var i = 0; i<size-1; i++)
      document.getElementById("myTable").deleteRow(1);

    size = enterRoadLog.length;
    for(var i=0; i<size; i++){
      var row = table.insertRow();
      var cell0 = row.insertCell(0);
      var cell1 = row.insertCell(1);
      var cell2 = row.insertCell(2);
      var cell3 = row.insertCell(3);
    
      cell0.innerHTML = (i+1);
      cell1.innerHTML = enterRoadLog[i].args.vehicle;
      cell2.innerHTML = enterRoadLog[i].args.entryBooth;
      cell3.innerHTML = enterRoadLog[i].args.depositedWeis;
    }
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
