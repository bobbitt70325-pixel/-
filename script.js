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
    id: Date.now(),
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

  alert("已記錄");
}

function renderRecords() {
  const historyTable = document.getElementById("historyTable");
  const records = JSON.parse(localStorage.getItem("caseRecords")) || [];

  historyTable.innerHTML = "";

  records.slice().reverse().forEach(function(record) {
    const statusClass = getStatusClass(record.netProfit);

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