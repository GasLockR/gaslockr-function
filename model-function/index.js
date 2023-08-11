const axios = require("axios");

module.exports = async function (context, myTimer) {
  if (myTimer.isPastDue) {
    context.log("JavaScript is running late!");
  }

  const INFURA_API_KEY = process.env.INFURA_API_KEY;

  try {
    const response = await axios.post(
      `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      {
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const gasPriceInHex = response.data.result;
    const gasPriceInDecimal = parseInt(gasPriceInHex, 16).toString(); // Convert hex to decimal

    const now = new Date();
    const formattedDate = `${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}${now
      .getHours()
      .toString()
      .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;

    const newEntity = {
      PartitionKey: "ETH",
      RowKey: formattedDate,
      gasPrice: gasPriceInDecimal,
    };

    context.bindings.outputTable = newEntity;
    context.log("Gas price fetched and added to Table Storage.");
  } catch (error) {
    context.log(`Error fetching gas price: ${error.message}`);
  }
};
