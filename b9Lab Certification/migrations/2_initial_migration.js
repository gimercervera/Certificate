var TollBoothOperator = artifacts.require("./TollBoothOperator.sol");
var Regulator = artifacts.require("./Regulator.sol");

module.exports = function(deployer) {
  const deposit = web3.toWei(.1, 'ether');
  var accounts = web3.eth.accounts;
  var creator = accounts[0];
  var owner = accounts[1];
  var operator;

  deployer.deploy(Regulator);
  deployer.then(function(){
    return Regulator.deployed();
  })
  .then(function(_instance){
    var regulator = _instance;
     return regulator.createNewOperator(owner, deposit)
    .then(function(tx){
      return TollBoothOperator.at(tx.logs[0].address);
    })
    .then(function(_operator){
      operator = _operator;
      //Resuming
      return operator.setPaused(false, {from: owner})
      .then(function(){
        return operator.isPaused()
        .then(function(_status){
          console.log("Operator is paused: ", _status);
        });
      });
    });
  })
  .catch(function(e){
    console.log(e);
  });
};

