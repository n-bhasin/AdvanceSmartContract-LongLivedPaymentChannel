const LongLivedPaymentChannel = artifacts.require("LongLivedPaymentChannel");

contract(
  "Recipient should be able to withdraw amount and then close",
  (accounts) => {
    // declare all global variables here
    let contractInstance;
    let contractAddress;
    let longLivedPaymentChannelTx;
    const skey =
      "dec072ad7e4cf54d8bce9ce5b0d7e95ce8473a35f6ce65ab414faea436a2ee86"; // private key
    web3.eth.accounts.wallet.add(`0x${skey}`);
    const masterAccount = accounts[0];
    const sender = web3.eth.accounts.wallet[0].address;
    const senderSkey = web3.eth.accounts.wallet[0].privateKey;
    const recipient = accounts[1];
    const closeDuration = 200;
    const depositAmount = web3.utils.toWei("2", "ether");
    // sender can open the channel (deploy contract and deposit funds)
    before(async () => {
      await web3.eth.sendTransaction({
        from: masterAccount,
        to: sender,
        value: web3.utils.toWei("5", "ether"),
        gas: 21000,
      });
      contractInstance = new web3.eth.Contract(LongLivedPaymentChannel.abi);

      const gas = await contractInstance
        .deploy({
          data: LongLivedPaymentChannel.bytecode,
          from: sender,
          value: depositAmount,
          arguments: [recipient, closeDuration],
        })
        .estimateGas();
      //console.log("Gas value", gas);
      //deploying the contract
      longLivedPaymentChannelTx = await contractInstance
        .deploy({
          data: LongLivedPaymentChannel.bytecode,
          arguments: [recipient, closeDuration],
        })
        .send({
          from: sender,
          gas,
          value: depositAmount,
        });
      contractAddress = longLivedPaymentChannelTx.options.address;
      const actualSender = await longLivedPaymentChannelTx.methods
        .sender()
        .call({
          from: recipient,
        });
      const actualRecipient = await longLivedPaymentChannelTx.methods
        .recipient()
        .call({
          from: accounts[2],
        });
      const actualCloseDuration = await longLivedPaymentChannelTx.methods
        .closeDuration()
        .call({
          from: accounts[2],
        });
      const actualDepositedAmount = await web3.eth.getBalance(contractAddress);
      // assertions
      // console.log("Amount deposited", actualDepositedAmount);
      assert.equal(actualSender, sender, "Sender is not as expected");
      assert.equal(
        actualDepositedAmount,
        depositAmount,
        "The deposited amount is as expected"
      );
      assert.equal(actualRecipient, recipient, "The recipient is as expected");
      assert.equal(
        actualCloseDuration,
        closeDuration,
        "closeDuration is not as expected"
      );
    });

    it("the recipient should be able to withdraw from the channel", async () => {
      // code that will sign for recipient to withdraw
      // code that will use this sign as well as recipient as caller of `withdraw` function
      // the recipient should be able to close the channel
      // make necessary assertions to validate balance of sender and recipient

      //create and sign the message

      const claimAmount = web3.utils.toWei("1", "ether");
      const message = web3.utils.soliditySha3(
        { t: "address", v: contractAddress },
        { t: "uint256", v: claimAmount }
      );

      const sig = await web3.eth.accounts.sign(message, senderSkey);
      const acutualSignature = sig.signature;

      const recipientBalanceBefore = await web3.eth.getBalance(recipient);

      const withdrawTx = await longLivedPaymentChannelTx.methods
        .withdraw(claimAmount, acutualSignature)
        .send({ from: recipient });

      const recipientBalanceAfter = await web3.eth.getBalance(recipient);

      //extracting the Txfee
      const tx = await web3.eth.getTransaction(withdrawTx.transactionHash);

      const transactionFee = web3.utils
        .toBN(tx.gasPrice)
        .mul(web3.utils.toBN(withdrawTx.gasUsed));

      const calculatedBalance = web3.utils
        .toBN(recipientBalanceBefore)
        .add(web3.utils.toBN(claimAmount))
        .sub(web3.utils.toBN(transactionFee));

      assert.equal(
        calculatedBalance,
        recipientBalanceAfter,
        "this is not expected balance"
      );
    });

    it("should able to close the payment channel", async () => {
      await web3.eth.sendTransaction({
        from: masterAccount,
        to: sender,
        value: web3.utils.toWei("5", "ether"),
        gas: 21000,
      });
      contractInstance = new web3.eth.Contract(LongLivedPaymentChannel.abi);

      const gas = await contractInstance
        .deploy({
          data: LongLivedPaymentChannel.bytecode,
          from: sender,
          value: depositAmount,
          arguments: [recipient, closeDuration],
        })
        .estimateGas();
      //console.log("Gas value", gas);
      //deploying the contract
      const longLivedPaymentChannelTx = await contractInstance
        .deploy({
          data: LongLivedPaymentChannel.bytecode,
          arguments: [recipient, closeDuration],
        })
        .send({
          from: sender,
          gas,
          value: depositAmount,
        });
      contractAddress = longLivedPaymentChannelTx.options.address;

      const claimAmount = web3.utils.toWei("1", "ether");
      const message = web3.utils.soliditySha3(
        { t: "address", v: contractAddress },
        { t: "uint256", v: claimAmount }
      );

      const sig = await web3.eth.accounts.sign(message, senderSkey);
      const acutualSignature = sig.signature;

      const recipientBalanceBefore = await web3.eth.getBalance(recipient);
      console.log("recipientBalanceBefore", recipientBalanceBefore);

      const closeTx = await longLivedPaymentChannelTx.methods
        .close(claimAmount, acutualSignature)
        .send({ from: recipient });

      const recipientBalanceAfter = await web3.eth.getBalance(recipient);

      //extracting the Txfee
      const tx = await web3.eth.getTransaction(closeTx.transactionHash);

      const transactionFee = web3.utils
        .toBN(tx.gasPrice)
        .mul(web3.utils.toBN(closeTx.gasUsed));

      const calculatedBalance = web3.utils
        .toBN(recipientBalanceBefore)
        .add(web3.utils.toBN(claimAmount))
        .sub(web3.utils.toBN(transactionFee));

      assert.equal(
        calculatedBalance,
        recipientBalanceAfter,
        "this is not expected balance"
      );
    });
  }
);

//before withdraw 100000000000000000000
//1000000000000000000 = 101000000000000000000 - 119318000000000;

//after withdraw: 100999880682000000000
//after closing
//after: 100999842668000000000

//txfee: 119318000000000

//before: 100999880682000000000
//adding claimAmount = 101999880682000000000
//txFee:                      38014000000000

//actual bal:  100999842668000000000
