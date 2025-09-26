let budget = 0;
let budgetPeriod = "monthly";
let expensesCache = [];
let currentFiltered = [];
let searchQuery = "";
let pageSize = 10;
let currentPage = 1;
// category budgets stored per period in localStorage
// structure: { monthly: { Category: amount, ... }, weekly: { ... } }
let categoryBudgets = JSON.parse(localStorage.getItem("categoryBudgets") || '{"monthly":{},"weekly":{}}');
let catAuto = JSON.parse(localStorage.getItem("catAuto") || '{"enabled":false,"mode":"last_period"}');

// ---------------- On Load ----------------
window.onload = () => {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "login.html");

  const savedPeriod = localStorage.getItem("budgetPeriod");
  if (savedPeriod) {
    budgetPeriod = savedPeriod;
    const sel = document.getElementById("budgetPeriod");
    if (sel) sel.value = budgetPeriod;
  }

// (moved setQuickRange/exportCSV/cleanupSavingsStorage below to global scope)

  // Cleanup any legacy savings storage
  cleanupSavingsStorage();

  loadBudget();
  loadExpenses();
  // initialize auto controls UI
  const autoToggle = document.getElementById('catAutoToggle');
  if (autoToggle) autoToggle.checked = !!catAuto.enabled;
  const autoMode = document.getElementById('catAutoMode');
  if (autoMode) autoMode.value = catAuto.mode || 'last_period';
  // Render initial recommendations (will refine after data loads)
  try { renderRecommendations(); } catch {}
};

// ---------------- Quick Ranges + Export ----------------
function setQuickRange(range) {
  const from = document.getElementById("filterFrom");
  const to = document.getElementById("filterTo");
  if (!from || !to) return;

  const now = new Date();
  let start, end;
  if (range === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (range === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (range === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  } else {
    return;
  }

  from.value = start.toISOString().slice(0,10);
  to.value = end.toISOString().slice(0,10);
  applyFiltersAndRender();
}

function exportCSV() {
  if (!Array.isArray(currentFiltered)) currentFiltered = [];
  const header = ["Description", "Type", "Amount", "Details", "Date"];
  const dataRows = currentFiltered.map(e => {
    const d = getExpenseDate(e);
    const dateStr = formatDateISO(d) || formatDateISO(new Date());
    return [
      e.description ?? '',
      e.type ?? '',
      String(e.amount ?? ''),
      e.details ?? '',
      dateStr
    ];
  });

  if (dataRows.length === 0) {
    showToast("No expenses in the current view to export.", "warning");
    return;
  }

  const rows = [
    header,
    ...dataRows
  ];
  const csv = rows.map(r => r.map(field => {
    const s = String(field).replaceAll('"', '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }).join(','))
  .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const from = document.getElementById('filterFrom')?.value || '';
  const to = document.getElementById('filterTo')?.value || '';
  a.download = `expenses_${from || 'all'}_${to || 'all'}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
  showToast(`Exported ${dataRows.length} rows to CSV.`, "success");
}

// Ensure global access for inline onclick in HTML
window.setQuickRange = setQuickRange;
window.exportCSV = exportCSV;

// ISO date (YYYY-MM-DD) for Date objects
function formatDateISO(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

// Get a reliable Date object for an expense using date | createdAt | ObjectId timestamp
function getExpenseDate(exp) {
  try {
    if (exp?.date) {
      const d1 = new Date(exp.date);
      if (!isNaN(d1)) return d1;
    }
    if (exp?.createdAt) {
      const d2 = new Date(exp.createdAt);
      if (!isNaN(d2)) return d2;
    }
    // Heuristic: look for any property with 'date' or 'created' in name
    for (const k in exp) {
      if (!Object.prototype.hasOwnProperty.call(exp, k)) continue;
      const lk = k.toLowerCase();
      if (lk.includes('date') || lk.includes('created')) {
        const dv = new Date(exp[k]);
        if (!isNaN(dv)) return dv;
      }
    }
    if (exp?._id && typeof exp._id === 'string' && exp._id.length >= 8) {
      const ts = parseInt(exp._id.substring(0,8), 16) * 1000;
      const d3 = new Date(ts);
      if (!isNaN(d3)) return d3;
    }
  } catch {}
  return null;
}

function cleanupSavingsStorage() {
  try {
    localStorage.removeItem("savingsGoal");
    localStorage.removeItem("savingsDeposits");
    localStorage.removeItem("goalCongratsKey");
  } catch {}
}

// ---------------- Notifications (Bootstrap Toast) ----------------
function showToast(message, variant = "info", options = {}) {
  const container = document.getElementById("toastContainer");
  if (!container) return alert(message);

  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const delay = options.delay ?? 5000;

  const accent = variant === "success" ? "#10b981" : variant === "warning" ? "#f59e0b" : variant === "danger" ? "#ef4444" : "#0ea5e9";
  const borderColor = variant === "danger" ? "#ef4444" : variant === "warning" ? "#f59e0b" : "#10b981";
  const gradient = options.gradient ?? `linear-gradient(135deg, ${accent}22, #ffffff)`;

  const toastEl = document.createElement("div");
  toastEl.id = id;
  toastEl.className = "toast shadow";
  toastEl.role = "alert";
  toastEl.ariaLive = "assertive";
  toastEl.ariaAtomic = "true";
  toastEl.style.borderLeft = `4px solid ${borderColor}`;
  toastEl.style.background = gradient;

  toastEl.innerHTML = `
    <div class="toast-body d-flex align-items-center gap-2">
      <i class="fa-solid fa-bell" style="color:${accent}"></i>
      <div class="flex-grow-1">${message}</div>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;

  container.appendChild(toastEl);
  try {
    const t = new bootstrap.Toast(toastEl, { delay });
    t.show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  } catch(e) {
    // Fallback if bootstrap toast not available
    setTimeout(()=>toastEl.remove(), delay);
  }

  // Do not trigger threshold checks from within showToast to avoid recursive loops
}

// ---------------- Budget ----------------
async function loadBudget() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`http://localhost:5000/api/budget?period=${budgetPeriod}`, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) throw new Error("Failed to fetch budget");

    const data = await res.json();
    budget = Math.max(0, Number(data.budget) || 0);
    budgetPeriod = data.period || budgetPeriod;

    const amt = document.getElementById("budgetAmount");
    if (amt) amt.value = budget;

    const totalEl = document.getElementById("budgetTotal");
    if (totalEl) totalEl.innerText = budget;

    const periodTotal = sumForPeriod(expensesCache, budgetPeriod);
    updateBudgetStatus(periodTotal);
    // Budget changes can affect recommendations
    renderRecommendations();
  } catch (err) {
    console.error("Error loading budget:", err);
  }
}

async function setBudget() {
  const token = localStorage.getItem("token");
  const amtEl = document.getElementById("budgetAmount");
  const newBudget = amtEl ? Number(amtEl.value) : 0;
  const periodSel = document.getElementById("budgetPeriod");
  const period = periodSel ? periodSel.value : budgetPeriod;

  if (isNaN(newBudget) || newBudget < 0) {
    alert("Please enter a valid non-negative budget amount.");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/budget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ budget: newBudget, period }),
    });
    if (!res.ok) throw new Error("Failed to set budget");

    const data = await res.json();
    budget = Math.max(0, Number(data.budget) || 0);
    budgetPeriod = data.period || period;
    localStorage.setItem("budgetPeriod", budgetPeriod);

    const totalEl = document.getElementById("budgetTotal");
    if (totalEl) totalEl.innerText = budget;

    const periodTotal = sumForPeriod(expensesCache, budgetPeriod);
    updateBudgetStatus(periodTotal);
    // Re-evaluate recommendations after saving budget
    renderRecommendations();
  } catch (err) {
    console.error(err);
    alert("Failed to set budget. Please try again.");
  }
}

function updateBudgetStatus(total = 0) {
  const status = document.getElementById("budgetStatus");
  const usedEl = document.getElementById("budgetUsed");
  const bar = document.getElementById("budgetProgress");
  const alertEl = document.getElementById("budgetAlert");
  if (!status) return;

  if (budget <= 0) {
    status.innerText = "No budget set.";
    status.style.color = "gray";
    if (usedEl) usedEl.innerText = total;
    if (bar) bar.style.width = "0%";
    if (alertEl) alertEl.classList.add("d-none");
    return;
  }

  const percent = (total / budget) * 100;
  if (usedEl) usedEl.innerText = total;
  if (bar) {
    const clamped = Math.min(100, Math.max(0, percent));
    bar.style.width = `${clamped}%`;
    // color states for inline bar
    bar.classList.remove('bg-danger','bg-warning');
    if (percent >= 100) {
      bar.classList.add('bg-danger');
    } else if (percent >= 80) {
      bar.classList.add('bg-warning');
    }
  }

  const circle = document.getElementById("budgetCircle");
  const percentEl = document.getElementById("budgetPercent");
  const clamped = Math.max(0, Math.min(100, percent));
  if (circle)
    circle.style.background = `conic-gradient(#10B981 0% ${clamped}%, #e5e7eb ${clamped}% 100%)`;
  if (percentEl) percentEl.textContent = `${clamped.toFixed(0)}%`;

  if (percent < 70) {
    status.innerText = `Safe: ${percent.toFixed(1)}% of ${budgetPeriod} budget used`;
    status.style.color = "#0ea5e9";
    if (alertEl) {
      alertEl.className = "alert alert-info py-2 px-3 mb-2";
      alertEl.textContent = "You're within your budget.";
      alertEl.classList.remove("d-none");
    }
  } else if (percent < 90) {
    status.innerText = `Caution: ${percent.toFixed(1)}% of ${budgetPeriod} budget used`;
    status.style.color = "#f59e0b";
    if (alertEl) {
      alertEl.className = "alert alert-warning py-2 px-3 mb-2";
      alertEl.textContent = "You crossed 70% of your budget.";
      alertEl.classList.remove("d-none");
    }
  } else if (percent < 100) {
    status.innerText = `Warning: ${percent.toFixed(1)}% of ${budgetPeriod} budget used`;
    status.style.color = "#f59e0b";
    if (alertEl) {
      alertEl.className = "alert alert-warning py-2 px-3 mb-2";
      alertEl.textContent = "You crossed 90% of your budget.";
      alertEl.classList.remove("d-none");
    }
  } else {
    status.innerText = `Over Limit! ${percent.toFixed(1)}% of ${budgetPeriod} budget used`;
    status.style.color = "#ef4444";
    if (alertEl) {
      alertEl.className = "alert alert-danger py-2 px-3 mb-2";
      alertEl.textContent = "You reached/exceeded 100% of your budget.";
      alertEl.classList.remove("d-none");
    }
  }
  // Trigger main budget threshold toasts here (once per period per session)
  try { notifyMainBudgetThreshold(percent); } catch {}
}

// ---------------- Expenses ----------------
async function loadExpenses() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("http://localhost:5000/api/expenses", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) {
      let msg = `Failed to fetch expenses (${res.status})`;
      try {
        const data = await res.json();
        if (data?.message) msg = data.message;
      } catch {}
      console.error("loadExpenses error:", res.status, msg);
      if (res.status === 401) {
        showToast("Session expired. Please log in again.", "warning");
        localStorage.removeItem("token");
        return (window.location.href = "login.html");
      }
      showToast(msg, "danger");
      throw new Error(msg);
    }

    expensesCache = await res.json();
    populateCategoryFilter(expensesCache);
    applyFiltersAndRender();

    const periodTotal = sumForPeriod(expensesCache, budgetPeriod);
    updateBudgetStatus(periodTotal);
    showTopSpendingOnce();
    renderCategoryBudgets();
    if (catAuto.enabled) autoAssignCategoryBudgets();
    // Ensure recommendations render after data arrives
    renderRecommendations();
  } catch (err) {
    console.error("Failed to load expenses:", err);
    // keep a subtle toast instead of blocking alert
    showToast("Failed to load expenses. Check backend and network.", "danger");
    // still render generic recommendations without data
    try { renderRecommendations(); } catch {}
  }
}

function showTopSpendingOnce() {
  try {
    if (sessionStorage.getItem("topSpendingShown") === "1") return;
    const catTotals = expensesCache.reduce((acc, e) => { const k = e.type || "Other"; acc[k] = (acc[k]||0) + Number(e.amount||0); return acc; }, {});
    const top = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    if (top && top[1] > 0) {
      showToast(`You're spending the most on ${top[0]} (₹${top[1]})`, "warning");
      sessionStorage.setItem("topSpendingShown", "1");
    }
  } catch {}
}

async function deleteExpense(id) {
  const token = localStorage.getItem("token");
  if (!id) return;

  if (!confirm("Are you sure you want to delete this expense?")) return;

  try {
    const res = await fetch(`http://localhost:5000/api/expenses/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) throw new Error("Failed to delete expense");
    loadExpenses();
  } catch (err) {
    console.error(err);
    alert("Error deleting expense.");
  }
}

// ---------------- Charts ----------------
let pieChart, barChart;
function renderCharts(categoryMap, trendMap) {
  const pieCtx = document.getElementById("pieChart").getContext("2d");
  const barCtx = document.getElementById("barChart").getContext("2d");

  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();

  const pastelColors = generateColors(Object.keys(categoryMap).length);

  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryMap),
      datasets: [{ data: Object.values(categoryMap), backgroundColor: pastelColors, borderColor: "#fff", borderWidth: 2, hoverOffset: 12 }],
    },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { color: "#374151", font: { family: "Inter", size: 14 }, usePointStyle: true } },
      },
      animation: { duration: 1400, easing: "easeOutBounce" },
    },
  });


  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: Object.keys(trendMap),
      datasets: [{ label: "Expenses", data: Object.values(trendMap), backgroundColor: "rgba(168, 218, 220, 0.8)", borderRadius: 12, borderSkipped: false, barPercentage: 0.6 }],
    },
    options: {
      scales: {
        x: { ticks: { color: "#6b7280", font: { family: "Inter" } }, grid: { display: false } },
        y: { ticks: { color: "#6b7280", font: { family: "Inter" } }, grid: { color: "rgba(0,0,0,0.05)" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#fff", borderColor: "#e5e7eb", borderWidth: 1, titleColor: "#111827", bodyColor: "#374151", titleFont: { family: "Inter", weight: "600" }, bodyFont: { family: "Inter" }, padding: 12 },
      },
      animation: { duration: 1400, easing: "easeOutQuart" },
    },
  });
}

// Generate dynamic pastel colors
function generateColors(n) {
  const colors = [];
  const baseColors = [
    [168, 218, 220],
    [144, 190, 109],
    [246, 189, 96],
    [244, 162, 97],
    [185, 224, 255],
    [239, 154, 154],
    [206, 147, 216],
    [255, 204, 128],
    [129, 212, 250],
  ];
  for (let i = 0; i < n; i++) {
    const c = baseColors[i % baseColors.length];
    colors.push(`rgba(${c[0]},${c[1]},${c[2]},0.9)`);
  }
  return colors;
}

// (Savings Goal feature removed)

// ---------------- Filters ----------------
function populateCategoryFilter(expenses) {
  const select = document.getElementById("filterCategory");
  if (!select) return;
  const categories = Array.from(new Set(expenses.map((e) => e.type))).filter(Boolean).sort();
  const prev = select.value;
  select.innerHTML = '<option value="all">All</option>' + categories.map((c) => `<option value="${c}">${c}</option>`).join("");
  if (prev && (prev === "all" || categories.includes(prev))) select.value = prev;
  // also refresh category budgets panel when categories change
  renderCategoryBudgets();
}

function getActiveFilters() {
  const sel = document.getElementById("filterCategory");
  const from = document.getElementById("filterFrom");
  const to = document.getElementById("filterTo");
  return {
    category: sel ? sel.value : "all",
    from: from && from.value ? new Date(from.value) : null,
    to: to && to.value ? new Date(to.value) : null,
  };
}

function filterExpenses(expenses) {
  const { category, from, to } = getActiveFilters();
  return expenses.filter((e) => {
    const dt = new Date(e.date);
    const inCat = category === "all" ? true : e.type === category;
    const inSearch = !searchQuery
      ? true
      : (String(e.description||"").toLowerCase().includes(searchQuery) || String(e.details||"").toLowerCase().includes(searchQuery));
    let okFrom = true, okTo = true;
    if (from) { const f = new Date(from); f.setHours(0,0,0,0); okFrom = dt >= f; }
    if (to) { const t = new Date(to); t.setHours(23,59,59,999); okTo = dt <= t; }
    return inCat && inSearch && okFrom && okTo;
  });
}

function renderTable(expenses) {
  const table = document.getElementById("expenseTable");
  if (!table) return;
  // pagination
  const total = expenses.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(total, startIdx + pageSize);
  const pageItems = expenses.slice(startIdx, endIdx);

  table.innerHTML = "";
  pageItems.forEach((exp) => {
    const d = getExpenseDate(exp);
    const displayDate = d ? d.toLocaleDateString() : '';
    table.innerHTML += `<tr>
      <td>${exp.description}</td>
      <td>${exp.type}</td>
      <td>${exp.amount}</td>
      <td>${exp.details || ""}</td>
      <td>${displayDate}</td>
      <td class="text-end">
        <button title="Delete" onclick="deleteExpense('${exp._id}')" class="action-btn"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  });

  renderPaginationControls(total, startIdx+1, endIdx, totalPages);
}

function applyFiltersAndRender() {
  currentFiltered = filterExpenses(expensesCache);
  const filteredTotal = currentFiltered.reduce((s,e)=>s+Number(e.amount||0),0);
  const totalEl = document.getElementById("total");
  if(totalEl) totalEl.innerText = filteredTotal;

  const categoryMap = {};
  currentFiltered.forEach(e => { categoryMap[e.type] = (categoryMap[e.type]||0) + Number(e.amount||0); });

  const granSel = document.getElementById("trendGranularity");
  const granularity = granSel ? granSel.value : "daily";
  const trendMap = buildTrendMap(currentFiltered, granularity);

  renderTable(currentFiltered);
  renderCharts(categoryMap, trendMap);
  // keep recommendations in sync with current view
  renderRecommendations();
}

function renderPaginationControls(total, start, end, totalPages) {
  const container = document.getElementById("paginationControls");
  if (!container) return;
  container.innerHTML = `
    <div class="text-muted small">Showing ${total ? start : 0}–${total ? end : 0} of ${total}</div>
    <div class="btn-group">
      <button class="btn btn-outline-secondary btn-sm" ${currentPage<=1?'disabled':''} onclick="gotoPage(${currentPage-1})">Prev</button>
      <span class="btn btn-light btn-sm disabled">Page ${currentPage} / ${totalPages}</span>
      <button class="btn btn-outline-secondary btn-sm" ${currentPage>=totalPages?'disabled':''} onclick="gotoPage(${currentPage+1})">Next</button>
    </div>`;
}

function gotoPage(p) {
  currentPage = Math.max(1, p);
  applyFiltersAndRender();
}

function onSearchChange(val) {
  searchQuery = String(val||"").trim().toLowerCase();
  currentPage = 1;
  applyFiltersAndRender();
}

function onPageSizeChange(val) {
  const n = Number(val);
  pageSize = isNaN(n) || n <= 0 ? 10 : n;
  currentPage = 1;
  applyFiltersAndRender();
}

function clearFilters() {
  const sel = document.getElementById("filterCategory");
  const from = document.getElementById("filterFrom");
  const to = document.getElementById("filterTo");
  if(sel) sel.value="all";
  if(from) from.value="";
  if(to) to.value="";
  applyFiltersAndRender();
}

// ---------------- Helpers ----------------
function onPeriodChange() {
  const sel = document.getElementById("budgetPeriod");
  if(!sel) return;
  budgetPeriod = sel.value;
  localStorage.setItem("budgetPeriod", budgetPeriod);
  loadBudget();
  // re-render category budgets since thresholds change with period
  renderCategoryBudgets();
  if (catAuto.enabled) autoAssignCategoryBudgets();
}

function onTrendChange() {
  applyFiltersAndRender();
}

function sumForPeriod(expenses, period) {
  const now = new Date();
  let start;
  if(period==="weekly") {
    const day = now.getDay();
    const diff = (day+6)%7;
    start = new Date(now);
    start.setDate(now.getDate()-diff);
    start.setHours(0,0,0,0);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return expenses.filter(e=>new Date(e.date)>=start).reduce((s,e)=>s+Number(e.amount||0),0);
}

// (Different Budget section removed)

function buildTrendMap(expenses, granularity) {
  const map={};
  const fmt = (date) => date.toLocaleDateString();
  if(granularity==="weekly") {
    expenses.forEach(e=>{ const dt=new Date(e.date); const weekKey=isoWeekKey(dt); map[weekKey]=(map[weekKey]||0)+Number(e.amount||0); });
  } else if(granularity==="monthly") {
    expenses.forEach(e=>{ const dt=new Date(e.date); const key=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; map[key]=(map[key]||0)+Number(e.amount||0); });
  } else {
    expenses.forEach(e=>{ const dt=new Date(e.date); const key=fmt(dt); map[key]=(map[key]||0)+Number(e.amount||0); });
  }
  return map;
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(((d-yearStart)/86400000+1)/7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,"0")}`;
}

// ---------------- Auth ----------------
function logout() {
  localStorage.removeItem("token");
  window.location.href="login.html";
}

// ---------------- Category Budgets ----------------
function renderCategoryBudgets() {
  const wrap = document.getElementById("categoryBudgets");
  if (!wrap) return;
  // compute period-aware spend per category
  const startTotal = getPeriodStart(budgetPeriod);
  const spendMap = {};
  expensesCache.forEach(e=>{
    const d = new Date(e.date);
    if (isNaN(d) || d < startTotal) return;
    const k = e.type || 'Other';
    spendMap[k] = (spendMap[k]||0) + Number(e.amount||0);
  });

  const budgetsForPeriod = categoryBudgets[budgetPeriod] || {};
  const cats = Object.keys(spendMap).sort((a,b)=>spendMap[b]-spendMap[a]);
  wrap.innerHTML = cats.map(cat => {
    const budgetAmt = Number(budgetsForPeriod[cat] || 0);
    const used = Number(spendMap[cat] || 0);
    const pct = budgetAmt > 0 ? Math.min(100, (used / budgetAmt) * 100) : 0;
    const barClass = pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success';
    const note = budgetAmt > 0 ? `${used} / ${budgetAmt}` : `${used}`;
    const indicator = pct >= 100 ? 'indicator-red' : pct >= 80 ? 'indicator-yellow' : 'indicator-green';
    const badge = pct >= 100 ? '<span class="badge bg-danger">Over</span>' : pct >= 80 ? '<span class="badge bg-warning text-dark">High</span>' : '<span class="badge bg-success">OK</span>';
    return `
      <div class="cat-card">
        <div class="header">
          <div class="d-flex align-items-center gap-2">
            <span class="indicator-dot ${indicator}"></span>
            <strong>${cat}</strong>
            ${badge}
          </div>
          <div class="input-group input-group-sm" style="width: 180px;">
            <span class="input-group-text">₹</span>
            <input type="number" class="form-control" value="${budgetAmt}" onchange="saveCategoryBudget('${cat}', this.value)">
          </div>
        </div>
        <div class="meta">
          <span>Used</span>
          <span>${note}</span>
        </div>
        <div class="progress progress-thin">
          <div class="progress-bar ${barClass}" style="width:${pct.toFixed(0)}%"></div>
        </div>
      </div>`;
  }).join("");
  // Toast notifications for category thresholds (once per category+period per session)
  cats.forEach(cat => {
    const budgetAmt = Number(budgetsForPeriod[cat] || 0);
    if (!budgetAmt) return;
    const used = Number(spendMap[cat] || 0);
    const pct = (used / budgetAmt) * 100;
    notifyCategoryBudgetThreshold(cat, pct);
  });
  // Category budgets influence recommendations too
  renderRecommendations();
}

// ---------------- Threshold Notifications ----------------
function notifyMainBudgetThreshold(percent) {
  try {
    const key = `mb_${budgetPeriod}`;
    const prev = sessionStorage.getItem(key) || "";
    if (percent >= 100 && prev !== "100") {
      showToast("Main budget reached or exceeded!", "danger");
      sessionStorage.setItem(key, "100");
    } else if (percent >= 80 && prev !== "80" && prev !== "100") {
      showToast("Main budget over 80% used.", "warning");
      sessionStorage.setItem(key, "80");
    } else if (percent < 80 && prev) {
      // reset when dropping below 80 (new session context)
      sessionStorage.removeItem(key);
    }
  } catch {}
}

function notifyCategoryBudgetThreshold(cat, percent) {
  try {
    const key = `cb_${budgetPeriod}_${cat}`;
    const prev = sessionStorage.getItem(key) || "";
    if (percent >= 100 && prev !== "100") {
      showToast(`Category ${cat} budget reached/exceeded!`, "danger");
      sessionStorage.setItem(key, "100");
    } else if (percent >= 80 && prev !== "80" && prev !== "100") {
      showToast(`Category ${cat} budget over 80% used.`, "warning");
      sessionStorage.setItem(key, "80");
    } else if (percent < 80 && prev) {
      sessionStorage.removeItem(key);
    }
  } catch {}
}

function saveCategoryBudget(cat, val) {
  const amt = Math.max(0, Number(val)||0);
  if (!categoryBudgets[budgetPeriod]) categoryBudgets[budgetPeriod] = {};
  categoryBudgets[budgetPeriod][cat] = amt;
  localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
  renderCategoryBudgets();
  renderRecommendations();
}

// Create a new custom category (budget-only)
// (new category creation removed)

// ---------------- Category Auto-Fill ----------------
function onCatAutoToggle(enabled) {
  catAuto.enabled = !!enabled;
  localStorage.setItem('catAuto', JSON.stringify(catAuto));
  if (catAuto.enabled) autoAssignCategoryBudgets();
}

function onCatAutoModeChange(mode) {
  catAuto.mode = mode === 'proportional' ? 'proportional' : 'last_period';
  localStorage.setItem('catAuto', JSON.stringify(catAuto));
  if (catAuto.enabled) autoAssignCategoryBudgets();
}

function autoAssignCategoryBudgets() {
  const budgetsForPeriod = categoryBudgets[budgetPeriod] || {};
  let newBudgets = {};
  if (catAuto.mode === 'proportional') {
    // Split main budget across categories in proportion to their current period share
    const mainBudget = Number(document.getElementById('budgetAmount')?.value || 0);
    if (mainBudget <= 0) return;
    const start = getPeriodStart(budgetPeriod);
    const sums = {};
    let total = 0;
    expensesCache.forEach(e=>{ const d=new Date(e.date); if(!isNaN(d) && d>=start){ const k=e.type||'Other'; const amt=Number(e.amount||0); sums[k]=(sums[k]||0)+amt; total+=amt; }});
    if (total <= 0) return;
    Object.keys(sums).forEach(k=>{ newBudgets[k] = Math.round((sums[k]/total) * mainBudget); });
  } else {
    // Use last period's actual spend as this period's per-category budgets
    const lastStart = getPrevPeriodStart(budgetPeriod);
    const lastEnd = getPeriodStart(budgetPeriod);
    const sums = {};
    expensesCache.forEach(e=>{ const d=new Date(e.date); if(!isNaN(d) && d>=lastStart && d<lastEnd){ const k=e.type||'Other'; const amt=Number(e.amount||0); sums[k]=(sums[k]||0)+amt; }});
    Object.keys(sums).forEach(k=>{ newBudgets[k] = Math.round(sums[k]); });
  }

  categoryBudgets[budgetPeriod] = { ...budgetsForPeriod, ...newBudgets };
  localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
  renderCategoryBudgets();
}

function getPrevPeriodStart(period) {
  const now = new Date();
  if (period === 'weekly') {
    const curr = getPeriodStart('weekly');
    const prev = new Date(curr);
    prev.setDate(curr.getDate() - 7);
    return prev;
  }
  // monthly
  const firstCurr = new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(firstCurr.getFullYear(), firstCurr.getMonth()-1, 1);
}

// expose handlers to global
window.onCatAutoToggle = onCatAutoToggle;
window.onCatAutoModeChange = onCatAutoModeChange;

function getPeriodStart(period) {
  const now = new Date();
  if ((period||'monthly') === 'weekly') {
    const day = now.getDay();
    const diff = (day+6)%7;
    const start = new Date(now);
    start.setDate(now.getDate()-diff);
    start.setHours(0,0,0,0);
    return start;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ---------------- Recommendations & Tips ----------------
// Compute total spending and category map for the active period
function computePeriodSpending() {
  const start = getPeriodStart(budgetPeriod);
  const totals = { total: 0, byCategory: {} };
  expensesCache.forEach(e => {
    const d = new Date(e.date);
    if (isNaN(d) || d < start) return;
    const amt = Number(e.amount||0);
    const cat = e.type || 'Other';
    totals.total += amt;
    totals.byCategory[cat] = (totals.byCategory[cat] || 0) + amt;
  });
  return totals;
}

function getMainBudgetUsageInfo() {
  const periodTotal = sumForPeriod(expensesCache, budgetPeriod);
  const b = Math.max(0, Number(budget)||0);
  const percent = b > 0 ? (periodTotal / b) * 100 : 0;
  return { periodTotal, budget: b, percent };
}

function getPeriodBounds(period) {
  const start = getPeriodStart(period);
  const end = new Date(start);
  if ((period||'monthly') === 'weekly') {
    end.setDate(start.getDate() + 6);
  } else {
    end.setMonth(start.getMonth() + 1);
    end.setDate(0); // last day of month
  }
  end.setHours(23,59,59,999);
  return { start, end };
}

function daysInfoForPeriod(period) {
  const { start, end } = getPeriodBounds(period);
  const now = new Date();
  const clampNow = now < start ? start : now > end ? end : now;
  const msInDay = 24*60*60*1000;
  const daysElapsed = Math.max(1, Math.floor((clampNow - start) / msInDay) + 1);
  const totalDays = Math.floor((end - start) / msInDay) + 1;
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  return { start, end, daysElapsed, totalDays, daysRemaining };
}

function averageDailySpend(period) {
  const { daysElapsed } = daysInfoForPeriod(period);
  const spent = sumForPeriod(expensesCache, period);
  return daysElapsed > 0 ? (spent / daysElapsed) : 0;
}

function requiredDailyCapToStayWithinBudget() {
  const { daysRemaining } = daysInfoForPeriod(budgetPeriod);
  const { periodTotal, budget: b } = getMainBudgetUsageInfo();
  if (b <= 0 || daysRemaining <= 0) return null;
  const remaining = Math.max(0, b - periodTotal);
  return remaining / daysRemaining;
}

function detectRecurringCharges(minOccurrences = 3) {
  const map = new Map();
  expensesCache.forEach(e => {
    const desc = String(e.description||'').trim().toLowerCase();
    if (!desc) return;
    const amt = Number(e.amount||0);
    if (!map.has(desc)) map.set(desc, []);
    map.get(desc).push(amt);
  });
  const rec = [];
  map.forEach((amts, desc) => {
    if (amts.length >= minOccurrences) {
      const avg = amts.reduce((s,a)=>s+a,0) / amts.length;
      const variance = amts.reduce((s,a)=>s + Math.pow(a-avg,2),0) / amts.length;
      const std = Math.sqrt(variance);
      // treat as recurring if values are fairly consistent
      if (std <= avg * 0.2) rec.push({ desc, avg: Math.round(avg) });
    }
  });
  // sort by avg descending and cap
  return rec.sort((a,b)=>b.avg-a.avg).slice(0,5);
}

function weekendSpikeAnalysis() {
  const start = getPeriodStart(budgetPeriod);
  let weekend = 0, weekendCount = 0, weekday = 0, weekdayCount = 0;
  expensesCache.forEach(e => {
    const d = new Date(e.date);
    if (isNaN(d) || d < start) return;
    const amt = Number(e.amount||0);
    const day = d.getDay();
    if (day === 0 || day === 6) { weekend += amt; weekendCount++; }
    else { weekday += amt; weekdayCount++; }
  });
  const avgWeekend = weekendCount ? weekend / weekendCount : 0;
  const avgWeekday = weekdayCount ? weekday / weekdayCount : 0;
  return { avgWeekend, avgWeekday };
}

// Build overspending input snapshot from current state
function buildOverspendInput() {
  const start = getPeriodStart(budgetPeriod);
  // budgets per category (current period config)
  const budgetsForPeriod = categoryBudgets[budgetPeriod] || {};
  const budgets = { ...budgetsForPeriod };

  // expenses per category for current period
  const expenses = {};
  const counts = {}; // transaction counts per category
  expensesCache.forEach(e => {
    const d = new Date(e.date);
    if (isNaN(d) || d < start) return;
    const cat = e.type || 'Other';
    const amt = Number(e.amount||0);
    expenses[cat] = (expenses[cat] || 0) + amt;
    counts[cat] = (counts[cat] || 0) + 1;
  });

  // Patterns
  const patterns = {};
  // Dining Out frequency and avg per visit
  if (counts['Dining Out']) {
    const { daysElapsed } = daysInfoForPeriod(budgetPeriod);
    const weeklyMultiplier = 7 / Math.max(1, daysElapsed);
    patterns.frequentDiningOut = {
      timesPerWeek: Math.round(counts['Dining Out'] * weeklyMultiplier),
      avgPerVisit: Math.round((expenses['Dining Out'] || 0) / Math.max(1, counts['Dining Out']))
    };
  }
  // Impulse shopping (late night not tracked -> fallback counts)
  patterns.impulseShopping = { lateNightCount: 0, returnsCount: 0 };

  // Subscriptions via recurring charges detection
  const recurring = detectRecurringCharges(3);
  if (recurring.length) {
    patterns.subscriptions = {
      recurringVendors: recurring.map(r => ({ name: r.desc, usedThisMonth: true, amount: r.avg }))
    };
  }

  // Weekend spike
  const ws = weekendSpikeAnalysis();
  patterns.weekendSpike = { weekendAvg: ws.avgWeekend, weekdayAvg: ws.avgWeekday };

  // Transport rides
  if (counts['Transport']) {
    const { daysElapsed } = daysInfoForPeriod(budgetPeriod);
    const weeklyMultiplier = 7 / Math.max(1, daysElapsed);
    patterns.travelRides = {
      avgPerRide: Math.round((expenses['Transport'] || 0) / Math.max(1, counts['Transport'])),
      ridesPerWeek: Math.round(counts['Transport'] * weeklyMultiplier)
    };
  }

  return { budgets, expenses, patterns };
}

// Highly specific, action-focused tips for overspending
function generateOverspendRecommendations(data) {
  const { budgets = {}, expenses = {}, patterns = {} } = data || {};
  const tips = [];
  const pct = (used, bud) => bud > 0 ? (used / bud) * 100 : 0;
  const isOver = (used, bud, thresh = 100) => bud > 0 && (used / bud) * 100 >= thresh;

  const push = (title, action) => tips.push(`${title}: ${action}`);
  const capTo = (remaining, days) => days > 0 ? Math.max(0, Math.round(remaining / days)) : 0;

  // Dining Out
  if (expenses['Dining Out'] != null && budgets['Dining Out'] != null) {
    const used = expenses['Dining Out'], bud = budgets['Dining Out'];
    const p = pct(used, bud);
    const freq = patterns.frequentDiningOut?.timesPerWeek ?? null;
    const avgPerVisit = patterns.frequentDiningOut?.avgPerVisit ?? null;
    if (p >= 110 || (freq && freq > 4)) {
      const newFreq = freq ? Math.max(2, freq - 2) : 3;
      const perVisitCap = avgPerVisit ? Math.max(150, Math.round(avgPerVisit * 0.75)) : 300;
      push('Dining Out',
        `Cut visits from ${freq || '5+'} to ${newFreq} per week and cap per-visit to ₹${perVisitCap}. Prep 2 extra home meals this week (batch-cook once, reheat twice). Enable a weekly alert when Dining Out crosses 75% of its budget.`);
    }
  }

  // Groceries
  if (expenses.Groceries != null && budgets.Groceries != null) {
    const used = expenses.Groceries, bud = budgets.Groceries, p = pct(used, bud);
    if (p >= 90) {
      const remaining = Math.max(0, bud - used);
      const weeklyCap = capTo(remaining, 1);
      push('Groceries',
        `Switch 3 staple items to store-brand (rice, lentils, oil), make 1 bulk run only, and keep the next bill under ₹${weeklyCap}. Shop with a list; no mid-week top-ups.`);
    }
  }

  // Shopping (Impulse)
  if (expenses.Shopping != null && budgets.Shopping != null) {
    const used = expenses.Shopping, bud = budgets.Shopping, p = pct(used, bud);
    const late = patterns.impulseShopping?.lateNightCount ?? 0;
    if (p >= 100 || late >= 2) {
      push('Impulse Shopping',
        `Add a 24‑hour wait rule for any non-essential over ₹1000 and disable late‑night purchases for 7 days. Move 2 planned buys to next month and review your wishlist every Sunday.`);
    }
  }

  // Subscriptions
  const subs = patterns.subscriptions?.recurringVendors || [];
  const underused = subs.filter(s => s.usedThisMonth === false).sort((a, b) => b.amount - a.amount).slice(0, 3);
  if (underused.length) {
    const names = underused.map(s => s.name).join(', ');
    push('Streaming Subscriptions',
      `Cancel or pause underused subs: ${names}. Set a reminder to re‑evaluate in 30 days. If keeping any, downgrade to basic or switch to annual billing to save 10–20%.`);
  } else if (subs.length) {
    const names = subs.slice(0,3).map(s => s.name).join(', ');
    push('Subscriptions', `Recurring charges detected (${names}). Audit for any you can cancel or downgrade; set a reminder to re‑check in 30 days.`);
  }

  // Transport / Rides
  if (expenses.Transport != null && budgets.Transport != null) {
    const used = expenses.Transport, bud = budgets.Transport;
    const p = pct(used, bud);
    const rides = patterns.travelRides?.ridesPerWeek ?? null;
    const avgRide = patterns.travelRides?.avgPerRide ?? null;
    if (p >= 100 || (rides && rides > 6)) {
      const newRides = rides ? Math.max(3, rides - 2) : 4;
      const targetFare = avgRide ? Math.max(80, Math.round(avgRide * 0.8)) : 120;
      push('Transport',
        `Batch errands into fewer trips (target ${newRides}/week) and take off‑peak rides only. Aim for avg ₹${targetFare}/ride; if higher, switch to bus/metro twice a week.`);
    }
  }

  // Entertainment
  if (expenses.Entertainment != null && budgets.Entertainment != null) {
    const used = expenses.Entertainment, bud = budgets.Entertainment, p = pct(used, bud);
    if (p >= 100) {
      push('Entertainment',
        `Rotate paid services monthly (one at a time), and set a ₹${Math.round(bud * 0.2)} event cap per outing. Add two free events this month to replace one paid event.`);
    }
  }

  // Weekend spikes
  const w = patterns.weekendSpike;
  if (w?.weekdayAvg > 0 && w.weekendAvg >= w.weekdayAvg * 1.5) {
    const weekendCap = Math.round(w.weekdayAvg * 1.1);
    push('Weekend Overspend',
      `Pre‑plan low‑cost activities and set a weekend cap at ₹${weekendCap}. Disable food delivery notifications Fri‑Sun and prep one make‑ahead meal on Friday night.`);
  }

  // Motivation & tracking (optional visual cues)
  const microGoals = [];
  if (patterns.frequentDiningOut?.timesPerWeek) microGoals.push('Cook at home 6/8 times');
  if ((patterns.impulseShopping?.lateNightCount || 0) >= 2) microGoals.push('0 late-night carts this week');
  if (microGoals.length) {
    push('Progress Tracker',
      `Add micro-goals: ${microGoals.join(', ')}. Show a progress bar on the dashboard and mark completions to maintain streaks.`);
  }

  const seen = new Set();
  return tips.filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });
}

function generateRecommendations() {
  const recs = [];
  const { periodTotal, budget: b, percent } = getMainBudgetUsageInfo();
  const { byCategory } = computePeriodSpending();
  const budgetsForPeriod = categoryBudgets[budgetPeriod] || {};

  // Main budget usage tips
  if (b > 0) {
    if (percent >= 100) {
      recs.push(`You have reached/exceeded your ${budgetPeriod} budget. Pause non‑essential spending and review subscriptions.`);
    } else if (percent >= 90) {
      recs.push(`You're at ${percent.toFixed(0)}% of your ${budgetPeriod} budget. Consider delaying discretionary purchases.`);
    } else if (percent >= 80) {
      recs.push(`You're over 80% of your ${budgetPeriod} budget. Tighten variable costs like dining out or entertainment.`);
    } else if (percent <= 30 && periodTotal > 0) {
      recs.push(`Good pace so far: only ${percent.toFixed(0)}% of your ${budgetPeriod} budget used. Keep it steady!`);
    }
  } else {
    if (periodTotal > 0) recs.push(`No main budget set for ${budgetPeriod}. Set one to track progress and get better alerts.`);
  }

  // Pace and projection
  if (b > 0) {
    const avg = averageDailySpend(budgetPeriod);
    const { totalDays, daysRemaining } = daysInfoForPeriod(budgetPeriod);
    const projected = avg * totalDays;
    if (projected > b) {
      recs.push(`At your current pace (avg ₹${avg.toFixed(0)}/day), projected spend is ₹${projected.toFixed(0)}, which exceeds your budget ₹${b}. Aim to cut daily spend by ₹${Math.max(0, (projected-b)/Math.max(1,daysRemaining)).toFixed(0)} for the remaining ${daysRemaining} day(s).`);
    } else {
      recs.push(`Current pace: ₹${avg.toFixed(0)}/day. Projected spend ₹${projected.toFixed(0)} vs budget ₹${b}. You're on track—maintain this pace for the remaining ${daysRemaining} day(s).`);
    }
    const cap = requiredDailyCapToStayWithinBudget();
    if (cap !== null) recs.push(`To stay within budget, keep daily spend under ₹${cap.toFixed(0)} for the rest of this ${budgetPeriod}.`);
  }

  // High‑spending categories
  const entries = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  const total = Math.max(1, periodTotal);
  entries.slice(0, 3).forEach(([cat, amt]) => {
    const share = (amt / total) * 100;
    if (share >= 20) {
      recs.push(`High spend in ${cat}: ₹${amt.toFixed(0)} (${share.toFixed(0)}% of period spend). Try setting a cap or cheaper alternatives.`);
    }
  });

  // Category budget adherence
  entries.forEach(([cat, used]) => {
    const catBudget = Number(budgetsForPeriod[cat] || 0);
    if (catBudget > 0) {
      const pct = (used / catBudget) * 100;
      if (pct >= 100) recs.push(`Category ${cat} exceeded its budget (₹${used.toFixed(0)} / ₹${catBudget.toFixed(0)}). Cut back this week/month.`);
      else if (pct >= 80) recs.push(`Category ${cat} at ${pct.toFixed(0)}% of its budget. Plan lower‑cost options for upcoming ${cat} expenses.`);
    } else if (used >= total * 0.15 && used >= 500) {
      recs.push(`Consider setting a budget for ${cat}. It's a significant share (₹${used.toFixed(0)}).`);
    }
  });

  // Category-specific heuristics
  const catTips = {
    'Dining Out': 'Plan meals and cook at home 3 more times per week to save 20–30%. Batch-cook and carry leftovers.',
    'Entertainment': 'Limit paid streaming to one service at a time, explore free events, and set a monthly cap.',
    'Groceries': 'Buy staples in bulk, switch to store brands, and use a list to avoid impulse purchases.',
    'Transport': 'Combine trips, use public transit or carpool twice a week to cut fuel/ride costs.',
    'Shopping': 'Use a 24-hour rule for non-essentials; track price drops and avoid impulse buys.',
    'Utilities': 'Audit your bills—negotiate plans, reduce phantom loads, and set thermostat schedules.',
    'Health': 'Compare pharmacies and consider generics when medically appropriate.',
    'Travel': 'Book off-peak and set fare alerts; use reward points strategically.'
  };
  entries.slice(0, 5).forEach(([cat, used]) => {
    const msg = catTips[cat];
    if (msg && used >= total * 0.1) recs.push(`${cat}: ${msg}`);
  });

  // Recurring charges detection
  const recurring = detectRecurringCharges(3);
  if (recurring.length) {
    const top = recurring.slice(0,3).map(r=>r.desc).join(', ');
    recs.push(`Recurring charges detected (${top}). Audit and cancel unused subscriptions or negotiate lower rates.`);
  }

  // Weekend spikes
  const { avgWeekend, avgWeekday } = weekendSpikeAnalysis();
  if (avgWeekday > 0 && avgWeekend >= avgWeekday * 1.5) {
    recs.push(`Weekend spending spike: avg ₹${avgWeekend.toFixed(0)} vs weekday ₹${avgWeekday.toFixed(0)}. Plan low-cost weekend activities.`);
  }

  // Filter‑aware nudge based on visible list
  try {
    const visibleTotal = (Array.isArray(currentFiltered) ? currentFiltered : []).reduce((s,e)=>s+Number(e.amount||0),0);
    if (visibleTotal > 0 && visibleTotal >= periodTotal * 0.5 && currentFiltered.length > 0) {
      recs.push(`Your current filter covers ₹${visibleTotal.toFixed(0)} (about ${(visibleTotal/Math.max(1,periodTotal)*100).toFixed(0)}% of period spend). Focus on trimming these first.`);
    }
  } catch {}

  // General evergreen tips
  if (!Object.keys(budgetsForPeriod).length && Object.keys(byCategory).length >= 2) {
    recs.push(`Set category budgets to prevent over‑spending in frequent categories.`);
  }
  recs.push(`Review recurring charges (subscriptions, memberships) to eliminate unused ones.`);

  // Deduplicate while preserving order
  const seen = new Set();
  return recs.filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });
}

function renderRecommendations() {
  const list = document.getElementById('recommendationsList');
  if (!list) return; // Do nothing if section not present on page
  const overspendInput = buildOverspendInput();
  const overspendTips = generateOverspendRecommendations(overspendInput);
  const genericTips = generateRecommendations();
  // Merge with overspend-specific tips prioritized first
  const tips = [...overspendTips, ...genericTips];
  // Empty state
  if (!tips.length) {
    list.innerHTML = '<li class="text-muted">No tips yet. Add more expenses or set budgets to see recommendations.</li>';
    return;
  }
  // Deduplicate final tips while preserving order
  const seen = new Set();
  const finalTips = tips.filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });
  list.innerHTML = finalTips.map(t => `<li class="list-item">${t}</li>`).join('');
}
