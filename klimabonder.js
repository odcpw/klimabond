const { Console } = require("console");

async function Launcher() {

// This prepares the Web3 interation. You need to install web3 with "npm install web3".
    const Web3 = require("web3");   
    const provider = "https://polygon-rpc.com";
    const web3 = new Web3(provider);

// Put your address and private key here
   //WARNING //
// NEVER share this file or put it online or share your screen with your private key visible!! //
    
    const myAddress = "public address here";
    const privateKey = "private key here";

// This loads the contract addresses and ABIs
    const KlimaBondABI = require("./KlimaBondDepositoryABI.js")["KlimaBondDepositoryABI"];
    const KlimaStakeABI = require("./KlimaStakeHelperABI.js")["KlimaStakeHelperABI"];
    const KlimaTokenABI = require("./KlimaTokenABI.js")["KlimaTokenABI"];
    const KlimaBondAddress = "0x1E0Dd93C81aC7Af2974cdB326c85B87Dd879389B";
    const KlimaStakeAddress = "0x4D70a031Fc76DA6a9bC0C922101A05FA95c3A227";
    const KlimaTokenContractAddress = "0x4e78011ce80ee02d2c3e649fb657e45898257815";
    
// Change the interval in hours that you want it to Redeem and Restake. 
// Note: Expected block time between rebases is 11520, or around 8 hours. But it varies with blocktime on Polygon.
    const hours = 1;
    const InteractInterval = hours * 60 * 60 * 1000;

// This is a generic js sleep function    
async function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
};

// Here is a function that checks and adjusts gas prices before each transaction.
async function getGas(){
    let GasPrice = await web3.eth.getGasPrice()
    GasPrice =
      parseInt(GasPrice) +
      parseInt(web3.utils.toHex(web3.utils.toWei("0.8888", "gwei")));
    GasPrice = GasPrice.toFixed(0);
    console.log("Gas Price is ", GasPrice);
    return(GasPrice)
}

// This will:
// 1) check if there is any Klima ready to be redeemed
// 2) prepare the transaction, gas, get the latest nonce, etc.
// 3) confirm receipt, or if there is no Klima bonding/redeeming, wait for the next bond to arrive
async function Redeem() {
    var KlimaBondContract= new web3.eth.Contract(KlimaBondABI, KlimaBondAddress);
    let AmountRedeemable = await KlimaBondContract.methods.pendingPayoutFor(myAddress).call().then(console.log());   
    console.log("There is Klima ready to be redeemed ", web3.utils.fromWei(AmountRedeemable, "gwei")); 
    
// Prepare Redeem Transaction Info
    if (AmountRedeemable > 0) {
      const QueryBondContract = KlimaBondContract.methods.redeem(myAddress, false);
      const QueryBondContractAbi = QueryBondContract.encodeABI();
      const rawTransactionRedeem = {
        from: myAddress,
        to: KlimaBondAddress,
        value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
        gasPrice: await getGas(),
        gas: 100000,
        chainId: 137,
        nonce: await web3.eth.getTransactionCount(myAddress, 'latest'),
        data: QueryBondContractAbi,
      }
//Redeem Bonded Klima Transaction      
      await web3.eth.accounts.signTransaction(rawTransactionRedeem, privateKey).then(signed => {
        const RedeemBonded = web3.eth
        .sendSignedTransaction(signed.rawTransaction)
        .on('transactionHash', hash => {
          console.log('=> hash for redeeming');
          console.log(hash);
          })
        .on('receipt', receipt => {
          console.log('=> receipt for redeeming OK!');
//      console.log(receipt);
        RedeemFlag = 1
        return (console.log("Redeeming done"))
        })
        .on('error', console.error);
      });
    } else {
    console.log("Waiting for next bond");
    }
}    

// This will:
// 1) check if there is any Klima balance ready to be stake
// 2) prepare the transaction, gas, get the latest nonce, etc.
// 3) confirm receipt, or tell when there is no Klima balance left. 
async function Restake(){
    var KlimaTokenContract= new web3.eth.Contract(KlimaTokenABI, KlimaTokenContractAddress);
    let KlimaBalance = await KlimaTokenContract.methods.balanceOf(myAddress).call()//.then(console.log());
    console.log("There is Klima ready to be staked ", web3.utils.fromWei(KlimaBalance, "gwei"));
    
// Prepare Restake Transaction Info
    if (KlimaBalance > 0) {
    var KlimaStakeContract= new web3.eth.Contract(KlimaStakeABI, KlimaStakeAddress);
    const QueryStakingContract = KlimaStakeContract.methods.stake(KlimaBalance);
    const QueryStakingContractAbi = QueryStakingContract.encodeABI();
    const rawTransactionStake = {
      from: myAddress,
      to: KlimaStakeAddress,
      value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
      gasPrice: await getGas(),
      gas: 1000000,
      chainId: 137,
      nonce: await web3.eth.getTransactionCount(myAddress, 'latest'),
      data: QueryStakingContractAbi,
    };
    
// Stake Free Klima transaction
    await web3.eth.accounts.signTransaction(rawTransactionStake, privateKey).then(signed => {
    const StakeKlima = web3.eth
      .sendSignedTransaction(signed.rawTransaction)
      .on('transactionHash', hash => {
        console.log('=> hash for staking');
        console.log(hash);
      })
      .on('receipt', receipt => {
        console.log('=> receipt for staking OK!');
//      console.log(receipt);
        return(console.log("Restaking done"))
      })
      .on('error', console.error);
      });
    } else {
    console.log("No Klima to restake");
    }
}


// This will call Redeem, wait to make sure it's done
// Then it will Restake
// Then it will wait for the interval given above to loop again.
async function looper(){
  await Redeem();
  do{await sleep (10000)} while (RedeemFlag=0);
  await Restake();
  console.log('Waiting for rebase'); 
  setInterval(looper, InteractInterval);
  }
looper();


}
Launcher();
