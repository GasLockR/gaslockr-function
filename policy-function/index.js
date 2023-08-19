const { ethers } = require("ethers");

const contractABI = require("./gasinsure-abi.json");

module.exports = async function (context, myTimer, inputTable) {
  if (myTimer.isPastDue) {
    context.log("JavaScript is running late!");
  }

  if (inputTable.length === 0) {
    context.log("No data available in PriceModel7Days table storage.");
    return;
  }

  // group by RowKey，get latest data
  const latestData = inputTable.sort((a, b) =>
    a.RowKey < b.RowKey ? 1 : -1
  )[0];

  let provider = new ethers.providers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
  );

  const privateKey = process.env.WALLET_PRIVATEKEY;
  const wallet = new ethers.Wallet(privateKey, provider);

  const contractAddress = process.env.CONTRACT_ADDRESS;

  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  context.log("Latest data from PriceModel7Days table storage:");
  for (const key in latestData) {
    context.log(`${key}: ${latestData[key]}`);
  }

  const policyType = 0;
  const policyTerm = 0;
  const targetGasPrice = ethers.utils.parseUnits("10", "wei"); // Assuming lockGas is in wei
  const premium = ethers.utils.parseUnits("20", "wei"); // Assuming policyPrice is in wei
  const benefit = ethers.utils.parseUnits("30", "wei"); // Assuming compensationAmount is in wei
  const volatility = 20;

  try {
    const estimateGas = await contract.estimateGas.setPolicy(
      policyType,
      policyTerm,
      targetGasPrice,
      premium,
      benefit,
      volatility
    );
    const gasLimit = estimateGas.add(ethers.BigNumber.from("10000")); // adding some buffer

    let tx = await contract.setPolicy(
      policyType,
      policyTerm,
      targetGasPrice,
      premium,
      benefit,
      volatility,
      {
        gasLimit: gasLimit,
      }
    );
    let receipt = await tx.wait();
    context.log(`Transaction hash: ${receipt.transactionHash}`);
  } catch (error) {
    context.log(`Error in sending transaction: ${error.message}`);
  }
};
