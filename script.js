import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
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

let latestResult = null;

function formatMoney(number) {
  return "$" + Math.round(number).toLocaleString("zh-TW");
}

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getSalesOwnerText(value) {
  if (value === "yanbo") return "李彥伯";
  if (value === "chengfeng") return "李承峰";
  return "共同成交";
}

function getStatusText(netProfit) {
  if (netProfit > 0) return "獲利";
  if (netProfit < 0) return "賠本";
  return "打平";
}

function getStatusClass(netProfit) {
  if (netProfit > 0) return "profit-text";
  if (netProfit < 0) return "loss-text";
  return "even-text";
}

function initDate() {
  document.getElementById("caseDate").value = getTodayValue();
  document.getElementById("mobileCaseDate").value = getTodayValue();
}

function showMobilePage(pageId) {
  document.getElementById("mobileRulePage").style.display = "none";
  document.getElementById("mobileInputPage").style.display = "none";
  document.getElementById("mobileResultPage").style.display = "none";

  document.getElementById(pageId).style.display = "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function goMobileInput() {
  showMobilePage("mobileInputPage");
}

function goMobileRule() {
  showMobilePage("mobileRulePage");
}

function goMobileResult() {
  showMobilePage("mobileResultPage");
}

function desktopCalculate() {
  const data = {
    caseDate: document.getElementById("caseDate").value,
    caseName: document.getElementById("caseName").value || "未命名案件",
    customerName: document.getElementById("customerName").value || "-",
    carPlate: document.getElementById("carPlate").value || "-",
    income: Number(document.getElementById("income").value),
    cost: Number(document.getElementById("cost").value),
    salesOwner: document.getElementById("salesOwner").value
  };

  const result = calculateCore(data);

  if (!result) return;

  renderDesktopResult(result);
}

function mobileCalculate() {
  const data = {
    caseDate: document.getElementById("mobileCaseDate").value,
    caseName: document.getElementById("mobileCaseName").value || "未命名案件",
    customerName: document.getElementById("mobileCustomerName").value || "-",
    carPlate: document.getElementById("mobileCarPlate").value || "-",
    income: Number(document.getElementById("mobileIncome").value),
    cost: Number(document.getElementById("mobileCost").value),
    salesOwner: document.getElementById("mobileSalesOwner").value
  };

  const result = calculateCore(data);

  if (!result) return;

  renderMobileResult(result);
  goMobileResult();
}

function calculateCore(data) {
  const equipmentRate = 10;
  const salesRate = 20;
  const splitRate = 50;

  if (!data.caseDate) {
    alert("請選擇案件日期");
    latestResult = null;
    return null;
  }

  if (data.income < 0) {
    alert("客戶收費不能是負數");
    latestResult = null;
    return null;
  }

  if (data.cost < 0) {
    alert("成本不能是負數");
    latestResult = null;
    return null;
  }

  const netProfit = data.income - data.cost;
  const statusText = getStatusText(netProfit);
  const salesOwnerText = getSalesOwnerText(data.salesOwner);

  let equipmentFund = 0;
  let salesBonus = 0;
  let remainingProfit = 0;
  let baseShare = 0;
  let yanboSalesBonus = 0;
  let chengfengSalesBonus = 0;
  let yanboMoney = 0;
  let chengfengMoney = 0;

  if (netProfit > 0) {
    equipmentFund = netProfit * (equipmentRate / 100);
    salesBonus = netProfit * (salesRate / 100);
    remainingProfit = netProfit - equipmentFund - salesBonus;
    baseShare = remainingProfit * (splitRate / 100);

    if (data.salesOwner === "yanbo") yanboSalesBonus = salesBonus;
    if (data.salesOwner === "chengfeng") chengfengSalesBonus = salesBonus;

    if (data.salesOwner === "both") {
      yanboSalesBonus = salesBonus / 2;
      chengfengSalesBonus = salesBonus / 2;
    }

    yanboMoney = baseShare + yanboSalesBonus;
    chengfengMoney = baseShare + chengfengSalesBonus;
  }

  if (netProfit === 0) {
    equipmentFund = 0;
    salesBonus = 0;
    remainingProfit = 0;
    baseShare = 0;
    yanboMoney = 0;
    chengfengMoney = 0;
  }

  if (netProfit < 0) {
    equipmentFund = 0;
    salesBonus = 0;
    remainingProfit = netProfit;
    baseShare = netProfit / 2;
    yanboMoney = baseShare;
    chengfengMoney = baseShare;
  }

  let formulaHTML = "";

  if (netProfit > 0) {
    formulaHTML = `
      <strong>計算過程：</strong><br>
      案件淨利 = 客戶收費 ${formatMoney(data.income)} - 總成本 ${formatMoney(data.cost)} = ${formatMoney(netProfit)}<br>
      設備資金 = 案件淨利 ${formatMoney(netProfit)} × ${equipmentRate}% = ${formatMoney(equipmentFund)}<br>
      業務獎金 = 案件淨利 ${formatMoney(netProfit)} × ${salesRate}% = ${formatMoney(salesBonus)}<br>
      本案業務成交人：${salesOwnerText}<br>
      剩餘利潤 = 案件淨利 ${formatMoney(netProfit)} - 設備資金 ${formatMoney(equipmentFund)} - 業務獎金 ${formatMoney(salesBonus)} = ${formatMoney(remainingProfit)}<br>
      剩餘利潤對半分 = ${formatMoney(remainingProfit)} × 50% = ${formatMoney(baseShare)}<br>
      李彥伯分潤 = 基本分潤 ${formatMoney(baseShare)} + 業務獎金 ${formatMoney(yanboSalesBonus)} = ${formatMoney(yanboMoney)}<br>
      李承峰分潤 = 基本分潤 ${formatMoney(baseShare)} + 業務獎金 ${formatMoney(chengfengSalesBonus)} = ${formatMoney(chengfengMoney)}
    `;
  }

  if (netProfit === 0) {
    formulaHTML = `
      <strong>計算過程：</strong><br>
      案件淨利 = 客戶收費 ${formatMoney(data.income)} - 總成本 ${formatMoney(data.cost)} = ${formatMoney(netProfit)}<br>
      因本案剛好打平，所以不提撥設備資金、不發放業務獎金，雙方分潤皆為 ${formatMoney(0)}。
    `;
  }

  if (netProfit < 0) {
    formulaHTML = `
      <strong>計算過程：</strong><br>
      案件淨利 = 客戶收費 ${formatMoney(data.income)} - 總成本 ${formatMoney(data.cost)} = ${formatMoney(netProfit)}<br>
      因本案為虧損案件，所以不提撥設備資金、不發放業務獎金。<br>
      虧損由兩人平均承擔：${formatMoney(netProfit)} ÷ 2 = ${formatMoney(baseShare)}<br>
      李彥伯本案承擔：${formatMoney(yanboMoney)}<br>
      李承峰本案承擔：${formatMoney(chengfengMoney)}
    `;
  }

  latestResult = {
    createdAt: new Date().toISOString(),
    date: data.caseDate,
    status: statusText,
    caseName: data.caseName,
    customerName: data.customerName,
    carPlate: data.carPlate,
    income: data.income,
    cost: data.cost,
    netProfit,
    equipmentFund,
    salesBonus,
    salesOwner: salesOwnerText,
    yanboMoney,
    chengfengMoney,
    formulaHTML
  };

  return latestResult;
}

function renderDesktopResult(result) {
  document.getElementById("netProfit").innerText = formatMoney(result.netProfit);
  document.getElementById("equipmentFund").innerText = formatMoney(result.equipmentFund);
  document.getElementById("salesBonus").innerText = formatMoney(result.salesBonus);
  document.getElementById("yanboMoney").innerText = formatMoney(result.yanboMoney);
  document.getElementById("chengfengMoney").innerText = formatMoney(result.chengfengMoney);
  document.getElementById("formulaText").innerHTML = result.formulaHTML;
}

function renderMobileResult(result) {
  document.getElementById("mobileNetProfit").innerText = formatMoney(result.netProfit);
  document.getElementById("mobileEquipmentFund").innerText = formatMoney(result.equipmentFund);
  document.getElementById("mobileSalesBonus").innerText = formatMoney(result.salesBonus);
  document.getElementById("mobileYanboMoney").innerText = formatMoney(result.yanboMoney);
  document.getElementById("mobileChengfengMoney").innerText = formatMoney(result.chengfengMoney);
  document.getElementById("mobileFormulaText").innerHTML = result.formulaHTML;
}

async function saveRecord() {
  if (latestResult === null) {
    alert("請先計算後再儲存");
    return;
  }

  try {
    await addDoc(collection(db, "caseRecords"), latestResult);

    alert("已記錄");

    await renderRecords();
    await renderMonthlySummary();
  } catch (error) {
    console.error(error);
    alert("儲存失敗，請檢查 Firebase 規則");
  }
}

async function getAllRecords() {
  const querySnapshot = await getDocs(collection(db, "caseRecords"));
  const records = [];

  querySnapshot.forEach(function(docItem) {
    records.push({
      firebaseId: docItem.id,
      ...docItem.data()
    });
  });

  records.sort(function(a, b) {
    return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
  });

  return records;
}

async function renderRecords() {
  const historyTable = document.getElementById("historyTable");

  if (!historyTable) return;

  historyTable.innerHTML = "";

  const records = await getAllRecords();

  records.forEach(function(record) {
    const statusClass = getStatusClass(record.netProfit);

    historyTable.innerHTML += `
      <tr>
        <td>
          <button class="delete-btn" onclick="deleteRecord('${record.firebaseId}')">刪除</button>
        </td>
        <td>${record.date}</td>
        <td>${record.caseName}</td>
        <td>${record.customerName}</td>
        <td>${record.carPlate}</td>
        <td>${formatMoney(record.income)}</td>
        <td>${formatMoney(record.cost)}</td>
        <td class="${statusClass}">${formatMoney(record.netProfit)}</td>
        <td>${record.salesOwner}</td>
        <td>${formatMoney(record.equipmentFund)}</td>
        <td>${formatMoney(record.salesBonus)}</td>
        <td>${formatMoney(record.yanboMoney)}</td>
        <td>${formatMoney(record.chengfengMoney)}</td>
      </tr>
    `;
  });
}

async function deleteRecord(id) {
  const confirmDelete = confirm("確定要刪除這筆案件嗎？");

  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "caseRecords", id));

    await renderRecords();
    await renderMonthlySummary();
  } catch (error) {
    console.error(error);
    alert("刪除失敗");
  }
}

async function clearRecords() {
  const confirmClear = confirm("確定要清空所有案件紀錄嗎？");

  if (!confirmClear) return;

  try {
    const records = await getAllRecords();

    for (const record of records) {
      await deleteDoc(doc(db, "caseRecords", record.firebaseId));
    }

    await renderRecords();
    await renderMonthlySummary();
  } catch (error) {
    console.error(error);
    alert("清空失敗");
  }
}

async function renderMonthlySummary() {
  const records = await getAllRecords();

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const monthRecords = records.filter(function(record) {
    return record.date && record.date.startsWith(currentMonth);
  });

  let monthIncome = 0;
  let monthNetProfit = 0;
  let monthEquipment = 0;
  let monthYanbo = 0;
  let monthChengfeng = 0;

  monthRecords.forEach(function(record) {
    monthIncome += Number(record.income) || 0;
    monthNetProfit += Number(record.netProfit) || 0;
    monthEquipment += Number(record.equipmentFund) || 0;
    monthYanbo += Number(record.yanboMoney) || 0;
    monthChengfeng += Number(record.chengfengMoney) || 0;
  });

  document.getElementById("monthIncome").innerText = formatMoney(monthIncome);
  document.getElementById("monthNetProfit").innerText = formatMoney(monthNetProfit);
  document.getElementById("monthEquipment").innerText = formatMoney(monthEquipment);
  document.getElementById("monthYanbo").innerText = formatMoney(monthYanbo);
  document.getElementById("monthChengfeng").innerText = formatMoney(monthChengfeng);
}

async function exportCSV() {
  const records = await getAllRecords();

  if (records.length === 0) {
    alert("目前沒有案件紀錄可以匯出");
    return;
  }

  const header = [
    "日期",
    "案件名稱",
    "客戶名稱",
    "車牌",
    "客戶收費",
    "總成本",
    "案件淨利",
    "業務成交人",
    "設備資金",
    "業務獎金",
    "李彥伯",
    "李承峰"
  ];

  const rows = records.map(function(record) {
    return [
      record.date,
      record.caseName,
      record.customerName,
      record.carPlate,
      record.income,
      record.cost,
      record.netProfit,
      record.salesOwner,
      record.equipmentFund,
      record.salesBonus,
      record.yanboMoney,
      record.chengfengMoney
    ];
  });

  const csvContent = [header, ...rows]
    .map(function(row) {
      return row.map(function(value) {
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(",");
    })
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "小李車庫案件紀錄.csv";
  link.click();

  URL.revokeObjectURL(url);
}

window.goMobileInput = goMobileInput;
window.goMobileRule = goMobileRule;
window.goMobileResult = goMobileResult;
window.mobileCalculate = mobileCalculate;
window.desktopCalculate = desktopCalculate;
window.saveRecord = saveRecord;
window.deleteRecord = deleteRecord;
window.clearRecords = clearRecords;
window.exportCSV = exportCSV;

initDate();
renderRecords();
renderMonthlySummary();