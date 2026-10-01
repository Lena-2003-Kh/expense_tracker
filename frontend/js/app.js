const API_URL = "http://localhost:3000/api/expenses";

let allExpenses = [];
let currentFilter = "All";


const alertContainer = document.getElementById("alert-container");
const spinner = document.getElementById("spinner");
const tableBody = document.getElementById("expenses-table-body");
const addForm = document.getElementById("add-form");
const filterSelect = document.getElementById("filter-category");

const editModalEl = document.getElementById("editModal");
const editModal = new bootstrap.Modal(editModalEl);
const editForm = document.getElementById("edit-form");


const summaryTotal = document.getElementById("summary-total");
const summaryCount = document.getElementById("summary-count");
const summaryHighest = document.getElementById("summary-highest");

function showAlert(message, type = "danger") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type} alert-dismissible fade show`;

 
  const text = document.createElement("span");
  text.textContent = message;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-close";
  closeBtn.setAttribute("data-bs-dismiss", "alert");
  closeBtn.setAttribute("aria-label", "Close");
  alert.append(text, closeBtn);
  alertContainer.appendChild(alert);

  
  if (type === "success") {
    setTimeout(() => alert.remove(), 5000);
  }
}

function showSpinner() {
  spinner.classList.remove("d-none");
}

function hideSpinner() {
  spinner.classList.add("d-none");
}

async function fetchAPI(url, options = {}) {
  showSpinner();
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
       
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    
    if (error instanceof TypeError) {
      showAlert("Cannot connect to the server. Please check if the backend is running.");
    } else {
      showAlert(error.message);
    }
    throw error;
  } finally {
    hideSpinner();
  }
}

async function getExpenses() {
 
  alertContainer.querySelectorAll(".alert-danger").forEach(a => a.remove());
  try {
    const data = await fetchAPI(API_URL);
    allExpenses = data || [];
    renderSummary();
    applyFilter();
  } catch (e) {
    
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Could not load expenses.</td></tr>`;
  }
}


function validateForm(title, amount, category, date) {
  if (!title) return "Title is required.";
  if (isNaN(amount) || amount <= 0) return "Amount must be a number greater than zero.";
  if (!category) return "Please choose a category.";
  if (!date) return "Please choose a date.";
  return null;
}

async function addExpense(event) {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;

  const errorMessage = validateForm(title, amount, category, date);
  if (errorMessage) {
    showAlert(errorMessage);
    return;
  }

  const newExpense = { title, amount, category, date };

  try {
    await fetchAPI(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExpense)
    });

    addForm.reset();
    showAlert("Expense added successfully!", "success");
    await getExpenses();
  } catch (e) {
    
  }
}

async function deleteExpense(id) {
  if (!confirm("Are you sure you want to delete this expense?")) return;

  try {
    await fetchAPI(`${API_URL}/${id}`, {
      method: "DELETE"
    });
    showAlert("Expense deleted successfully!", "success");
    await getExpenses();
  } catch (e) {
   
  }
}

function openEditModal(id) {
  const expense = allExpenses.find(e => e.id === id);
  if (!expense) return;

  document.getElementById("edit-id").value = expense.id;
  document.getElementById("edit-title").value = expense.title;
  document.getElementById("edit-amount").value = expense.amount;
  document.getElementById("edit-category").value = expense.category;
  document.getElementById("edit-date").value = expense.date;

  editModal.show();
}

async function updateExpense(event) {
  event.preventDefault();

  const id = document.getElementById("edit-id").value;
  const title = document.getElementById("edit-title").value.trim();
  const amount = parseFloat(document.getElementById("edit-amount").value);
  const category = document.getElementById("edit-category").value;
  const date = document.getElementById("edit-date").value;

  const errorMessage = validateForm(title, amount, category, date);
  if (errorMessage) {
    showAlert(errorMessage);
    return;
  }

  const updatedExpense = { title, amount, category, date };

  try {
    await fetchAPI(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedExpense)
    });

    editModal.hide();
    showAlert("Expense updated successfully!", "success");
    await getExpenses();
  } catch (e) {
    
  }
}

function getCategoryBadgeClass(category) {
  switch (category) {
    case "Food": return "bg-warning text-dark";
    case "Transport": return "bg-info text-dark";
    case "Bills": return "bg-danger";
    case "Entertainment": return "bg-primary";
    case "Other": return "bg-secondary";
    default: return "bg-dark";
  }
}


function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderTable(list) {
  tableBody.innerHTML = "";

  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No expenses found.</td></tr>`;
    return;
  }

  list.forEach(expense => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHTML(expense.title)}</td>
      <td>$${expense.amount.toFixed(2)}</td>
      <td><span class="badge ${getCategoryBadgeClass(expense.category)}">${expense.category}</span></td>
      <td>${expense.date}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal(${expense.id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${expense.id})">Delete</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

function renderSummary() {
  const total = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const count = allExpenses.length;

  let highest = 0;
  if (count > 0) {
    highest = Math.max(...allExpenses.map(exp => exp.amount));
  }

  summaryTotal.textContent = `$${total.toFixed(2)}`;
  summaryCount.textContent = count;
  summaryHighest.textContent = `$${highest.toFixed(2)}`;
}

const searchInput = document.getElementById("search-title");
const exportCsvBtn = document.getElementById("btn-export-csv");
const darkModeToggle = document.getElementById("dark-mode-toggle");

let currentSortColumn = null;
let currentSortOrder = 'asc';

function applyFilter() {
  
  let filtered = [...allExpenses];

  if (currentFilter !== "All") {
    filtered = filtered.filter(e => e.category === currentFilter);
  }

  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    filtered = filtered.filter(e => e.title.toLowerCase().includes(searchTerm));
  }

  if (currentSortColumn) {
    filtered.sort((a, b) => {
      let valA = a[currentSortColumn];
      let valB = b[currentSortColumn];

      
      if (currentSortColumn === 'title' || currentSortColumn === 'category') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  renderTable(filtered);
}

function sortTable(column) {
  if (currentSortColumn === column) {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortColumn = column;
    currentSortOrder = 'asc';
  }
  applyFilter();
}

function exportToCsv() {
  if (allExpenses.length === 0) {
    showAlert("No data to export.", "warning");
    return;
  }

  const headers = ["ID", "Title", "Amount", "Category", "Date"];
  const rows = allExpenses.map(exp => [
    exp.id,
    `"${exp.title.replace(/"/g, '""')}"`,
    exp.amount,
    exp.category,
    exp.date
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "expenses.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

addForm.addEventListener("submit", addExpense);
editForm.addEventListener("submit", updateExpense);
filterSelect.addEventListener("change", (e) => {
  currentFilter = e.target.value;
  applyFilter();
});

searchInput.addEventListener("input", applyFilter);
exportCsvBtn.addEventListener("click", exportToCsv);
darkModeToggle.addEventListener("change", (e) => {
  document.body.classList.toggle("dark-mode", e.target.checked);
});

getExpenses();
