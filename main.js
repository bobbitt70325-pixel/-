import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjtrDhYim0RT6e5Fa7MOrJb68Np6eoDCA",
  authDomain: "leecarfactory.firebaseapp.com",
  projectId: "leecarfactory",
  storageBucket: "leecarfactory.firebasestorage.app",
  messagingSenderId: "219102819768",
  appId: "1:219102819768:web:4015b4777885a5b58a8b4d",
  measurementId: "G-5CMJETT3MZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const recordsRef = collection(db, "profitRecords");

let lastCaseData = null;
let lastCarData = null;
let mobileType = null;
let mobileLastData = null;

const today = new Date().toISOString().split("T")[0];

setValue("caseDate", today);
setValue("carDate", today);
setValue("mCaseDate", today);
setValue("mCarDate", today);

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.value = value;
  }
}

function money(num) {
  return "$" + Math.round(Number(num || 0)).toLocaleString();
}

function getNumber(id) {
  return Number(document.getElementById(id).value) || 0;
}

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function mGetNumber(id) {
  return Number(document.getElementById(id).value) || 0;
}

function mGetValue(id) {
  return document.getElementById(id).value.trim();
}

function getBonusRate(bonusBase) {
  if (bonusBase <= 10000) {
    return 0.1;
  }

  if (bonusBase <= 20000) {
    return 0.15;
  }

  return 0.2;
}

function calculateCaseCore({ date, name, customer, plate, sales, note, income, cost }) {
  const profit = income - cost;

  let fund = 0;
  let bonusBase = 0;
  let bonusRate = 0;
  let bonus = 0;
  let remainProfit = 0;
  let baseShare = 0;
  let boyfriendShare = 0;
  let brotherShare = 0;

  if (profit > 0) {
    fund = profit * 0.1;
    bonusBase = profit - fund;
    bonusRate = getBonusRate(bonusBase);
    bonus = bonusBase * bonusRate;
    remainProfit = profit - fund - bonus;
    baseShare = remainProfit / 2;

    boyfriendShare = baseShare;
    brotherShare = baseShare;

    if (sales === "李彥伯") {
      boyfriendShare += bonus;
    } else if (sales === "李承灃") {
      brotherShare += bonus;
    } else if (sales === "共同成交") {
      boyfriendShare += bonus / 2;
      brotherShare += bonus / 2;
    }
  } else {
    remainProfit = profit;
    baseShare = profit / 2;
    boyfriendShare = baseShare;
    brotherShare = baseShare;
  }

  return {
    type: "一般案件",
    date,
    name,
    customer,
    plate,
    sales,
    note,
    income,
    cost,
    profit,
    fund,
    bonusBase,
    bonusRate,
    bonus,
    remainProfit,
    baseShare,
    boyfriendShare,
    brotherShare
  };
}

function getSalesBonusText(sales, targetPerson, bonus) {
  if (sales === "共同成交") {
    return money(bonus / 2);
  }

  if (sales === targetPerson) {
    return money(bonus);
  }

  return "$0";
}

window.showPage = function(pageId, btn) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".nav button").forEach(button => {
    button.classList.remove("active");
  });

  btn.classList.add("active");

  if (pageId === "recordsPage") {
    loadRecords();
  }
};

window.calculateCase = function() {
  const income = getNumber("caseIncome");

  if (income <= 0) {
    alert("請輸入客戶收費");
    return;
  }

  const data = calculateCaseCore({
    date: getValue("caseDate"),
    name: getValue("caseName") || "未命名案件",
    customer: getValue("caseCustomer") || "未填客戶",
    plate: getValue("casePlate") || "未填車牌",
    sales: getValue("caseSales"),
    note: getValue("caseNote"),
    income,
    cost: getNumber("caseCost")
  });

  document.getElementById("caseProfitText").textContent = money(data.profit);
  document.getElementById("caseFundText").textContent = money(data.fund);
  document.getElementById("caseBonusText").textContent = money(data.bonus);
  document.getElementById("caseBoyfriendText").textContent = money(data.boyfriendShare);
  document.getElementById("caseBrotherText").textContent = money(data.brotherShare);

  if (data.profit > 0) {
    document.getElementById("caseProcess").innerHTML = `
      <b>計算過程：</b>
      案件淨利 = 客戶收費 ${money(data.income)} - 總成本 ${money(data.cost)} = ${money(data.profit)}<br>
      設備基金 = 案件淨利 ${money(data.profit)} × 10% = ${money(data.fund)}<br>
      業務獎金計算基礎 = 案件淨利 ${money(data.profit)} - 設備基金 ${money(data.fund)} = ${money(data.bonusBase)}<br>
      業務獎金比例 = ${(data.bonusRate * 100).toFixed(0)}%<br>
      業務獎金 = ${money(data.bonusBase)} × ${(data.bonusRate * 100).toFixed(0)}% = ${money(data.bonus)}<br>
      本案業務成交人：${data.sales}<br>
      剩餘利潤 = 案件淨利 ${money(data.profit)} - 設備基金 ${money(data.fund)} - 業務獎金 ${money(data.bonus)} = ${money(data.remainProfit)}<br>
      剩餘利潤對半分 = ${money(data.remainProfit)} × 50% = ${money(data.baseShare)}<br>
      李彥伯分潤 = 基本分潤 ${money(data.baseShare)} + 業務獎金 ${getSalesBonusText(data.sales, "李彥伯", data.bonus)} = ${money(data.boyfriendShare)}<br>
      李承灃分潤 = 基本分潤 ${money(data.baseShare)} + 業務獎金 ${getSalesBonusText(data.sales, "李承灃", data.bonus)} = ${money(data.brotherShare)}
    `;
  } else {
    document.getElementById("caseProcess").innerHTML = `
      <b>計算過程：</b>
      案件淨利 = 客戶收費 ${money(data.income)} - 總成本 ${money(data.cost)} = ${money(data.profit)}<br>
      因為本案為虧損案件，不提撥設備基金，也不發放業務獎金。<br>
      虧損金額由兩人平均承擔：${money(data.profit)} ÷ 2 = ${money(data.baseShare)}<br>
      李彥伯承擔：${money(data.boyfriendShare)}<br>
      李承灃承擔：${money(data.brotherShare)}
    `;
  }

  lastCaseData = {
    ...data,
    createdAt: serverTimestamp()
  };
};

window.saveCase = async function() {
  if (!lastCaseData) {
    calculateCase();
  }

  if (!lastCaseData) {
    return;
  }

  await addDoc(recordsRef, lastCaseData);
  alert("一般案件已儲存");
  lastCaseData = null;
  loadRecords();
};

window.calculateCar = function() {
  const sellPrice = getNumber("carSellPrice");

  if (sellPrice <= 0) {
    alert("請輸入賣出價格");
    return;
  }

  const date = getValue("carDate");
  const name = getValue("carName") || "未命名車輛";
  const buyPrice = getNumber("carBuyPrice");
  const repairCost = getNumber("carRepairCost");
  const otherCost = getNumber("carOtherCost");
  const boyfriendInvest = getNumber("carBoyfriendInvest");
  const brotherInvest = getNumber("carBrotherInvest");
  const thirdName = getValue("carThirdName") || "第三投資人";
  const thirdInvest = getNumber("carThirdInvest");

  const totalCost = buyPrice + repairCost + otherCost;
  const profit = sellPrice - totalCost;
  const totalInvest = boyfriendInvest + brotherInvest + thirdInvest;

  if (totalInvest <= 0) {
    alert("請輸入李彥伯與李承灃的投入金額");
    return;
  }

  const boyfriendRate = boyfriendInvest / totalInvest;
  const brotherRate = brotherInvest / totalInvest;
  const thirdRate = thirdInvest / totalInvest;

  const boyfriendShare = profit * boyfriendRate;
  const brotherShare = profit * brotherRate;
  const thirdShare = profit * thirdRate;

  document.getElementById("carProfitText").textContent = money(profit);
  document.getElementById("carInvestText").textContent = money(totalInvest);
  document.getElementById("carBoyfriendRateText").textContent = (boyfriendRate * 100).toFixed(1) + "%";
  document.getElementById("carBrotherRateText").textContent = (brotherRate * 100).toFixed(1) + "%";
  document.getElementById("carThirdRateNameText").textContent =
  `${thirdName} 投入比例`;

  document.getElementById("carThirdRateText").textContent =
  (thirdRate * 100).toFixed(1) + "%";
  document.getElementById("carThirdRateText").textContent =  (thirdRate * 100).toFixed(1) + "%";
  document.getElementById("carBoyfriendShareText").textContent = money(boyfriendShare);
  document.getElementById("carBrotherShareText").textContent = money(brotherShare);
  document.getElementById("carThirdNameText").textContent =
  `${thirdName} 分潤`;

  document.getElementById("carThirdShareText").textContent =
  money(thirdShare);
  document.getElementById("carThirdNameText").textContent =
  `${thirdName} 分潤`;

  document.getElementById("carThirdShareText").textContent =
  money(thirdShare);
  document.getElementById("carProcess").innerHTML = `
    <b>計算過程：</b>
    總成本 = 買入價格 ${money(buyPrice)} + 整備成本 ${money(repairCost)} + 其他成本 ${money(otherCost)} = ${money(totalCost)}<br>
    車輛淨利 = 賣出價格 ${money(sellPrice)} - 總成本 ${money(totalCost)} = ${money(profit)}<br>
    總投入金額 = 李彥伯投入 ${money(boyfriendInvest)} + 李承灃投入 ${money(brotherInvest)} = ${money(totalInvest)}<br>
    李彥伯投入比例 = ${money(boyfriendInvest)} ÷ ${money(totalInvest)} = ${(boyfriendRate * 100).toFixed(1)}%<br>
    李承灃投入比例 = ${money(brotherInvest)} ÷ ${money(totalInvest)} = ${(brotherRate * 100).toFixed(1)}%<br>
    ${thirdName} 投入比例 = ${money(thirdInvest)} ÷ ${money(totalInvest)} = ${(thirdRate * 100).toFixed(1)}%<br>
    李彥伯分潤 = 車輛淨利 ${money(profit)} × ${(boyfriendRate * 100).toFixed(1)}% = ${money(boyfriendShare)}<br>
    李承灃分潤 = 車輛淨利 ${money(profit)} × ${(brotherRate * 100).toFixed(1)}% = ${money(brotherShare)}<br>
    ${thirdName} 分潤 = 車輛淨利 ${money(profit)} × ${(thirdRate * 100).toFixed(1)}% = ${money(thirdShare)}
  `;

  lastCarData = {
    type: "中古車投資",
    date,
    name,
    customer: "",
    plate: "",
    sales: "",
    note: "",
    buyPrice,
    repairCost,
    otherCost,
    sellPrice,
    totalCost,
    profit,
    fund: 0,
    bonusBase: 0,
    bonusRate: 0,
    bonus: 0,
    boyfriendInvest,
    brotherInvest,
    boyfriendRate,
    brotherRate,
    boyfriendShare,
    brotherShare,
    thirdName,
    thirdInvest,
    thirdRate,
    thirdShare,
    createdAt: serverTimestamp()
  };
};

window.saveCar = async function() {
  if (!lastCarData) {
    calculateCar();
  }

  if (!lastCarData) {
    return;
  }

  await addDoc(recordsRef, lastCarData);
  alert("中古車投資案件已儲存");
  lastCarData = null;
  loadRecords();
};

async function loadRecords() {
  const q = query(recordsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  const table = document.getElementById("recordsTable");
  table.innerHTML = "";

  let totalProfit = 0;
  let totalFund = 0;
  let totalBoyfriend = 0;
  let totalBrother = 0;

  snapshot.forEach(docItem => {
    const data = docItem.data();
    const keyword = document
  .getElementById("recordSearchInput")
  ?.value
  .trim()
  .toLowerCase() || "";

const searchText = [
  data.date,
  data.type,
  data.name,
  data.customer,
  data.plate,
  data.sales,
  data.note,
  data.profit,
  data.fund,
  data.bonus,
  data.boyfriendShare,
  data.brotherShare
].join(" ").toLowerCase();

if (keyword && !searchText.includes(keyword)) {
  return;
}

    totalProfit += Number(data.profit || 0);
    totalFund += Number(data.fund || 0);
    totalBoyfriend += Number(data.boyfriendShare || 0);
    totalBrother += Number(data.brotherShare || 0);

    const rowClass = data.type === "中古車投資" ? "car-record-row" : "case-record-row";

table.innerHTML += `
  <tr class="${rowClass}">
    <td>${data.date || "-"}</td>
    <td>${data.type || "-"}</td>
    <td>${data.name || "-"}</td>
    <td>${data.customer || "-"}</td>
    <td>${data.plate || "-"}</td>
    <td>${money(data.profit)}</td>
    <td>${money(data.fund)}</td>
    <td>${money(data.bonus)}</td>
    <td>${money(data.boyfriendShare)}</td>
    <td>${money(data.brotherShare)}</td>
    <td>${data.thirdName ? money(data.thirdShare) : "-"}</td>
    <td>
      <button class="delete-btn" onclick="deleteRecord('${docItem.id}')">刪除</button>
    </td>
  </tr>
  ${data.note ? `
<tr class="record-note-row ${rowClass}">
  <td colspan="11">
    <div class="record-note-box">
      <strong>客戶備註</strong>
      ${data.note}
    </div>
  </td>
</tr>
` : ""}
`;
  });

  document.getElementById("totalProfit").textContent = money(totalProfit);
  document.getElementById("totalFund").textContent = money(totalFund);
  document.getElementById("totalBoyfriend").textContent = money(totalBoyfriend);
  document.getElementById("totalBrother").textContent = money(totalBrother);
}

window.deleteRecord = async function(id) {
  const ok = confirm("確定刪除這筆紀錄嗎？");

  if (!ok) {
    return;
  }

  await deleteDoc(doc(db, "profitRecords", id));

  alert("紀錄已刪除");

  loadRecords();

  if (document.getElementById("mobileRecords").classList.contains("active")) {
    loadMobileRecords();
  }
};

window.clearAllRecords = async function() {
  const ok = confirm("確定要清空所有紀錄嗎？這個動作不能復原。");

  if (!ok) {
    return;
  }

  const snapshot = await getDocs(recordsRef);

  for (const docItem of snapshot.docs) {
    await deleteDoc(doc(db, "profitRecords", docItem.id));
  }

  alert("所有紀錄已清空");

  loadRecords();
};

window.downloadCSV = async function() {
  const q = query(recordsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  let csv = "日期,類型,名稱,客戶,車牌,淨利,設備基金,業務獎金,李彥伯,李承灃,客戶備註\n";

  snapshot.forEach(docItem => {
    const data = docItem.data();

    csv += [
      data.date || "",
      data.type || "",
      data.name || "",
      data.customer || "",
      data.plate || "",
      data.profit || 0,
      data.fund || 0,
      data.bonus || 0,
      data.boyfriendShare || 0,
      data.brotherShare || 0,
      `"${String(data.note || "").replaceAll('"', '""')}"`
    ].join(",") + "\n";
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `小李車庫紀錄_${new Date().toLocaleDateString("zh-TW")}.csv`;

  link.click();

  URL.revokeObjectURL(url);
};

function mobileShowPanel(panelId, stepNumber) {
  document.querySelectorAll(".mobile-panel").forEach(panel => {
    panel.classList.remove("active");
  });

  document.getElementById(panelId).classList.add("active");

  for (let i = 1; i <= 4; i++) {
    document.getElementById("mStep" + i).classList.toggle("active", i <= stepNumber);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.mobileSelectType = function(type) {
  mobileType = type;
  mobileLastData = null;

  if (type === "case") {
    document.getElementById("mobileRulesTitle").textContent = "一般案件分潤規則";
    document.getElementById("mobileRulesContent").innerHTML = `
      <div class="rule-item"><strong>1. 先扣除所有成本</strong><p>客戶收費扣掉材料、外包、運費、雜支後，才是案件真正淨利。</p></div>
      <div class="rule-item"><strong>2. 設備／材料基金 10%</strong><p>先從案件淨利中保留 10%，作為安卓機、工具、線材、設備更新與材料補貨。</p></div>
      <div class="rule-item"><strong>3. 業務獎金採階梯式</strong><p>扣除設備基金後，剩餘淨利 10,000 以下抽 10%；10,001～20,000 抽 15%；20,001 以上抽 20%。</p></div>
      <div class="rule-item"><strong>4. 剩餘利潤再對半分</strong><p>扣除設備基金與業務獎金後，剩餘利潤由李彥伯與李承灃各分配 50%。</p></div>
      <div class="rule-item"><strong>5. 賠本案件共同承擔</strong><p>若案件虧損，則不提撥設備基金、不發放業務獎金，虧損金額由兩人平均承擔。</p></div>
    `;
  } else {
    document.getElementById("mobileRulesTitle").textContent = "中古車買賣分潤規則";
    document.getElementById("mobileRulesContent").innerHTML = `
      <div class="rule-item"><strong>1. 先計算車輛實際淨利</strong><p>賣出價格扣掉買入價格、整備成本、其他成本後，才是這台車真正賺到的金額。</p></div>
      <div class="rule-item"><strong>2. 依投入比例分潤</strong><p>因為每台車的投入金額不同，所以不採用 50/50，而是依照實際出資比例分配。</p></div>
      <div class="rule-item"><strong>3. 賠錢也依投入比例承擔</strong><p>若車輛最後虧損，則虧損金額也依照投入比例承擔。</p></div>
    `;
  }

  mobileShowPanel("mobileRules", 2);
};

window.mobileGoChoose = function() {
  mobileLastData = null;
  mobileShowPanel("mobileChoose", 1);
};

window.mobileGoRules = function() {
  mobileShowPanel("mobileRules", 2);
};

window.mobileGoForm = function() {
  document.getElementById("mobileFormTitle").textContent =
    mobileType === "case" ? "輸入一般案件資料" : "輸入中古車買賣資料";

  document.getElementById("mobileCaseForm").classList.toggle("hidden", mobileType !== "case");
  document.getElementById("mobileCarForm").classList.toggle("hidden", mobileType !== "car");

  mobileShowPanel("mobileForm", 3);
};

window.mobileCalculate = function() {
  if (mobileType === "case") {
    mobileCalculateCase();
  } else {
    mobileCalculateCar();
  }
};

function mobileCalculateCase() {
  const income = mGetNumber("mCaseIncome");

  if (income <= 0) {
    alert("請輸入客戶收費");
    return;
  }

  const data = calculateCaseCore({
    date: mGetValue("mCaseDate"),
    name: mGetValue("mCaseName") || "未命名案件",
    customer: mGetValue("mCaseCustomer") || "未填客戶",
    plate: mGetValue("mCasePlate") || "未填車牌",
    sales: mGetValue("mCaseSales"),
    note: mGetValue("mCaseNote"),
    income,
    cost: mGetNumber("mCaseCost")
  });

  document.getElementById("mobileResultBoxes").innerHTML = `
    <div class="result-box"><span>案件淨利</span><b>${money(data.profit)}</b></div>
    <div class="result-box"><span>設備基金</span><b>${money(data.fund)}</b></div>
    <div class="result-box"><span>業務獎金</span><b>${money(data.bonus)}</b></div>
    <div class="result-box dark"><span>李彥伯最後金額</span><b>${money(data.boyfriendShare)}</b></div>
    <div class="result-box"><span>李承灃最後金額</span><b>${money(data.brotherShare)}</b></div>
  `;

  if (data.profit > 0) {
    document.getElementById("mobileProcess").innerHTML = `
      <b>計算過程：</b>
      案件淨利 = 客戶收費 ${money(data.income)} - 總成本 ${money(data.cost)} = ${money(data.profit)}<br>
      設備基金 = ${money(data.profit)} × 10% = ${money(data.fund)}<br>
      業務獎金計算基礎 = ${money(data.profit)} - ${money(data.fund)} = ${money(data.bonusBase)}<br>
      業務獎金比例 = ${(data.bonusRate * 100).toFixed(0)}%<br>
      業務獎金 = ${money(data.bonus)}<br>
      業務成交人：${data.sales}<br>
      剩餘利潤 = ${money(data.remainProfit)}<br><br>
      李彥伯分潤 = 基本分潤 ${money(data.baseShare)} + 業務獎金 ${getSalesBonusText(data.sales, "李彥伯", data.bonus)} = ${money(data.boyfriendShare)}<br>
      李承灃分潤 = 基本分潤 ${money(data.baseShare)} + 業務獎金 ${getSalesBonusText(data.sales, "李承灃", data.bonus)} = ${money(data.brotherShare)}
    `;
  } else {
    document.getElementById("mobileProcess").innerHTML = `
      <b>計算過程：</b>
      案件淨利 = ${money(data.profit)}<br>
      因為本案為虧損案件，不提撥設備基金，也不發放業務獎金。<br>
      虧損金額由兩人平均承擔：${money(data.baseShare)}
    `;
  }

  mobileLastData = {
    ...data,
    createdAt: serverTimestamp()
  };

  mobileShowPanel("mobileResult", 4);
}

function mobileCalculateCar() {
  const sellPrice = mGetNumber("mCarSellPrice");

  if (sellPrice <= 0) {
    alert("請輸入賣出價格");
    return;
  }

  const date = mGetValue("mCarDate");
  const name = mGetValue("mCarName") || "未命名車輛";
  const buyPrice = mGetNumber("mCarBuyPrice");
  const repairCost = mGetNumber("mCarRepairCost");
  const otherCost = mGetNumber("mCarOtherCost");
  const boyfriendInvest = mGetNumber("mCarBoyfriendInvest");
  const brotherInvest = mGetNumber("mCarBrotherInvest");
  const thirdName = mGetValue("mCarThirdName") || "第三投資人";
  const thirdInvest = mGetNumber("mCarThirdInvest");

  const totalCost = buyPrice + repairCost + otherCost;
  const profit = sellPrice - totalCost;
  const totalInvest = boyfriendInvest + brotherInvest + thirdInvest;

  if (totalInvest <= 0) {
    alert("請輸入李彥伯與李承灃的投入金額");
    return;
  }

  const boyfriendRate = boyfriendInvest / totalInvest;
  const brotherRate = brotherInvest / totalInvest;
  const thirdRate = thirdInvest / totalInvest;

  const boyfriendShare = profit * boyfriendRate;
  const brotherShare = profit * brotherRate;
  const thirdShare = profit * thirdRate;

  document.getElementById("mobileResultBoxes").innerHTML = `
    <div class="result-box"><span>車輛淨利</span><b>${money(profit)}</b></div>
    <div class="result-box"><span>總投入金額</span><b>${money(totalInvest)}</b></div>
    <div class="result-box"><span>李彥伯投入比例</span><b>${(boyfriendRate * 100).toFixed(1)}%</b></div>
    <div class="result-box"><span>李承灃投入比例</span><b>${(brotherRate * 100).toFixed(1)}%</b></div>
    <div class="result-box"><span>${thirdName} 投入比例</span><b>${(thirdRate * 100).toFixed(1)}%</b></div>
    <div class="result-box dark"><span>李彥伯分潤</span><b>${money(boyfriendShare)}</b><br></div>
    <div class="result-box"><span>李承灃分潤</span><b>${money(brotherShare)}</b></div>
    <div class="result-box"><span>${thirdName} 分潤</span><b>${money(thirdShare)}</b></div>
  `;

  document.getElementById("mobileProcess").innerHTML = `
    <b>計算過程：</b>
    總成本 = ${money(totalCost)}<br>
    車輛淨利 = ${money(profit)}<br>
    總投入金額 = ${money(totalInvest)}<br>
    李彥伯投入比例 = ${(boyfriendRate * 100).toFixed(1)}%<br>
    李承灃投入比例 = ${(brotherRate * 100).toFixed(1)}%<br>
    ${thirdName} 投入比例 = ${(thirdRate * 100).toFixed(1)}%<br><br>
    李彥伯分潤 = ${money(boyfriendShare)}<br>
    李承灃分潤 = ${money(brotherShare)}<br>
    ${thirdName} 分潤 = ${money(thirdShare)}
  `;

  mobileLastData = {
    type: "中古車投資",
    date,
    name,
    customer: "",
    plate: "",
    sales: "",
    note: "",
    buyPrice,
    repairCost,
    otherCost,
    sellPrice,
    totalCost,
    profit,
    fund: 0,
    bonusBase: 0,
    bonusRate: 0,
    bonus: 0,
    boyfriendInvest,
    brotherInvest,
    boyfriendRate,
    brotherRate,
    boyfriendShare,
    brotherShare,
    thirdName,
    thirdInvest,
    thirdRate,
    thirdShare,
    createdAt: serverTimestamp()
  };

  mobileShowPanel("mobileResult", 4);
}

window.mobileSaveRecord = async function() {
  if (!mobileLastData) {
    alert("請先完成計算");
    return;
  }

  await addDoc(recordsRef, mobileLastData);
  alert("案件已儲存");

  mobileLastData = null;

  clearMobileForms();

  loadRecords();
  mobileGoChoose();
};

function clearMobileForms() {
  setValue("mCaseDate", today);
  setValue("mCaseName", "");
  setValue("mCaseCustomer", "");
  setValue("mCasePlate", "");
  setValue("mCaseIncome", "");
  setValue("mCaseCost", "");
  setValue("mCaseSales", "李彥伯");
  setValue("mCaseNote", "");

  setValue("mCarDate", today);
  setValue("mCarName", "");
  setValue("mCarBuyPrice", "");
  setValue("mCarRepairCost", "");
  setValue("mCarOtherCost", "");
  setValue("mCarSellPrice", "");
  setValue("mCarBoyfriendInvest", "");
  setValue("mCarBrotherInvest", "");
  setValue("mCarThirdName", "");
  setValue("mCarThirdInvest", "");
}

window.mobileShowRecords = async function() {
  await loadMobileRecords();
  mobileShowPanel("mobileRecords", 1);
};

async function loadMobileRecords() {
  const q = query(recordsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const summary = document.getElementById("mobileRecordsSummary");
  const list = document.getElementById("mobileRecordsList");
  summary.innerHTML = "";
  list.innerHTML = "";

  const mobileKeyword = document
    .getElementById("mobileRecordSearch")
    ?.value
    .trim()
    .toLowerCase() || "";

  let totalProfit = 0;
  let totalFund = 0;
  let totalBoyfriend = 0;
  let totalBrother = 0;

  snapshot.forEach(docItem => {
    const data = docItem.data();

    const searchText = [
      data.date,
      data.type,
      data.name,
      data.customer,
      data.plate,
      data.sales,
      data.note,
      data.profit,
      data.fund,
      data.bonus,
      data.boyfriendShare,
      data.brotherShare
    ].join(" ").toLowerCase();

    if (mobileKeyword && !searchText.includes(mobileKeyword)) {
      return;
    }

    totalProfit += Number(data.profit || 0);
    totalFund += Number(data.fund || 0);
    totalBoyfriend += Number(data.boyfriendShare || 0);
    totalBrother += Number(data.brotherShare || 0);
  });

  summary.innerHTML = `
  <div class="mobile-record-summary">
    <div><span>總淨利</span><b>${money(totalProfit)}</b></div>
    <div><span>設備基金</span><b>${money(totalFund)}</b></div>
    <div><span>李彥伯</span><b>${money(totalBoyfriend)}</b></div>
    <div><span>李承灃</span><b>${money(totalBrother)}</b></div>
  </div>
`;

  

  snapshot.forEach(docItem => {
    const data = docItem.data();

    const searchText = [
      data.date,
      data.type,
      data.name,
      data.customer,
      data.plate,
      data.sales,
      data.note,
      data.profit,
      data.fund,
      data.bonus,
      data.boyfriendShare,
      data.brotherShare
    ].join(" ").toLowerCase();

    if (mobileKeyword && !searchText.includes(mobileKeyword)) {
      return;
    }

    const mobileCardClass =
  data.type === "中古車投資"
    ? "mobile-record-card mobile-car-record"
    : "mobile-record-card mobile-case-record";

list.innerHTML += `
  <div class="${mobileCardClass}">
        <div class="mobile-record-top">
          <span>${data.type || "-"}</span>
          <small>${data.date || "-"}</small>
        </div>

        <h3>${data.name || "-"}</h3>

        <div class="mobile-record-money">
          <p><span>客戶</span><b>${data.customer || "-"}</b></p>
          <p><span>車牌</span><b>${data.plate || "-"}</b></p>
          <p><span>淨利</span><b>${money(data.profit)}</b></p>
          <p><span>設備基金</span><b>${money(data.fund)}</b></p>
          <p><span>業務獎金</span><b>${money(data.bonus)}</b></p>
          <p><span>李彥伯</span><b>${money(data.boyfriendShare)}</b></p>
          <p><span>李承灃</span><b>${money(data.brotherShare)}</b></p>
          ${data.thirdName ? `
            <p><span>${data.thirdName}</span><b>${money(data.thirdShare)}</b></p>
          ` : ""}
        </div>

        ${data.note ? `
  <div class="mobile-note">
    <strong>客戶備註：</strong>
    ${data.note}
  </div>
` : ""}

        <button class="mobile-delete-btn" onclick="deleteRecord('${docItem.id}')">刪除紀錄</button>
      </div>
    `;
  });
}
window.loadRecords = loadRecords;
window.loadMobileRecords = loadMobileRecords;
loadRecords();
