var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var ethUtil = require("ethereumjs-util");

// var ethABI = require("ethereumjs-abi");
// waiting for Solidity pack Array support (vrolland did a pull request)
var ethABI = require("../../../lib/ethereumjs-abi-perso.js"); 

const BN = require('bn.js')

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestERC20 = artifacts.require("./synchrone/RequestERC20.sol");
var TestToken = artifacts.require("./test/synchrone/TestToken.sol");

contract('RequestERC20 createRequestAsPayerAction',  function(accounts) {
	var admin = accounts[0];
	var burnerContract = accounts[1];

	var payerRefund = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	var payee2 = accounts[5];
	var payee3 = accounts[6];

	var payeePayment = accounts[7];
	var payee2Payment = accounts[8];
	var payee3Payment = accounts[9];

	var requestCore;
	var requestERC20;
	var testToken;

	var minterAmount = '1000000000000000000';
	var arbitraryAmount = 100000;
	var arbitraryAmount10percent = 10000;
	var arbitraryAmount2 = 20000;
	var arbitraryAmount3 = 30000;

	beforeEach(async () => {
		testToken = await TestToken.new(payer, minterAmount);
		requestCore = await RequestCore.new();
		requestERC20 = await RequestERC20.new(requestCore.address, burnerContract, testToken.address, {from:admin});
		await requestCore.adminAddTrustedCurrencyContract(requestERC20.address, {from:admin});
	});


	it("new request more than expectedAmount OK", async function () {
		await testToken.approve(requestERC20.address, arbitraryAmount+1, {from:payer});
		var r = await requestERC20.createRequestAsPayerAction([payee], [arbitraryAmount], 0, [arbitraryAmount+1], [arbitraryAmount10percent],"", {from:payer});

		assert.equal(r.receipt.logs.length,5,"Wrong number of events");

		var l = utils.getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[0].topics[1],utils.getRequestId(requestCore.address, 1),"Event Created wrong args requestId");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[0].topics[2]).toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[0].topics[3]).toLowerCase(),payer,"Event Created wrong args payer");
		assert.equal(l.data[0].toLowerCase(),payer,"Event Created wrong args creator");
		assert.equal(l.data[1],'',"Event Created wrong args data");

		var l = utils.getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[1].topics[1],utils.getRequestId(requestCore.address, 1),"Event Accepted wrong args requestId");

		var l = utils.getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"UpdateExpectedAmount","Event UpdateExpectedAmount is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[2].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateExpectedAmount wrong args requestId");
		assert.equal(l.data[0],0,"Event UpdateExpectedAmount wrong args payeeIndex");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event UpdateExpectedAmount wrong args amount");

		var l = utils.getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[3].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[0],0,"Event UpdateBalance wrong args payeeIndex");
		assert.equal(l.data[1],arbitraryAmount+1,"Event UpdateBalance wrong args amountPaid");

		var l = utils.getEventFromReceipt(r.receipt.logs[4], testToken.abi);
		assert.equal(l.name,"Transfer","Event Transfer is missing after paymentAction()");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[4].topics[1]),payer,"Event Transfer wrong args from");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[4].topics[2]),payee,"Event Transfer wrong args to");
		assert.equal(l.data[0],arbitraryAmount+1,"Event Transfer wrong args value");

		var newReq = await requestCore.getRequest.call(utils.getRequestId(requestCore.address, 1));
		
		assert.equal(newReq[3],payee,"new request wrong data : payee");
		assert.equal(newReq[0],payer,"new request wrong data : payer");
		assert.equal(newReq[4],arbitraryAmount+arbitraryAmount10percent,"new request wrong data : expectedAmount");
		assert.equal(newReq[1],requestERC20.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount+1,"new request wrong data : amountPaid");
		assert.equal(newReq[2],1,"new request wrong data : state");
	});

	it("new request with tips OK", async function () {
		await testToken.approve(requestERC20.address, arbitraryAmount, {from:payer});
		var r = await requestERC20.createRequestAsPayerAction([payee], [arbitraryAmount], 0, [arbitraryAmount], [arbitraryAmount10percent],"", {from:payer});

		assert.equal(r.receipt.logs.length,5,"Wrong number of events");

		var l = utils.getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[0].topics[1],utils.getRequestId(requestCore.address, 1),"Event Created wrong args requestId");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[0].topics[2]).toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[0].topics[3]).toLowerCase(),payer,"Event Created wrong args payer");
		assert.equal(l.data[0].toLowerCase(),payer,"Event Created wrong args creator");
		assert.equal(l.data[1],'',"Event Created wrong args data");

		var l = utils.getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[1].topics[1],utils.getRequestId(requestCore.address, 1),"Event Accepted wrong args requestId");

		var l = utils.getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"UpdateExpectedAmount","Event UpdateExpectedAmount is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[2].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateExpectedAmount wrong args requestId");
		assert.equal(l.data[0],0,"Event UpdateExpectedAmount wrong args payeeIndex");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event UpdateExpectedAmount wrong args amount");

		var l = utils.getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[3].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[0],0,"Event UpdateBalance wrong args payeeIndex");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amountPaid");

		var l = utils.getEventFromReceipt(r.receipt.logs[4], testToken.abi);
		assert.equal(l.name,"Transfer","Event Transfer is missing after paymentAction()");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[4].topics[1]),payer,"Event Transfer wrong args from");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[4].topics[2]),payee,"Event Transfer wrong args to");
		assert.equal(l.data[0],arbitraryAmount,"Event Transfer wrong args value");

		var newReq = await requestCore.getRequest.call(utils.getRequestId(requestCore.address, 1));
		
		assert.equal(newReq[3],payee,"new request wrong data : payee");
		assert.equal(newReq[0],payer,"new request wrong data : payer");
		assert.equal(newReq[4],arbitraryAmount+arbitraryAmount10percent,"new request wrong data : expectedAmount");
		assert.equal(newReq[1],requestERC20.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[2],1,"new request wrong data : state");
	});

	it("new request empty arrays impossible", async function () {
		await testToken.approve(requestERC20.address, arbitraryAmount, {from:payer});

		var r = await utils.expectThrow(requestERC20.createRequestAsPayerAction([], [], 0, [arbitraryAmount], [], "", 
									{from:payer}));
	});

	it("new request payee==payer impossible", async function () {
		await testToken.approve(requestERC20.address, arbitraryAmount, {from:payer});

		var r = await utils.expectThrow(requestERC20.createRequestAsPayerAction([payer], [arbitraryAmount], 0, [arbitraryAmount], [], "", 
									{from:payer}));
	});

	it("new request payee==0 impossible", async function () {
		await testToken.approve(requestERC20.address, arbitraryAmount, {from:payer});
		var r = await utils.expectThrow(requestERC20.createRequestAsPayerAction([0], [arbitraryAmount], 0, [arbitraryAmount], [], "", 
									{from:payer}));
	});

	it("new request msg.sender==payee impossible", async function () {
		await testToken.approve(requestERC20.address, arbitraryAmount, {from:payer});
		var r = await utils.expectThrow(requestERC20.createRequestAsPayerAction([payee], [arbitraryAmount], 0, [arbitraryAmount], [], "", 
									{from:payee}));
	});

	it("impossible to createQuickquick request if Core Paused", async function () {
		await requestCore.pause({from:admin});
		await testToken.approve(requestERC20.address, arbitraryAmount, {from:payer});

		var r = await utils.expectThrow(requestERC20.createRequestAsPayerAction([payee], [arbitraryAmount], 0, [arbitraryAmount], [], "", 
									{from:payer}));
	});

	it("new request when currencyContract not trusted Impossible", async function () {
		var requestERC202 = await RequestERC20.new(requestCore.address,{from:admin});
		await testToken.approve(requestERC20.address, arbitraryAmount, {from:payer});
		await utils.expectThrow(requestERC202.createRequestAsPayerAction([payee], [arbitraryAmount], 0, [arbitraryAmount], [], "", {from:payer}));
	});

	it("new request from payer with 3 payees all paid OK with tips no payment address", async function () {

		await testToken.approve(requestERC20.address, arbitraryAmount+arbitraryAmount2+arbitraryAmount3+6, {from:payer});

		var r = await requestERC20.createRequestAsPayerAction([payee, payee2, payee3], [arbitraryAmount,arbitraryAmount2,arbitraryAmount3], 0, [arbitraryAmount+1,arbitraryAmount2+2,arbitraryAmount3+3], [1,2,3], "", 
													{from:payer});

		assert.equal(r.receipt.logs.length,13,"Wrong number of events");

		var l = utils.getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[0].topics[1],utils.getRequestId(requestCore.address, 1),"Event Created wrong args requestId");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[0].topics[2]).toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[0].topics[3]).toLowerCase(),payer,"Event Created wrong args payer");
		assert.equal(l.data[0].toLowerCase(),payer,"Event Created wrong args creator");
		assert.equal(l.data[1],'',"Event Created wrong args data");

		var l = utils.getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"NewSubPayee","Event NewSubPayee is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[1].topics[1],utils.getRequestId(requestCore.address, 1),"Event NewSubPayee wrong args requestId");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[1].topics[2]).toLowerCase(),payee2,"Event NewSubPayee wrong args payee");

		var l = utils.getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"NewSubPayee","Event NewSubPayee is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[2].topics[1],utils.getRequestId(requestCore.address, 1),"Event NewSubPayee wrong args requestId");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[2].topics[2]).toLowerCase(),payee3,"Event NewSubPayee wrong args payee");

		var l = utils.getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[3].topics[1],utils.getRequestId(requestCore.address, 1),"Event Accepted wrong args requestId");

		var l = utils.getEventFromReceipt(r.receipt.logs[4], requestCore.abi);
		assert.equal(l.name,"UpdateExpectedAmount","Event UpdateExpectedAmount is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[4].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateExpectedAmount wrong args requestId");
		assert.equal(l.data[0],0,"Event UpdateExpectedAmount wrong args payeeIndex");
		assert.equal(l.data[1],1,"Event UpdateExpectedAmount wrong args amount");

		var l = utils.getEventFromReceipt(r.receipt.logs[5], requestCore.abi);
		assert.equal(l.name,"UpdateExpectedAmount","Event UpdateExpectedAmount is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[5].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateExpectedAmount wrong args requestId");
		assert.equal(l.data[0],1,"Event UpdateExpectedAmount wrong args payeeIndex");
		assert.equal(l.data[1],2,"Event UpdateExpectedAmount wrong args amount");

		var l = utils.getEventFromReceipt(r.receipt.logs[6], requestCore.abi);
		assert.equal(l.name,"UpdateExpectedAmount","Event UpdateExpectedAmount is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[6].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateExpectedAmount wrong args requestId");
		assert.equal(l.data[0],2,"Event UpdateExpectedAmount wrong args payeeIndex");
		assert.equal(l.data[1],3,"Event UpdateExpectedAmount wrong args amount");

		var l = utils.getEventFromReceipt(r.receipt.logs[7], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[7].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[0],0,"Event UpdateBalance wrong args payeeIndex");
		assert.equal(l.data[1],arbitraryAmount+1,"Event UpdateBalance wrong args amountPaid");

		var l = utils.getEventFromReceipt(r.receipt.logs[8], testToken.abi);
		assert.equal(l.name,"Transfer","Event Transfer is missing after paymentAction()");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[8].topics[1]),payer,"Event Transfer wrong args from");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[8].topics[2]),payee,"Event Transfer wrong args to");
		assert.equal(l.data[0],arbitraryAmount+1,"Event Transfer wrong args value");

		var l = utils.getEventFromReceipt(r.receipt.logs[9], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[9].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[0],1,"Event UpdateBalance wrong args payeeIndex");
		assert.equal(l.data[1],arbitraryAmount2+2,"Event UpdateBalance wrong args amountPaid");

		var l = utils.getEventFromReceipt(r.receipt.logs[10], testToken.abi);
		assert.equal(l.name,"Transfer","Event Transfer is missing after paymentAction()");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[10].topics[1]),payer,"Event Transfer wrong args from");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[10].topics[2]),payee2,"Event Transfer wrong args to");
		assert.equal(l.data[0],arbitraryAmount2+2,"Event Transfer wrong args value");

		var l = utils.getEventFromReceipt(r.receipt.logs[11], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after createRequestAsPayerAction()");
		assert.equal(r.receipt.logs[11].topics[1],utils.getRequestId(requestCore.address, 1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[0],2,"Event UpdateBalance wrong args payeeIndex");
		assert.equal(l.data[1],arbitraryAmount3+3,"Event UpdateBalance wrong args amountPaid");

		var l = utils.getEventFromReceipt(r.receipt.logs[12], testToken.abi);
		assert.equal(l.name,"Transfer","Event Transfer is missing after paymentAction()");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[12].topics[1]),payer,"Event Transfer wrong args from");
		assert.equal(utils.bytes32StrToAddressStr(r.receipt.logs[12].topics[2]),payee3,"Event Transfer wrong args to");
		assert.equal(l.data[0],arbitraryAmount3+3,"Event Transfer wrong args value");

		var newReq = await requestCore.getRequest.call(utils.getRequestId(requestCore.address, 1));		
		assert.equal(newReq[3],payee,"new request wrong data : payee");
		assert.equal(newReq[0],payer,"new request wrong data : payer");
		assert.equal(newReq[4],arbitraryAmount+1,"new request wrong data : expectedAmount");
		assert.equal(newReq[1],requestERC20.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount+1,"new request wrong data : amountPaid");
		assert.equal(newReq[2],1,"new request wrong data : state");

		var count = await requestCore.getSubPayeesCount.call(utils.getRequestId(requestCore.address,1));
		assert.equal(count,2,"number of subPayee wrong");

		var r = await requestCore.subPayees.call(utils.getRequestId(requestCore.address, 1),0);	
		assert.equal(r[0],payee2,"request wrong data : payer");
		assert.equal(r[1],arbitraryAmount2+2,"new request wrong data : expectedAmount");
		assert.equal(r[2],arbitraryAmount2+2,"new request wrong data : balance");

		var r = await requestCore.subPayees.call(utils.getRequestId(requestCore.address, 1),1);	
		assert.equal(r[0],payee3,"request wrong data : payer");
		assert.equal(r[1],arbitraryAmount3+3,"new request wrong data : expectedAmount");
		assert.equal(r[2],arbitraryAmount3+3,"new request wrong data : balance");
	});

	it("impossible to createRequest if msg.value < fees", async function () {
		// 0.1% fees & 0.002 ether max
		await requestERC20.setRateFees(1, 1000, {from:admin}); // 0.1%
		await requestERC20.setMaxCollectable('2000000000000000', {from:admin}); // 0.002 ether

		var fees = await requestERC20.collectEstimation(arbitraryAmount);
		await utils.expectThrow(requestERC20.createRequestAsPayerAction([payee], [arbitraryAmount], 0, [arbitraryAmount], [arbitraryAmount10percent],"", {from:payer, value:fees.add(arbitraryAmount).minus(1)}));
	});

	it("impossible to createRequest if msg.value > fees", async function () {
		// 0.1% fees & 0.002 ether max
		await requestERC20.setRateFees(1, 1000, {from:admin}); // 0.1%
		await requestERC20.setMaxCollectable('2000000000000000', {from:admin}); // 0.002 ether

		var fees = await requestERC20.collectEstimation(arbitraryAmount);
		await utils.expectThrow(requestERC20.createRequestAsPayerAction([payee], [arbitraryAmount], 0, [arbitraryAmount], [arbitraryAmount10percent],"", {from:payer, value:fees.add(arbitraryAmount).add(1)}));
	});

});

