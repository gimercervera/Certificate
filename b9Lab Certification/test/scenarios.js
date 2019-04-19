const expectedExceptionPromise = require("../utils/expectedException.js");
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
const Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
const randomIntIn = require("../utils/randomIntIn.js");
const toBytes32 = require("../utils/toBytes32.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

contract('TollBoothOperator', function(accounts) {

    let owner0, owner1, booth1, booth2, booth3,vehicle1, vehicle2;
    let regulator, operator;
    //const price = randomIntIn(1, 1000);
    //const deposit1 = price + randomIntIn(1, 1000);
    //const deposit2 = deposit1 + randomIntIn(1, 1000);
    
    const vehicleType1 = 1;
    const vehicleType2 = 2;

    const multiplier1 = 1;
    const multiplier2 = 2;

    const initialDeposit = 10;

    //Scenario 1
    const routePrice1 = 10;
    const deposit1 = 10;
    const finalFee1 = routePrice1 * multiplier1;

    //Scenario 2
    const routePrice2 = 15;
    const deposit2 = 10;
    const finalFee2 = routePrice2 * multiplier1;
    
    //Scenario 3
    const routePrice3 = 6;
    const deposit3 = 10;
    const finalFee3 = routePrice3 * multiplier1;

    //Scenario 4
    const routePrice4 = 10;
    const deposit4 = 14;
    const finalFee4 = routePrice4 * multiplier1;

    //Scenario 5
    const routePrice5 = 11;
    const deposit5 = 14;
    const finalFee5 = routePrice5 * multiplier1;
    
    //Scenario 6
    const routePrice6 = 6;
    const vehicle1Deposit6 = 14;
    const vehicle2Deposit6 = 10;

    const finalFee6 = routePrice6 * multiplier1;
    
    const tmpSecret1 = randomIntIn(1, 1000);
    const tmpSecret2 = randomIntIn(1, 1000);

    const secret1 = toBytes32(tmpSecret1);
    const secret2 = toBytes32(tmpSecret2);
        
    let hashed1, hashed2;

    before("should prepare", function() {
        assert.isAtLeast(accounts.length, 8);
        //Owner of the Toollbooth
        owner0 = accounts[0]; 
        owner1 = accounts[1];
        //Active tollbooths
        booth1 = accounts[2];
        booth2 = accounts[3];
        booth3 = accounts[4];
        //Vehicles entering the road
        vehicle1 = accounts[5];
        vehicle2 = accounts[6];
        return web3.eth.getBalancePromise(owner0)
            .then(balance => assert.isAtLeast(web3.fromWei(balance).toNumber(), 10));
    });

    describe("Vehicle Operations", function() {

        beforeEach("should deploy regulator and operator", function() {
            return Regulator.new({ from: owner0 })
                .then(instance => regulator = instance)
                .then(tx => regulator.setVehicleType(vehicle1, vehicleType1, { from: owner0 }))
                .then(tx => regulator.setVehicleType(vehicle2, vehicleType1, { from: owner0 }))
                .then(tx => regulator.createNewOperator(owner1, initialDeposit, { from: owner0 }))
                .then(tx => operator = TollBoothOperator.at(tx.logs[1].args.newOperator))
                .then(tx => operator.addTollBooth(booth1, { from: owner1 }))
                .then(tx => operator.isTollBooth(booth1, { from: owner1 }))
                .then(isOperator1 => assert.isTrue(isOperator1))
                .then(tx => operator.addTollBooth(booth2, { from: owner1 }))
                .then(tx => operator.isTollBooth(booth2, { from: owner1 }))
                .then(isOperator2 => assert.isTrue(isOperator2))
                .then(tx => operator.addTollBooth(booth3, { from: owner1 }))
                .then(tx => operator.isTollBooth(booth3, { from: owner1 }))
                .then(isOperator3 => assert.isTrue(isOperator3))
                .then(tx => operator.setMultiplier(vehicleType1, multiplier1, { from: owner1 }))
                .then(tx => operator.setMultiplier(vehicleType2, multiplier2, { from: owner1 }))
                //.then(tx => operator.setRoutePrice(booth1, booth2, routePrice, { from: owner1 }))
                .then(tx => operator.setPaused(false, { from: owner1 }))
                .then(tx => operator.hashSecret(secret1))
                .then(hash => hashed1 = hash)
                .then(tx => operator.hashSecret(secret2))
                .then(hash => hashed2 = hash);
        });

        it("Scenario 1 - Enter road, deposit equal to route price (10). Get No refund", function(){
            return operator.enterRoad.call(
                booth1, hashed1, { from: vehicle1, value: deposit1 })
            .then(success => assert.isTrue(success))
            .then(() => operator.enterRoad(
                booth1, hashed1, { from: vehicle1, value: deposit1 }))
            .then(tx =>{
                assert.strictEqual(tx.receipt.logs.length, 1);
                return operator.getVehicleEntry(hashed1);
            })
            .then(info => {
                assert.strictEqual(info[0], vehicle1);
                assert.strictEqual(info[1], booth1);
                assert.strictEqual(info[2].toNumber(), deposit1);
                return web3.eth.getBalancePromise(operator.address);
            })
            .then(balance => console.log("Entering the road balance: " + balance.toNumber()))
            .then(() => operator.setRoutePrice(booth1, booth2, routePrice1, { from: owner1 }))
            .then(tx => operator.reportExitRoad.call(secret1, { from: booth2 }))
            .then(result => assert.strictEqual(result.toNumber(), 1))
            .then(() => operator.reportExitRoad(secret1, { from: booth2 }))
            .then(tx => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed1);
                assert.strictEqual(logExited.args.finalFee.toNumber(), finalFee1);
                return Promise.allNamed({
                    hashed0: () => operator.getVehicleEntry(hashed1)
                });
            })
            .then(info => {
                assert.strictEqual(info.hashed0[0], vehicle1);
                assert.strictEqual(info.hashed0[1], booth1);
                assert.strictEqual(info.hashed0[2].toNumber(), 0);
                return Promise.allNamed({
                    operator: () => web3.eth.getBalancePromise(operator.address),
                    collected: () => operator.getCollectedFeesAmount(),
                });
            })
            .then(balances => {
                assert.strictEqual(balances.operator.toNumber(), finalFee1);
                console.log("Operator balance: " + balances.operator.toNumber());
                assert.strictEqual(balances.collected.toNumber(), finalFee1);
            });
        });

        it("Scenario 2 - Enter road, deposit less than route price (15). Get No refund", function(){
            return operator.enterRoad.call(
                booth1, hashed1, { from: vehicle1, value: deposit2 })
            .then(success => assert.isTrue(success))
            .then(() => operator.enterRoad(
                booth1, hashed1, { from: vehicle1, value: deposit2 }))
            .then(tx =>{
                assert.strictEqual(tx.receipt.logs.length, 1);
                return operator.getVehicleEntry(hashed1);
            })
            .then(info => {
                assert.strictEqual(info[0], vehicle1);
                assert.strictEqual(info[1], booth1);
                assert.strictEqual(info[2].toNumber(), deposit2);
                return web3.eth.getBalancePromise(operator.address);
            })
            .then(balance => console.log("Entering the road balance: " + balance.toNumber()))
            .then(() => operator.setRoutePrice(booth1, booth2, routePrice2, { from: owner1 }))
            .then(tx => operator.reportExitRoad.call(secret1, { from: booth2 }))
            .then(result => assert.strictEqual(result.toNumber(), 1))
            .then(() => operator.reportExitRoad(secret1, { from: booth2 }))
            .then(tx => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed1);
                assert.strictEqual(logExited.args.finalFee.toNumber(), finalFee2);
                return Promise.allNamed({
                    hashed0: () => operator.getVehicleEntry(hashed1)
                });
            })
            .then(info => {
                assert.strictEqual(info.hashed0[0], vehicle1);
                assert.strictEqual(info.hashed0[1], booth1);
                assert.strictEqual(info.hashed0[2].toNumber(), 0);
                return Promise.allNamed({
                    operator: () => web3.eth.getBalancePromise(operator.address),
                    collected: () => operator.getCollectedFeesAmount(),
                });
            })
            .then(balances => {
                assert.strictEqual(balances.operator.toNumber(), deposit2);
                console.log("Operator balance: " + balances.operator.toNumber());
                assert.strictEqual(balances.collected.toNumber(), deposit2);
            });
        });

        it("Scenario 3 - Enter road, deposit greater than route price (6). Get refund (4)", function(){
            return operator.enterRoad.call(
                booth1, hashed1, { from: vehicle1, value: deposit3 })
            .then(success => assert.isTrue(success))
            .then(() => operator.enterRoad(
                booth1, hashed1, { from: vehicle1, value: deposit3 }))
            .then(tx =>{
                assert.strictEqual(tx.receipt.logs.length, 1);
                return operator.getVehicleEntry(hashed1);
            })
            .then(info => {
                assert.strictEqual(info[0], vehicle1);
                assert.strictEqual(info[1], booth1);
                assert.strictEqual(info[2].toNumber(), deposit3);
                return web3.eth.getBalancePromise(operator.address);
            })
            .then(balance => console.log("Entering the road balance: " + balance.toNumber()))
            .then(() => operator.setRoutePrice(booth1, booth2, routePrice3, { from: owner1 }))
            .then(tx => operator.reportExitRoad.call(secret1, { from: booth2 }))
            .then(result => assert.strictEqual(result.toNumber(), 1))
            .then(() => operator.reportExitRoad(secret1, { from: booth2 }))
            .then(tx => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed1);
                assert.strictEqual(logExited.args.finalFee.toNumber(), finalFee3);
                return Promise.allNamed({
                    hashed0: () => operator.getVehicleEntry(hashed1)
                });
            })
            .then(info => {
                assert.strictEqual(info.hashed0[0], vehicle1);
                assert.strictEqual(info.hashed0[1], booth1);
                assert.strictEqual(info.hashed0[2].toNumber(), 0);
                return Promise.allNamed({
                    operator: () => web3.eth.getBalancePromise(operator.address),
                    collected: () => operator.getCollectedFeesAmount(),
                });
            })
            .then(balances => {
                assert.strictEqual(balances.operator.toNumber(), finalFee3);
                console.log("Operator balance: " + balances.operator.toNumber());
                assert.strictEqual(balances.collected.toNumber(), finalFee3);
            });
        });

        it("Scenario 4 - Enter road, deposit greater than route price which is equal to initial deposit. Get refund (4)", function(){
            return operator.enterRoad.call(
                booth1, hashed1, { from: vehicle1, value: deposit4 })
            .then(success => assert.isTrue(success))
            .then(() => operator.enterRoad(
                booth1, hashed1, { from: vehicle1, value: deposit4 }))
            .then(tx =>{
                assert.strictEqual(tx.receipt.logs.length, 1);
                return operator.getVehicleEntry(hashed1);
            })
            .then(info => {
                assert.strictEqual(info[0], vehicle1);
                assert.strictEqual(info[1], booth1);
                assert.strictEqual(info[2].toNumber(), deposit4);
                return web3.eth.getBalancePromise(operator.address);
            })
            .then(balance => console.log("Entering the road balance: " + balance.toNumber()))
            .then(() => operator.setRoutePrice(booth1, booth2, routePrice4, { from: owner1 }))
            .then(tx => operator.reportExitRoad.call(secret1, { from: booth2 }))
            .then(result => assert.strictEqual(result.toNumber(), 1))
            .then(() => operator.reportExitRoad(secret1, { from: booth2 }))
            .then(tx => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogRoadExited");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed1);
                assert.strictEqual(logExited.args.finalFee.toNumber(), finalFee4);
                return Promise.allNamed({
                    hashed0: () => operator.getVehicleEntry(hashed1)
                });
            })
            .then(info => {
                assert.strictEqual(info.hashed0[0], vehicle1);
                assert.strictEqual(info.hashed0[1], booth1);
                assert.strictEqual(info.hashed0[2].toNumber(), 0);
                return Promise.allNamed({
                    operator: () => web3.eth.getBalancePromise(operator.address),
                    collected: () => operator.getCollectedFeesAmount()
                });
            })
            .then(balances => {
                assert.strictEqual(balances.operator.toNumber(), finalFee4);
                console.log("Operator balance: " + balances.operator.toNumber());
                assert.strictEqual(balances.collected.toNumber(), finalFee4);
            });
        });

        it("Scenario 5 - Route price happens to be unknown, the operator updates the route price. Get refund(3)", function(){
            return operator.enterRoad.call(
                booth1, hashed1, { from: vehicle1, value: deposit5 })
            .then(success => assert.isTrue(success))
            .then(() => operator.enterRoad(
                booth1, hashed1, { from: vehicle1, value: deposit5 }))
            .then(tx =>{
                assert.strictEqual(tx.receipt.logs.length, 1);
                return operator.getVehicleEntry(hashed1);
            })
            .then(info => {
                assert.strictEqual(info[0], vehicle1);
                assert.strictEqual(info[1], booth1);
                assert.strictEqual(info[2].toNumber(), deposit5);
                return web3.eth.getBalancePromise(operator.address);
            })
            .then(balance => console.log("Entering the road balance: " + balance.toNumber()))
            .then(tx => operator.reportExitRoad.call(secret1, { from: booth2 }))
            .then(result => assert.strictEqual(result.toNumber(), 2))
            .then(() => operator.reportExitRoad(secret1, { from: booth2 }))
            .then(tx => {
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                const logExited = tx.logs[0];
                assert.strictEqual(logExited.event, "LogPendingPayment");
                assert.strictEqual(logExited.args.exitBooth, booth2);
                assert.strictEqual(logExited.args.exitSecretHashed, hashed1);
                return Promise.allNamed({
                    hashed0: () => operator.getVehicleEntry(hashed1)
                });
            })
            .then(() => operator.setRoutePrice(booth1, booth2, routePrice5, { from: owner1 }))
            .then(() =>  web3.eth.getBalancePromise(operator.address))
            .then(balance => {
                assert.strictEqual(balance.toNumber(), finalFee5);
                console.log("Operator balance: " + balance.toNumber());
            });
        });
        //Scenario 6
        //const routePrice6 = 6;
        //const vehicle1Deposit6 = 14;
        //const vehicle2Deposit6 = 10;
        //const finalFee6 = routePrice6 * multiplier1;
        it("Scenario 6 - Vehicle 1 and 2 enter the road. Vehicles get refund () after the operator updates the route price.", function(){
            return operator.enterRoad.call(
                booth1, hashed1, { from: vehicle1, value: vehicle1Deposit6 })
            .then(success => assert.isTrue(success))
            .then(() => operator.enterRoad(
                booth1, hashed1, { from: vehicle1, value: vehicle1Deposit6 }))
            .then(tx =>{
                assert.strictEqual(tx.receipt.logs.length, 1);
                return operator.getVehicleEntry(hashed1);
            })
            .then(info => {
                assert.strictEqual(info[0], vehicle1);
                assert.strictEqual(info[1], booth1);
                assert.strictEqual(info[2].toNumber(), vehicle1Deposit6);
                return web3.eth.getBalancePromise(operator.address);
            })
            .then(balance => console.log("Vehicle 1 - entering the road balance: " + balance.toNumber()))
            .then(() => operator.enterRoad(
                booth1, hashed2, { from: vehicle2, value: vehicle2Deposit6 }))
            .then(tx =>{
                //assert.strictEqual(tx.receipt.logs.length, 1);
                return operator.getVehicleEntry(hashed2);
            })
            .then(info => {
                assert.strictEqual(info[0], vehicle2);
                assert.strictEqual(info[1], booth1);
                assert.strictEqual(info[2].toNumber(), vehicle2Deposit6);
                return web3.eth.getBalancePromise(operator.address);
            })
            .then(balance => console.log("Vehicle 2 - entering the road balance: " + balance.toNumber()))
            .then(tx => operator.reportExitRoad.call(secret1, { from: booth2 }))
            .then(result => assert.strictEqual(result.toNumber(), 2))
            .then(() => operator.reportExitRoad(secret1, { from: booth2 }))
            .then(tx => operator.reportExitRoad.call(secret2, { from: booth2 }))
            .then(result => assert.strictEqual(result.toNumber(), 2))
            .then(() => operator.reportExitRoad(secret2, { from: booth2 }))
            .then(() => operator.setRoutePrice(booth1, booth2, routePrice6, { from: owner1 }))
            .then(() => operator.clearSomePendingPayments(booth1, booth2, 1, { from: owner1 }))
            .then(() =>  web3.eth.getBalancePromise(operator.address))
            .then(balance => {
                assert.strictEqual(balance.toNumber(), (finalFee6 * 2));
                console.log("Final operator's balance: " + balance.toNumber());
            });
        });
    });
});