const cost = document.getElementById("cost");
const sell = document.getElementById("sell");
const stock = document.getElementById("stock");

const total = document.getElementById("total");
const profit = document.getElementById("profit");

function calculate() {
  let c = parseFloat(cost.value) || 0;
  let s = parseFloat(sell.value) || 0;
  let qty = parseFloat(stock.value) || 0;

  let totalValue = qty * c;
  let profitValue = (s - c) * qty;

  total.innerText = "Rs " + totalValue;
  profit.innerText = "Rs " + profitValue;
}

// 🔥 LIVE UPDATE
cost.addEventListener("input", calculate);
sell.addEventListener("input", calculate);
stock.addEventListener("input", calculate);
