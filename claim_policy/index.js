const { ethers } = require("ethers");
const contractABI = require("./gasinsure-abi.json");
const chainlinFastGasABI = require("./chainlinkFastGas.json");

module.exports = async function (context, myTimer, inputTable) {
  var timeStamp = new Date().toISOString();

  if (myTimer.isPastDue) {
    context.log("JavaScript is running late!");
  }

  const privateKey = process.env.WALLET_PRIVATEKEY;

  // sepolia
  const sepoliaProvider = new ethers.providers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
  );

  // mainnet
  const mainnetProvider = new ethers.providers.JsonRpcProvider(
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
  );

  const sepoliaWallet = new ethers.Wallet(privateKey, sepoliaProvider);
  const mainnetWallet = new ethers.Wallet(privateKey, mainnetProvider);

  // chainlint fast gas acontract
  const chainlinkFastGasAddress = process.env.CHAINLINK_FAST_GAS_ADDRESS;
  const chainlinkFastGasContract = new ethers.Contract(
    chainlinkFastGasAddress,
    chainlinFastGasABI,
    mainnetWallet
  );

  // set gas contract
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const contract = new ethers.Contract(
    contractAddress,
    contractABI,
    sepoliaWallet
  );

  // Group by RowKey to get the latest data
  const latestData = inputTable.sort((a, b) =>
    a.RowKey < b.RowKey ? 1 : -1
  )[0];

  // Extract previousAnswer from the latest data
  const previousAnswer = latestData?.lastAnswer;
  context.log(`previousAnswer: ${previousAnswer}`);

  try {
    const roundData = await chainlinkFastGasContract.latestRoundData();
    const currentAnswer = roundData.answer.toString();
    context.log(`currentAnswer: ${currentAnswer}`);

    if (currentAnswer !== previousAnswer) {
      context.log("gas price update");
      const estimateGas = await contract.estimateGas.setGasPrice(currentAnswer);
      const gasLimit = estimateGas.add(ethers.BigNumber.from("10000"));

      const tx = await contract.setGasPrice(currentAnswer, {
        gasLimit: gasLimit,
      });

      context.log(`Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();
      context.log("Transaction was mined in block", receipt.blockNumber);

      // set new gas
      const newEntity = {
        PartitionKey: "GasPriceData",
        RowKey: timeStamp,
        lastAnswer: currentAnswer,
      };

      context.bindings.outputTable = newEntity;
      context.log(`insert new gas price: ${currentAnswer}`);
    } else {
      context.log("Answer hasn't changed. Not calling setGasPrice.");
    }
  } catch (error) {
    context.log.error("Error:", error);
  }

  context.log("JavaScript timer trigger function ran!", timeStamp);
};
