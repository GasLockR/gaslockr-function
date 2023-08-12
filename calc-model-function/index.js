const WINDOW_SIZE = 90; // 二叉树模型的时间窗口大小为90天
const SLIDING_WINDOW_SIZE = 7; // 滑动窗口大小为7天，用于计算lockGas
const u = 1.1;
const d = 0.9;
const q = 0.5;
const DISCOUNT_RATE = 0.02;

// 二叉树模型计算
function calculateTreePrice(currentPrice, discount) {
  const tree = new Array(WINDOW_SIZE + 1)
    .fill(0)
    .map(() => new Array(WINDOW_SIZE + 1).fill(0));

  for (let j = 0; j <= WINDOW_SIZE; j++) {
    tree[WINDOW_SIZE][j] =
      currentPrice * Math.pow(u, j) * Math.pow(d, WINDOW_SIZE - j);
  }

  for (let i = WINDOW_SIZE - 1; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      tree[i][j] =
        discount * (q * tree[i + 1][j + 1] + (1 - q) * tree[i + 1][j]);
    }
  }

  return tree[0][0];
}

// 计算波动率
function calculateFluctuation(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((acc, val) => acc + val, 0) / returns.length;
  const variance =
    returns.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    returns.length;
  return Math.sqrt(variance);
}

module.exports = async function (context, myTimer, inputTable) {
  if (myTimer.isPastDue) {
    context.log("JavaScript is running late!");
  }

  const endTime = new Date();
  const startTime = new Date(endTime);
  startTime.setDate(endTime.getDate() - SLIDING_WINDOW_SIZE); // 使用7天滑动窗口来计算lockGas

  const relevantData = inputTable.filter((entry) => {
    const date = new Date(
      entry.RowKey.substring(0, 4),
      entry.RowKey.substring(4, 6) - 1,
      entry.RowKey.substring(6, 8)
    );
    return date >= startTime && date <= endTime;
  });

  const prices = relevantData.map((entry) => Number(entry.gasPrice));
  const lockGas = prices.reduce((acc, price) => acc + price, 0) / prices.length; // 使用过去7天的数据来计算lockGas

  const policyPrice = calculateTreePrice(lockGas, DISCOUNT_RATE);
  const compensationAmount = calculateTreePrice(lockGas, 1);
  const fluctuation = calculateFluctuation(prices);

  const result = {
    PartitionKey: "ETH",
    RowKey: new Date().toISOString(),
    lockGas: lockGas.toString(),
    policyPrice: policyPrice.toString(),
    fluctuation: fluctuation.toString(),
    compensationAmount: compensationAmount.toString(),
    activeDays: SLIDING_WINDOW_SIZE.toString(),
    type: "normal",
  };

  context.bindings.outputTable = result;
  context.log("数据计算完成并存储于PriceModel中。");
};
