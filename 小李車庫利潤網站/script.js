let latestResult = null;

function formatMoney(number) {
  return "$" + Math.round(number).toLocaleString("zh-TW");
}

function parseMoney(moneyText) {
  return Number(String(moneyText).replace(/[$,]/g, ""));
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

function initDate() {
  document.getElementById("caseDate").value = getTodayValue();
}

function calculate() {
  const caseDate = document.getElementById("caseDate").value;
  const caseName = document.getElementById("caseName").value || "未命名案件";
  const customerName = document.getElementById("customerName").value || "-";
  const carPlate = document.getElementById("carPlate").value || "-";
  const income = Number(document.getElementById("income").value);
  const cost = Number(document.getElementById("cost").value);
  const salesOwner = document.getElementById("salesOwner").value;

  const equipmentRate = 10;
  const salesRate = 20;
  const splitRate = 50;

  if (!caseDate) {
    alert("請選擇案件日期");
    return;
  }

  if (income <= 0) {
    alert("請輸入客戶收費");
    return;
  }

  if (cost < 0) {
    alert("成本不能是負數");
    return;
  }

  const netProfit = income - cost;

  if (netProfit <= 0) {
    alert("這筆案件沒有淨利");
    return;
  }

  const equipmentFund = netProfit * (equipmentRate / 100);
  const salesBonus = netProfit * (salesRate / 100);
  const remainingProfit = netProfit - equipmentFund - salesBonus;
  const baseShare = remainingProfit * (splitRate / 100);

  let yanboSalesBonus = 0;
  let chengfengSalesBonus = 0;
  const salesOwnerText = getSalesOwnerText(salesOwner);

  if (salesOwner === "yanbo") {
    yanboSalesBonus = salesBonus;
  }

  if (salesOwner === "chengfeng") {
    chengfengSalesBonus = salesBonus;
  }

  if (salesOwner === "both") {
    yanboSalesBonus = salesBonus / 2;
    chengfengSalesBonus = salesBonus / 2;
  }

  const yanboMoney = baseShare + yanboSalesBonus;
  const chengfengMoney = baseShare + chengfengSalesBonus;

  document.getElementById("netProfit").innerText = formatMoney(netProfit);
  document.getElementById("equipmentFund").innerText = formatMoney(equipmentFund);
  document.getElementById("salesBonus").innerText = formatMoney(salesBonus);
  document.getElementById("yanboMoney").innerText = formatMoney(yanboMoney);
  document.getElementById("chengfengMoney").innerText = formatMoney(chengfengMoney);

  document.getElementById("formulaText").innerHTML = `
    <strong>計算過程：</strong><br>
    案件淨利 = 客戶收費 ${formatMoney(income)} - 總成本 ${formatMoney(cost)} = ${formatMoney(netProfit)}<br>
    設備資金 = 案件淨利 ${formatMoney(netProfit)} × ${equipmentRate}% = ${formatMoney(equipmentFund)}<br>
    業務獎金 = 案件淨利 ${formatMoney(netProfit)} × ${salesRate}% = ${formatMoney(salesBonus)}<br>
    本案業務成交人：${salesOwnerText}<br>
    剩餘利潤 = 案件淨利 ${formatMoney(netProfit)} - 設備資金 ${formatMoney(equipmentFund)} - 業務獎金 ${formatMoney(salesBonus)} = ${formatMoney(remainingProfit)}<br>
    剩餘利潤對半分 = ${formatMoney(remainingProfit)} × 50% = ${formatMoney(baseShare)}<br>
    李彥伯分潤 = 基本分潤 ${formatMoney(baseShare)} + 業務獎金 ${formatMoney(yanboSalesBonus)} = ${formatMoney(yanboMoney)}<br>
    李承峰分潤 = 基本分潤 ${formatMoney(baseShare)} + 業務獎金 ${formatMoney(chengfengSalesBonus)} = ${formatMoney(chengfengMoney)}
  `;

  latestResult = {
    id: Date.now(),
    date: caseDate,
    caseName,
    customerName,
    carPlate,
    income,
    cost,
    netProfit,
    equipmentFund,
    salesBonus,
    salesOwner: salesOwnerText,
    yanboMoney,
    chengfengMoney
  };
}

function saveRecord() {
  if (latestResult === null) {
    alert("請先計算後再儲存");
    return;
  }

  const records = JSON.parse(localStorage.getItem("caseRecords")) || [];

  records.push(latestResult);

  localStorage.setItem("caseRecords", JSON.stringify(records));

  renderRecords();
  renderMonthlySummary();

  alert("已儲存本次案件");
}

function renderRecords() {
  const historyTable = document.getElementById("historyTable");
  const records = JSON.parse(localStorage.getItem("caseRecords")) || [];

  historyTable.innerHTML = "";

  records.slice().reverse().forEach(function(record) {
    historyTable.innerHTML += `
      <tr>
        <td>
          <button class="delete-btn" onclick="deleteRecord(${record.id})">刪除</button>
        </td>
        <td>${record.date}</td>
        <td>${record.caseName}</td>
        <td>${record.customerName}</td>
        <td>${record.carPlate}</td>
        <td>${formatMoney(record.income)}</td>
        <td>${formatMoney(record.cost)}</td>
        <td>${formatMoney(record.netProfit)}</td>
        <td>${record.salesOwner}</td>
        <td>${formatMoney(record.equipmentFund)}</td>
        <td>${formatMoney(record.salesBonus)}</td>
        <td>${formatMoney(record.yanboMoney)}</td>
        <td>${formatMoney(record.chengfengMoney)}</td>
      </tr>
    `;
  });
}

function deleteRecord(id) {
  const confirmDelete = confirm("確定要刪除這筆案件嗎？");

  if (!confirmDelete) return;

  let records = JSON.parse(localStorage.getItem("caseRecords")) || [];

  records = records.filter(function(record) {
    return record.id !== id;
  });

  localStorage.setItem("caseRecords", JSON.stringify(records));

  renderRecords();
  renderMonthlySummary();
}

function clearRecords() {
  const confirmClear = confirm("確定要清空所有案件紀錄嗎？");

  if (!confirmClear) return;

  localStorage.removeItem("caseRecords");

  renderRecords();
  renderMonthlySummary();
}

function renderMonthlySummary() {
  const records = JSON.parse(localStorage.getItem("caseRecords")) || [];
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const monthRecords = records.filter(function(record) {
    return record.date.startsWith(currentMonth);
  });

  let monthIncome = 0;
  let monthNetProfit = 0;
  let monthEquipment = 0;
  let monthYanbo = 0;
  let monthChengfeng = 0;

  monthRecords.forEach(function(record) {
    monthIncome += record.income;
    monthNetProfit += record.netProfit;
    monthEquipment += record.equipmentFund;
    monthYanbo += record.yanboMoney;
    monthChengfeng += record.chengfengMoney;
  });

  document.getElementById("monthIncome").innerText = formatMoney(monthIncome);
  document.getElementById("monthNetProfit").innerText = formatMoney(monthNetProfit);
  document.getElementById("monthEquipment").innerText = formatMoney(monthEquipment);
  document.getElementById("monthYanbo").innerText = formatMoney(monthYanbo);
  document.getElementById("monthChengfeng").innerText = formatMoney(monthChengfeng);
}

function exportCSV() {
  const records = JSON.parse(localStorage.getItem("caseRecords")) || [];

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

initDate();
renderRecords();
renderMonthlySummary();