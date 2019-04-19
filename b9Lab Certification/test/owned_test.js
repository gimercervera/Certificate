const expectedExceptionPromise = require("../utils/expectedException.js");
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
const Promise = require("bluebird");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

var Owned = artifacts.require("./Owned.sol");

contract('Test Owned', function(accounts){
    let owner0, owner1, owned;
    const addressZero = "0x0000000000000000000000000000000000000000";

    before(function(){
        assert.isAtLeast(accounts.length, 2);
        owner0 = accounts[0];
        owner1 = accounts[1];

        return Owned.new({from: owner0})
        .then(function(instance){
            owned = instance;
        });
    });

    describe("getOwner", function() {
        it("should have correct initial value", function() {
            return owned.getOwner()
                .then(owner => assert.strictEqual(owner, owner0));
        });

        it("should be possible to ask for owner from any address", function() {
            return owned.getOwner({ from: owner1 })
                .then(owner => assert.strictEqual(owner, owner0));
        });

        it("should not be possible to send a transaction with value to getOwner", function() {
            return owned.getOwner.sendTransaction({ from: owner1, value: 1 })
                .then(
                    () => assert.throw("should not have reached here"),
                    e => assert.isAtLeast(e.message.indexOf("non-payable function"), 0));
        });
    });

    describe("setOwner", function() {
        it("should not be possible to set owner if asking from wrong owner", function() {
            return expectedExceptionPromise(
                () => owned.setOwner(owner1, { from: owner1, gas: 3000000 }), 3000000);
        });

        it("should not be possible to set owner if to 0", function() {
            return expectedExceptionPromise(
                () => owned.setOwner(addressZero, { from: owner0, gas: 3000000 }),
                3000000);
        });

        it("should not be possible to set owner if is the same owner", function() {
            return expectedExceptionPromise(
                () => owned.setOwner(owner0, { from: owner0, gas: 3000000 }),
                3000000);
        });

        it("should not be possible to set owner if pass value", function() {
            return owned.setOwner(owner1, { from: owner0, value: 1 })
                .then(
                    () => assert.throw("should not have reached here"),
                    e => assert.isAtLeast(e.message.indexOf("non-payable function"), 0));
        });

        it("should be possible to set owner", function() {
            return owned.setOwner.call(owner1, { from: owner0 })
                .then(success => assert.isTrue(success))
                .then(() => owned.setOwner(owner1, { from: owner0 }))
                .then(tx => {
                    assert.strictEqual(tx.receipt.logs.length, 1);
                    assert.strictEqual(tx.logs.length, 1);
                    const logChanged = tx.logs[0];
                    assert.strictEqual(logChanged.event, "LogOwnerSet");
                    assert.strictEqual(logChanged.args.previousOwner, owner0);
                    assert.strictEqual(logChanged.args.newOwner, owner1);
                    // console.log(tx.receipt.gasUsed);
                    return owned.getOwner();
                })
                .then(owner => assert.strictEqual(owner, owner1));
        });

    });

});