// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import regulator_artifacts from '../../build/contracts/Regulator.json'
//import tollboothoperator_artifacts from '../../build/contracts/TollBoothOperator.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
var Regulator = contract(regulator_artifacts);
//var TollBoothOperator = contract(tollboothoperator_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var main_account;
var tboOwnerAccount;
var vehicle1;
var vehicle2;
var regulator;
var tollboothOperator;
var tollBoothOperatorList = [];

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the Regulator abstraction for Use.
    Regulator.setProvider(web3.currentProvider);
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
      
      main_account = accounts[0];
      tboOwnerAccount = accounts[1];
      vehicle1 = accounts[2];
      vehicle2 = accounts[3];
      self.initContract();
      self.refreshBalance();
    });
  },

  initContract: function(){
    Regulator.deployed({
      data: 'Data en el contrato'
    })
    .then(function(instance) {
      regulator = instance;
      console.log("Contract", regulator);
    });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  refreshBalance: function() {
    var self = this;

    var main_account_element = document.getElementById("account");
    main_account_element.innerHTML = main_account.valueOf();

    var tbo_owner_element = document.getElementById("tbo_owner");
    tbo_owner.innerHTML = tboOwnerAccount.valueOf();

    var vehicle1_element = document.getElementById("vehicle1");
    vehicle1_element.innerHTML = vehicle1.valueOf();

    var vehicle2_element = document.getElementById("vehicle2");
    vehicle2_element.innerHTML = vehicle2.valueOf();

    web3.eth.getBalance(main_account, function(err, _balance){
      if(err != null){
        self.setStatus("Error getting balance; see log.");
        return;
      }
      var balance = _balance.toString(10);
      console.log("Account Balance: ", web3.fromWei(balance, "ether"));
      var balance_element = document.getElementById("main_balance");
      var balanceInEther = web3.fromWei(balance, "ether");
      balance_element.innerHTML = balanceInEther.valueOf();
    });
  },

  createNewOperator: function(){
    var self = this;
    var deposit = parseInt(document.getElementById("deposit").value);
    var owner = document.getElementById("owner").value.valueOf();

    this.setStatus("Initiating transaction... (please wait)");

    return regulator.createNewOperator(owner, deposit, {from: main_account, gas:3000000}) //Gas used: 2358221
    .then(function(tx) {
      const newOperatorAddress = tx.logs[0].address;

      var newOperator = document.getElementById("operator");
      newOperator.innerHTML = newOperatorAddress;
      localStorage.setItem("storageName", newOperatorAddress);

      document.getElementById("owner").value = "";
      document.getElementById("deposit").value = "";

      console.log("New Operator:", tx);
      self.setStatus("Operator Successfully created!");
      self.refreshBalance();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error creating a new Operator; see log.");
      self.refreshBalance();
    });
  },

  setVehicleType: function() {
    var self = this;

    var type = parseInt(document.getElementById("type").value);
    var vehicle = document.getElementById("vehicle").value;

    this.setStatus("Initiating transaction... (please wait)");

    return regulator.setVehicleType(vehicle, type, {from: main_account, gas:50000}) //Gas used: 46016
    .then(function(result) {
        console.log(result);
        self.setStatus("Vehicle type successfully set!");
        self.refreshBalance();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error registering a new vehicle type; see log.");
      self.refreshBalance();
    });
  },

  getVehicleType: function() {
    var self = this;
    var vehicleAddress = document.getElementById("vehicleAddress").value;
    this.setStatus("Initiating transaction... (please wait)");

    return regulator.getVehicleType.call(vehicleAddress)
    .then(function(type) {
      var returnType = document.getElementById("returnType");
      returnType.innerHTML = type.valueOf();
      self.setStatus("Vehicle type successfully recovered!");
      self.refreshBalance();
    })
    .catch(function(e){
      console.log(e);
      self.setStatus("Vehicle not registered; see log.");
      self.refreshBalance();
    });
  }
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
