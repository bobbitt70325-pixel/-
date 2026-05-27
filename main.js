import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
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
let editingCarId = null;
let mobileType = null;
let mobileLastData = null;
let recordsCache = {};

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
  const element = document.getElementById(id);
  return element ? Number(element.value) || 0 : 0;
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function mGetNumber(id) {
  const element = document.getElementById(id);
  return element ? Number(element.value) || 0 : 0;
}

function mGetValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function getBonusRate(bonusBase) {
  if (bonusBase <= 10000) return 0.1;
  if (bonusBase <= 20000) return 0.15;
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
    status: "已結案",
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
  if (sales === "共同成交") return money(bonus / 2);
  if (sales === targetPerson) return money(bonus);
  return "$0";
}

function calculateCarShares(data, sellPrice) {
  const buyPrice = Number(data.buyPrice || 0);
  const repairCost = Number(data.repairCost || 0);
  const otherCost = Number(data.otherCost || 0);
  const passThrough = Number(data.passThrough || 0);
  const passThroughReceived = Number(data.passThroughReceived || 0);
  const unreceivedPassThrough = Math.max(passThrough - passThroughReceived, 0);
  const passThroughCostMode = data.passThroughCostMode || "不列入成本";
  const absorbedPassThrough = passThroughCostMode === "列入成本" ? unreceivedPassThrough : 0;
  const boyfriendInvest = Number(data.boyfriendInvest || 0);
  const brotherInvest = Number(data.brotherInvest || 0);
  const thirdInvest = Number(data.thirdInvest || 0);
  const thirdName = data.thirdName || "第三投資人";

  const totalCost = buyPrice + repairCost + otherCost + absorbedPassThrough;
  const totalInvest = boyfriendInvest + brotherInvest + thirdInvest;
  const profit = Number(sellPrice || 0) - totalCost;

  const boyfriendRate = totalInvest > 0 ? boyfriendInvest / totalInvest : 0;
  const brotherRate = totalInvest > 0 ? brotherInvest / totalInvest : 0;
  const thirdRate = totalInvest > 0 ? thirdInvest / totalInvest : 0;

  const boyfriendShare = profit * boyfriendRate;
  const brotherShare = profit * brotherRate;
  const thirdShare = profit * thirdRate;

  return {
    totalCost,
    totalInvest,
    profit,
    passThrough,
    passThroughReceived,
    unreceivedPassThrough,
    passThroughCostMode,
    absorbedPassThrough,
    boyfriendRate,
    brotherRate,
    thirdRate,
    boyfriendShare,
    brotherShare,
    thirdShare,
    thirdName
  };
}

function buildCarDataFromDesktop() {
  const boyfriendInvest = getNumber("carBoyfriendInvest");
  const brotherInvest = getNumber("carBrotherInvest");
  const thirdInvest = getNumber("carThirdInvest");
  const totalInvest = boyfriendInvest + brotherInvest + thirdInvest;

  if (totalInvest <= 0) {
    alert("請輸入至少一位投資人的投入金額");
    return null;
  }

  const buyPrice = getNumber("carBuyPrice");
  const repairCost = getNumber("carRepairCost");
  const otherCost = getNumber("carOtherCost");
  const passThrough = getNumber("carPassThrough");
  const passThroughReceived = 0;
  const absorbedPassThrough = 0;
  const passThroughStatus = "未結算";
  const passThroughCostMode = "結案時決定";
  const totalCost = buyPrice + repairCost + otherCost;

  return {
    type: "中古車投資",
    status: "進行中",
    date: getValue("carDate"),
    name: getValue("carName") || "未命名車輛",
    customer: "",
    plate: "",
    sales: "",
    note: "",
    buyPrice,
    repairCost,
    otherCost,
    passThrough,
    passThroughReceived,
    passThroughCostMode,
    absorbedPassThrough,
    passThroughPayer: getValue("carPassThroughPayer"),
    passThroughStatus,
    sellPrice: 0,
    totalCost,
    totalInvest,
    profit: 0,
    fund: 0,
    bonusBase: 0,
    bonusRate: 0,
    bonus: 0,
    boyfriendInvest,
    brotherInvest,
    thirdInvest,
    boyfriendRate: totalInvest > 0 ? boyfriendInvest / totalInvest : 0,
    brotherRate: totalInvest > 0 ? brotherInvest / totalInvest : 0,
    thirdRate: totalInvest > 0 ? thirdInvest / totalInvest : 0,
    boyfriendShare: 0,
    brotherShare: 0,
    thirdName: getValue("carThirdName") || "第三投資人",
    thirdShare: 0,
    createdAt: serverTimestamp()
  };
}

function buildCarDataFromMobile() {
  const boyfriendInvest = mGetNumber("mCarBoyfriendInvest");
  const brotherInvest = mGetNumber("mCarBrotherInvest");
  const thirdInvest = mGetNumber("mCarThirdInvest");
  const totalInvest = boyfriendInvest + brotherInvest + thirdInvest;

  if (totalInvest <= 0) {
    alert("請輸入至少一位投資人的投入金額");
    return null;
  }

  const buyPrice = mGetNumber("mCarBuyPrice");
  const repairCost = mGetNumber("mCarRepairCost");
  const otherCost = mGetNumber("mCarOtherCost");
  const passThrough = mGetNumber("mCarPassThrough");
  const passThroughReceived = 0;
  const absorbedPassThrough = 0;
  const passThroughStatus = "未結算";
  const passThroughCostMode = "結案時決定";
  const totalCost = buyPrice + repairCost + otherCost;

  return {
    type: "中古車投資",
    status: "進行中",
    date: mGetValue("mCarDate"),
    name: mGetValue("mCarName") || "未命名車輛",
    customer: "",
    plate: "",
    sales: "",
    note: "",
    buyPrice,
    repairCost,
    otherCost,
    passThrough,
    passThroughReceived,
    passThroughCostMode,
    absorbedPassThrough,
    passThroughPayer: mGetValue("mCarPassThroughPayer"),
    passThroughStatus,
    sellPrice: 0,
    totalCost,
    totalInvest,
    profit: 0,
    fund: 0,
    bonusBase: 0,
    bonusRate: 0,
    bonus: 0,
    boyfriendInvest,
    brotherInvest,
    thirdInvest,
    boyfriendRate: totalInvest > 0 ? boyfriendInvest / totalInvest : 0,
    brotherRate: totalInvest > 0 ? brotherInvest / totalInvest : 0,
    thirdRate: totalInvest > 0 ? thirdInvest / totalInvest : 0,
    boyfriendShare: 0,
    brotherShare: 0,
    thirdName: mGetValue("mCarThirdName") || "第三投資人",
    thirdShare: 0,
    createdAt: serverTimestamp()
  };
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

  await loadRecords();

  showPage("recordsPage", document.querySelectorAll(".nav button")[2]);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

window.saveCarPending = async function() {
  const data = buildCarDataFromDesktop();

  if (!data) {
    return;
  }

  if (editingCarId) {
    await updateDoc(
      doc(db, "profitRecords", editingCarId),
      data
    );

    alert("案件已更新");

    editingCarId = null;

    document.querySelector("#carPage .btn-blue").textContent = "儲存進行中案件";
  } else {
    await addDoc(recordsRef, data);

    alert("中古車進行中案件已儲存");
  }

  clearDesktopCarForm();

  await loadRecords();

showPage("recordsPage", document.querySelectorAll(".nav button")[2]);

window.scrollTo({
  top: 0,
  behavior: "smooth"
});
};

function clearDesktopCarForm() {
  setValue("carDate", today);
  setValue("carName", "");
  setValue("carBuyPrice", "");
  setValue("carRepairCost", "");
  setValue("carOtherCost", "");
  setValue("carPassThrough", "");
  setValue("carPassThroughPayer", "");

  setValue("carBoyfriendInvest", "");
  setValue("carBrotherInvest", "");
  setValue("carThirdName", "");
  setValue("carThirdInvest", "");
}

async function loadRecords() {
  const q = query(recordsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  recordsCache = {};

  const caseTable = document.getElementById("caseRecordsTable");
  const carList = document.getElementById("carRecordsList");

  if (caseTable) {
    caseTable.innerHTML = "";
  }

  if (carList) {
    carList.innerHTML = "";
  }

  let totalProfit = 0;
  let totalFund = 0;
  let totalBoyfriend = 0;
  let totalBrother = 0;

  snapshot.forEach(docItem => {
    const data = docItem.data();

    recordsCache[docItem.id] = {
      id: docItem.id,
      ...data
    };

    const keyword = document
      .getElementById("recordSearchInput")
      ?.value
      .trim()
      .toLowerCase() || "";

    const searchText = [
      data.date,
      data.type,
      data.status,
      data.name,
      data.customer,
      data.plate,
      data.sales,
      data.note,
      data.passThrough,
      data.passThroughPayer,
      data.passThroughStatus,
      data.profit,
      data.fund,
      data.bonus,
      data.boyfriendShare,
      data.brotherShare,
      data.thirdName,
      data.thirdShare
    ].join(" ").toLowerCase();

    if (keyword && !searchText.includes(keyword)) {
      return;
    }

    const isCar = data.type === "中古車投資";
    const isPending = isCar && (data.status || "進行中") === "進行中";
    const displayStatus = isCar ? (data.status || "進行中") : "已結案";
    const statusClass = displayStatus === "進行中" ? "status-pending" : "status-closed";

    if (!isPending) {
      totalProfit += Number(data.profit || 0);
      totalFund += Number(data.fund || 0);
      totalBoyfriend += Number(data.boyfriendShare || 0);
      totalBrother += Number(data.brotherShare || 0);
    } else {
      totalFund += Number(data.fund || 0);
    }

    if (!isCar) {
      if (!caseTable) return;

      caseTable.innerHTML += `
        <tr class="case-record-row">
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
          <td>
            <div class="action-cell">
              <button class="delete-btn" onclick="deleteRecord('${docItem.id}')">刪除</button>
            </div>
          </td>
        </tr>

        ${data.note ? `
          <tr class="record-note-row case-record-row">
            <td colspan="11">
              <div class="record-note-box">
                <div class="pass-through-row">
                  <div class="pass-through-label">客戶備註</div>
                  <div class="pass-through-content">${data.note}</div>
                </div>
              </div>
            </td>
          </tr>
        ` : ""}
      `;

      return;
    }

    if (!carList) return;

    carList.innerHTML += `
      <div class="desktop-record-card car-record-card">

        <div class="desktop-record-top">
          <div>
            <div class="record-type">中古車投資</div>
            <div class="record-title">${data.name || "未命名車輛"}</div>
            <div class="record-date">${data.date || "-"}</div>
          </div>

          <div class="desktop-record-header-right">
            <span class="status-badge ${statusClass}">${displayStatus}</span>

            <div class="record-actions record-actions-top">
              ${isPending ? `
                <button class="edit-btn" onclick="editCarRecord('${docItem.id}')">編輯</button>
                <button class="close-btn" onclick="openCloseCarModal('${docItem.id}')">結案</button>
              ` : ""}

              <button class="delete-btn" onclick="deleteRecord('${docItem.id}')">刪除</button>
            </div>
          </div>
        </div>

        <div class="desktop-record-grid car-only-grid">
          <div class="record-item">
            <span>淨利</span>
            <strong>${isPending ? "尚未結案" : money(data.profit)}</strong>
          </div>

          <div class="record-item">
            <span>李彥伯</span>
            <strong>${isPending ? "尚未結案" : money(data.boyfriendShare)}</strong>
          </div>

          <div class="record-item">
            <span>李承灃</span>
            <strong>${isPending ? "尚未結案" : money(data.brotherShare)}</strong>
          </div>

          <div class="record-item">
            <span>${data.thirdName || "第三投資人"}</span>
            <strong>${isPending ? "尚未結案" : money(data.thirdShare)}</strong>
          </div>
        </div>

        ${(data.passThrough || data.note) ? `
          <div class="desktop-record-extra">
            ${data.passThrough ? `
              <div class="record-info-row">
                <div class="record-info-label">代收代付</div>
                <div class="record-info-content">
                  <span>${money(data.passThrough)}</span>
                  <span>代墊人：${data.passThroughPayer || "未填"}</span>
                  <span>${data.passThroughStatus || "未結算"}</span>
                  <span>${data.passThroughCostMode || "結案時決定"}</span>
                </div>
              </div>
            ` : ""}

            ${data.note ? `
              <div class="record-info-row">
                <div class="record-info-label">客戶備註</div>
                <div class="record-info-content">${data.note}</div>
              </div>
            ` : ""}
          </div>
        ` : ""}

      </div>
    `;
  });

  document.getElementById("totalProfit").textContent = money(totalProfit);
  document.getElementById("totalFund").textContent = money(totalFund);
  document.getElementById("totalBoyfriend").textContent = money(totalBoyfriend);
  document.getElementById("totalBrother").textContent = money(totalBrother);
}

window.openCloseCarModal = function(id) {
  const data = recordsCache[id];

  if (!data) {
    alert("找不到這筆紀錄，請重新整理後再試一次");
    return;
  }

  setValue("closeCarRecordId", id);
  setValue("closeCarSellPrice", data.sellPrice || "");
  setValue("closeCarPassThroughStatus", data.passThroughStatus === "未結算" ? "未收回" : (data.passThroughStatus || "未收回"));
  setValue("closeCarPassThroughReceived", data.passThroughReceived || 0);
  setValue("closeCarPassThroughCostMode", data.passThroughCostMode === "結案時決定" ? "列入成本" : (data.passThroughCostMode || "列入成本"));
  handleClosePassThroughStatusChange();

  document.getElementById("closeCarTitle").textContent =
    `${data.name || "未命名車輛"}｜買入 ${money(data.buyPrice)}｜目前成本 ${money(data.totalCost)}`;

  const preview = document.getElementById("closeCarFormulaPreview");
  if (preview) {
    preview.classList.add("hidden");
    preview.innerHTML = "";
  }

  document.getElementById("closeCarModal").classList.remove("hidden");
};

window.closeCloseCarModal = function() {
  document.getElementById("closeCarModal").classList.add("hidden");
};


window.handleClosePassThroughStatusChange = function() {
  const id = getValue("closeCarRecordId");
  const data = recordsCache[id] || {};
  const passThrough = Number(data.passThrough || 0);
  const status = getValue("closeCarPassThroughStatus");
  const receivedInput = document.getElementById("closeCarPassThroughReceived");
  const costModeSelect = document.getElementById("closeCarPassThroughCostMode");

  if (!receivedInput || !costModeSelect) {
    return;
  }

  if (status === "未收回") {
    receivedInput.value = 0;
    receivedInput.disabled = true;
    costModeSelect.value = "列入成本";
    costModeSelect.disabled = true;
    return;
  }

  receivedInput.disabled = false;
  costModeSelect.disabled = false;

  if (status === "已收回") {
    receivedInput.value = passThrough;
    costModeSelect.value = "不列入成本";
  }

  if (status === "部分收回" && Number(receivedInput.value || 0) === 0) {
    receivedInput.value = "";
    costModeSelect.value = "列入成本";
  }
};


window.previewCloseCarFormula = function() {
  const id = getValue("closeCarRecordId");
  const data = recordsCache[id];
  const sellPrice = getNumber("closeCarSellPrice");

  if (!data) {
    alert("找不到這筆紀錄");
    return;
  }

  if (sellPrice <= 0) {
    alert("請輸入賣出價格");
    return;
  }

  const passThroughStatus = getValue("closeCarPassThroughStatus") || "未收回";
  const passThroughReceived = getNumber("closeCarPassThroughReceived");
  const passThroughCostMode = getValue("closeCarPassThroughCostMode") || "列入成本";

  const calcData = {
    ...data,
    passThroughStatus,
    passThroughReceived,
    passThroughCostMode
  };

  const result = calculateCarShares(calcData, sellPrice);
  const preview = document.getElementById("closeCarFormulaPreview");

  preview.classList.remove("hidden");

  preview.innerHTML = `
    <b>結案分潤試算：</b>
    代收代付金額 = ${money(calcData.passThrough)}｜收回金額 = ${money(calcData.passThroughReceived)}｜未收回 = ${money(result.unreceivedPassThrough)}<br>
    代收代付狀態 = ${calcData.passThroughStatus}，未收回金額處理 = ${calcData.passThroughCostMode}，列入成本金額 ${money(result.absorbedPassThrough)}<br>
    總成本 = 買入價格 ${money(calcData.buyPrice)} + 整備成本 ${money(calcData.repairCost)} + 其他成本 ${money(calcData.otherCost)} + 代收代付吸收 ${money(result.absorbedPassThrough)} = ${money(result.totalCost)}<br>
    車輛淨利 = 賣出價格 ${money(sellPrice)} - 總成本 ${money(result.totalCost)} = ${money(result.profit)}<br><br>

    總投入金額 = 李彥伯 ${money(data.boyfriendInvest)} + 李承灃 ${money(data.brotherInvest)} + ${(data.thirdName || "第三投資人")} ${money(data.thirdInvest)} = ${money(result.totalInvest)}<br>

    李彥伯投入比例 = ${money(data.boyfriendInvest)} ÷ ${money(result.totalInvest)} = ${(result.boyfriendRate * 100).toFixed(1)}%<br>
    李承灃投入比例 = ${money(data.brotherInvest)} ÷ ${money(result.totalInvest)} = ${(result.brotherRate * 100).toFixed(1)}%<br>
    ${(data.thirdName || "第三投資人")} 投入比例 = ${money(data.thirdInvest)} ÷ ${money(result.totalInvest)} = ${(result.thirdRate * 100).toFixed(1)}%<br><br>

    李彥伯分潤 = ${money(result.profit)} × ${(result.boyfriendRate * 100).toFixed(1)}% = ${money(result.boyfriendShare)}<br>
    李承灃分潤 = ${money(result.profit)} × ${(result.brotherRate * 100).toFixed(1)}% = ${money(result.brotherShare)}<br>
    ${(data.thirdName || "第三投資人")} 分潤 = ${money(result.profit)} × ${(result.thirdRate * 100).toFixed(1)}% = ${money(result.thirdShare)}
  `;
};

window.confirmCloseCar = async function() {
  const id = getValue("closeCarRecordId");
  const data = recordsCache[id];
  const sellPrice = getNumber("closeCarSellPrice");
  const passThroughStatus = getValue("closeCarPassThroughStatus") || "未收回";
  const passThroughReceived = getNumber("closeCarPassThroughReceived");
  const passThroughCostMode = getValue("closeCarPassThroughCostMode") || "列入成本";

  if (!data) {
    alert("找不到這筆紀錄");
    return;
  }

  if (sellPrice <= 0) {
    alert("請輸入賣出價格");
    return;
  }

  const calcData = {
    ...data,
    passThroughStatus,
    passThroughReceived,
    passThroughCostMode
  };

  const result = calculateCarShares(calcData, sellPrice);

  await updateDoc(doc(db, "profitRecords", id), {
    status: "已結案",
    sellPrice,
    passThroughStatus,
    passThroughReceived,
    passThroughCostMode,
    totalCost: result.totalCost,
    absorbedPassThrough: result.absorbedPassThrough,
    passThroughCostMode: result.passThroughCostMode,
    totalInvest: result.totalInvest,
    profit: result.profit,
    boyfriendRate: result.boyfriendRate,
    brotherRate: result.brotherRate,
    thirdRate: result.thirdRate,
    boyfriendShare: result.boyfriendShare,
    brotherShare: result.brotherShare,
    thirdShare: result.thirdShare,
    closedAt: serverTimestamp()
  });

  

closeCloseCarModal();

await loadRecords();

if (document.getElementById("mobileRecords").classList.contains("active")) {
  await loadMobileRecords();
}
};

window.deleteRecord = async function(id) {
  const ok = confirm("確定刪除這筆紀錄嗎？");

  if (!ok) {
    return;
  }

  await deleteDoc(doc(db, "profitRecords", id));

  await loadRecords();
  await loadMobileRecords();

  alert("紀錄已刪除");

  await loadRecords();

  if (document.getElementById("mobileRecords").classList.contains("active")) {
    await loadMobileRecords();
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

  await loadRecords();
};

window.downloadCSV = async function() {
  const q = query(recordsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  let csv = "日期,類型,狀態,名稱,客戶,車牌,淨利,設備基金,業務獎金,李彥伯,李承灃,第三投資人,代收代付,代墊人,代收代付狀態,代收代付是否列入成本,代收代付吸收成本,客戶備註\n";

  snapshot.forEach(docItem => {
    const data = docItem.data();

    csv += [
      data.date || "",
      data.type || "",
      data.status || "",
      data.name || "",
      data.customer || "",
      data.plate || "",
      data.profit || 0,
      data.fund || 0,
      data.bonus || 0,
      data.boyfriendShare || 0,
      data.brotherShare || 0,
      data.thirdShare || 0,
      data.passThrough || 0,
      data.passThroughPayer || "",
      data.passThroughStatus || "",
      data.passThroughCostMode || "",
      data.absorbedPassThrough || 0,
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
      <div class="rule-item"><strong>1. 新增時先是進行中</strong><p>買車當下先記錄投入、買入、整備、其他成本與代收代付，不計算正式分潤。</p></div>
      <div class="rule-item"><strong>2. 代收代付不列入成本</strong><p>稅金、過戶費、保險等若買家會另外支付，只記錄代墊人與收回狀態，不影響淨利。</p></div>
      <div class="rule-item"><strong>3. 賣出後再結案</strong><p>車賣出後，到所有紀錄按「結案」，輸入賣出價格，系統才正式計算分潤。</p></div>
      <div class="rule-item"><strong>4. 依投入比例分潤</strong><p>車輛淨利依照三位投資人的投入比例分配；若虧損，也依比例承擔。</p></div>
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
  const data = buildCarDataFromMobile();

  if (!data) {
    return;
  }

  document.getElementById("mobileResultBoxes").innerHTML = `
    <div class="result-box"><span>案件狀態</span><b>進行中</b></div>
    <div class="result-box"><span>已知成本</span><b>${money(data.totalCost)}</b></div>
    <div class="result-box"><span>總投入金額</span><b>${money(data.totalInvest)}</b></div>
    <div class="result-box"><span>代收代付</span><b>${money(data.passThrough)}</b></div>
    <div class="result-box dark"><span>李彥伯投入比例</span><b>${(data.boyfriendRate * 100).toFixed(1)}%</b></div>
    <div class="result-box"><span>李承灃投入比例</span><b>${(data.brotherRate * 100).toFixed(1)}%</b></div>
    <div class="result-box"><span>${data.thirdName} 投入比例</span><b>${(data.thirdRate * 100).toFixed(1)}%</b></div>
  `;

  const passThroughText = data.passThrough > 0
    ? `<br>代收代付 = ${money(data.passThrough)}，代墊人：${data.passThroughPayer || "未填"}，狀態：${data.passThroughStatus}<br>此金額不列入成本與分潤。`
    : "";

  document.getElementById("mobileProcess").innerHTML = `
    <b>案件進行中：</b>
    目前先記錄投入與代收代付，尚未計算正式分潤。<br>
    已知成本 = 買入 ${money(data.buyPrice)} + 整備 ${money(data.repairCost)} + 其他 ${money(data.otherCost)} + 代收代付吸收 ${money(data.absorbedPassThrough)} = ${money(data.totalCost)}<br>
    ${passThroughText}<br>
    總投入金額 = 李彥伯 ${money(data.boyfriendInvest)} + 李承灃 ${money(data.brotherInvest)} + ${data.thirdName} ${money(data.thirdInvest)} = ${money(data.totalInvest)}<br>
    等車輛賣出後，到所有紀錄按「結案」，輸入賣出價格，系統才會正式計算分潤。
  `;

  mobileLastData = data;
  mobileShowPanel("mobileResult", 4);
}

window.mobileSaveRecord = async function() {
  if (!mobileLastData) {
    alert("請先完成確認");
    return;
  }

  if (editingCarId) {
  await updateDoc(doc(db, "profitRecords", editingCarId), mobileLastData);
  alert("案件已更新");
  editingCarId = null;
} else {
  await addDoc(recordsRef, mobileLastData);
  alert("案件已儲存");
}

  mobileLastData = null;
  clearMobileForms();

  await loadRecords();
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
  setValue("mCarPassThrough", "");
  setValue("mCarPassThroughPayer", "");

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

  recordsCache = {};

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
    recordsCache[docItem.id] = data;

    const searchText = [
      data.date,
      data.type,
      data.status,
      data.name,
      data.customer,
      data.plate,
      data.sales,
      data.note,
      data.passThrough,
      data.passThroughPayer,
      data.passThroughStatus,
      data.profit,
      data.fund,
      data.bonus,
      data.boyfriendShare,
      data.brotherShare,
      data.thirdName,
      data.thirdShare
    ].join(" ").toLowerCase();

    if (mobileKeyword && !searchText.includes(mobileKeyword)) {
      return;
    }

    const isCar = data.type === "中古車投資";
    const isPending = isCar && (data.status || "進行中") === "進行中";

    if (!isPending) {
      totalProfit += Number(data.profit || 0);
      totalFund += Number(data.fund || 0);
      totalBoyfriend += Number(data.boyfriendShare || 0);
      totalBrother += Number(data.brotherShare || 0);
    }
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
      data.status,
      data.name,
      data.customer,
      data.plate,
      data.sales,
      data.note,
      data.passThrough,
      data.passThroughPayer,
      data.passThroughStatus,
      data.profit,
      data.fund,
      data.bonus,
      data.boyfriendShare,
      data.brotherShare,
      data.thirdName,
      data.thirdShare
    ].join(" ").toLowerCase();

    if (mobileKeyword && !searchText.includes(mobileKeyword)) {
      return;
    }

    const isCar = data.type === "中古車投資";
    const isPending = isCar && (data.status || "進行中") === "進行中";
    const mobileCardClass = isPending
      ? "mobile-record-card mobile-car-pending-record"
      : isCar
        ? "mobile-record-card mobile-car-record"
        : "mobile-record-card mobile-case-record";

    const displayStatus = isCar ? (data.status || "進行中") : "-";
    const statusClass = displayStatus === "進行中" ? "status-pending" : "status-closed";
    const closeBtn = isPending
      ? `<button class="mobile-close-btn" onclick="openCloseCarModal('${docItem.id}')">結案</button>`
      : "";

    const detailId = `mobileDetail_${docItem.id}`;

    list.innerHTML += `
      <div class="${mobileCardClass}">
        <div class="mobile-record-top">
          <span>${data.type || "-"}</span>
          <small>${data.date || "-"}</small>
        </div>

        <h3>${data.name || "-"}</h3>

        <div class="mobile-record-money">
          ${isCar ? `<p><span>狀態</span><b><span class="status-badge ${statusClass}">${displayStatus}</span></b></p>` : ""}
          ${!isCar ? `<p><span>客戶</span><b>${data.customer || "-"}</b></p>` : ""}
          ${!isCar ? `<p><span>車牌</span><b>${data.plate || "-"}</b></p>` : ""}

          <p><span>淨利</span><b>${isPending ? "尚未結案" : money(data.profit)}</b></p>

          ${!isCar ? `
            <p><span>設備基金</span><b>${money(data.fund)}</b></p>
            <p><span>業務獎金</span><b>${money(data.bonus)}</b></p>
          ` : ""}

          ${isCar ? `
            <p><span>李彥伯</span><b>${isPending ? "尚未結案" : money(data.boyfriendShare)}</b></p>
            <p><span>李承灃</span><b>${isPending ? "尚未結案" : money(data.brotherShare)}</b></p>
            ${data.thirdName ? `<p><span>${data.thirdName}</span><b>${isPending ? "尚未結案" : money(data.thirdShare)}</b></p>` : ""}
          ` : `
            <p><span>李彥伯</span><b>${money(data.boyfriendShare)}</b></p>
            <p><span>李承灃</span><b>${money(data.brotherShare)}</b></p>
          `}
        </div>

        ${isCar ? `
          <button class="mobile-detail-toggle" onclick="toggleMobileRecordDetail('${detailId}', this)">
            展開詳細資料
          </button>

          <div id="${detailId}" class="mobile-record-detail hidden">
            <p><span>買入價格</span><b>${money(data.buyPrice)}</b></p>
            <p><span>整備成本</span><b>${money(data.repairCost)}</b></p>
            <p><span>其他成本</span><b>${money(data.otherCost)}</b></p>
            ${data.passThrough ? `<p><span>代收代付</span><b>${money(data.passThrough)}</b></p>` : ""}
            ${data.passThrough ? `<p><span>代墊狀態</span><b>${data.passThroughPayer || "未填"}｜${data.passThroughStatus || "未結算"}</b></p>` : ""}
            ${data.passThrough ? `<p><span>是否列入成本</span><b>${data.passThroughCostMode || "結案時決定"}</b></p>` : ""}
            ${data.absorbedPassThrough ? `<p><span>吸收成本</span><b>${money(data.absorbedPassThrough)}</b></p>` : ""}
          </div>
        ` : ""}

        ${data.note ? `
          <div class="mobile-note">
            <strong>客戶備註：</strong>
            ${data.note}
          </div>
        ` : ""}

        ${isPending ? `
          <button class="mobile-edit-btn" onclick="editCarRecord('${docItem.id}')">編輯</button>
          <button class="mobile-close-btn" onclick="openCloseCarModal('${docItem.id}')">結案</button>
        ` : ""}

        <button class="mobile-delete-btn" onclick="deleteRecord('${docItem.id}')">刪除紀錄</button>
      </div>
    `;

  });
}


window.toggleMobileRecordDetail = function(detailId, button) {
  const detail = document.getElementById(detailId);

  if (!detail) {
    return;
  }

  const isHidden = detail.classList.contains("hidden");

  detail.classList.toggle("hidden", !isHidden);

  if (button) {
    button.textContent = isHidden ? "收合詳細資料" : "展開詳細資料";
  }
};

window.loadRecords = loadRecords;
window.loadMobileRecords = loadMobileRecords;
window.editCarRecord = function(id) {
  const data = recordsCache[id];

  if (!data) {
    alert("找不到這筆紀錄");
    return;
  }

  editingCarId = id;
  mobileType = "car";

  const isMobile = window.innerWidth <= 900;

  if (isMobile) {
    setValue("mCarDate", data.date);
    setValue("mCarName", data.name);
    setValue("mCarBuyPrice", data.buyPrice);
    setValue("mCarRepairCost", data.repairCost);
    setValue("mCarOtherCost", data.otherCost);
    setValue("mCarPassThrough", data.passThrough);
    setValue("mCarPassThroughPayer", data.passThroughPayer);

    setValue("mCarBoyfriendInvest", data.boyfriendInvest);
    setValue("mCarBrotherInvest", data.brotherInvest);
    setValue("mCarThirdName", data.thirdName);
    setValue("mCarThirdInvest", data.thirdInvest);

    document.getElementById("mobileFormTitle").textContent = "編輯中古車案件";
    document.getElementById("mobileCaseForm").classList.add("hidden");
    document.getElementById("mobileCarForm").classList.remove("hidden");

    mobileShowPanel("mobileForm", 3);
    return;
  }

  showPage("carPage", document.querySelectorAll(".nav button")[1]);

  setValue("carDate", data.date);
  setValue("carName", data.name);
  setValue("carBuyPrice", data.buyPrice);
  setValue("carRepairCost", data.repairCost);
  setValue("carOtherCost", data.otherCost);
  setValue("carPassThrough", data.passThrough);
  setValue("carPassThroughPayer", data.passThroughPayer);

  setValue("carBoyfriendInvest", data.boyfriendInvest);
  setValue("carBrotherInvest", data.brotherInvest);
  setValue("carThirdName", data.thirdName);
  setValue("carThirdInvest", data.thirdInvest);

  document.querySelector("#carPage .btn-blue").textContent = "更新案件";
};
loadRecords();
