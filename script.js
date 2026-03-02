const STORAGE_KEY = 'ledger_transactions';

let transactions = [];
let currentFilter = 'all';
let editingId = null;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount) {
  return '$' + parseFloat(amount).toFixed(2);
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  transactions = data ? JSON.parse(data) : [];
}

function calculateTotals() {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;

  document.getElementById('total-balance').textContent = formatAmount(balance);
  document.getElementById('total-income').textContent = formatAmount(income);
  document.getElementById('total-expense').textContent = formatAmount(expense);

  const balanceEl = document.getElementById('total-balance');
  if (balance < 0) {
    balanceEl.style.color = 'var(--expense)';
  } else {
    balanceEl.style.color = 'var(--text)';
  }
}

function renderTransactions() {
  const list = document.getElementById('transaction-list');
  const emptyState = document.getElementById('empty-state');

  const filtered = transactions.filter(t => {
    if (currentFilter === 'all') return true;
    return t.type === currentFilter;
  });

  const items = list.querySelectorAll('.transaction-item');
  items.forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  sorted.forEach(tx => {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.dataset.id = tx.id;

    const sign = tx.type === 'income' ? '+' : '-';

    item.innerHTML = `
      <span class="tx-dot ${tx.type}"></span>
      <div class="tx-info">
        <div class="tx-title">${escapeHtml(tx.title)}</div>
        <div class="tx-date">${formatDate(tx.createdAt)}</div>
      </div>
      <span class="tx-amount ${tx.type}">${sign}${formatAmount(tx.amount)}</span>
      <div class="tx-actions">
        <button class="tx-btn edit" data-id="${tx.id}" title="Edit">✎</button>
        <button class="tx-btn delete" data-id="${tx.id}" title="Delete">✕</button>
      </div>
    `;

    list.appendChild(item);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function updateUI() {
  calculateTotals();
  renderTransactions();
}

function resetForm() {
  document.getElementById('title').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('edit-id').value = '';
  document.getElementById('title').classList.remove('invalid');
  document.getElementById('amount').classList.remove('invalid');
  document.getElementById('title-error').classList.remove('visible');
  document.getElementById('amount-error').classList.remove('visible');

  setActiveType('income');

  editingId = null;
  document.getElementById('form-title-text').textContent = 'New Transaction';
  document.getElementById('submit-btn').textContent = 'Add Transaction';
  document.getElementById('cancel-btn').classList.add('hidden');
}

function setActiveType(type) {
  document.getElementById('type').value = type;
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
}

function populateEditForm(tx) {
  document.getElementById('title').value = tx.title;
  document.getElementById('amount').value = tx.amount;
  document.getElementById('edit-id').value = tx.id;
  setActiveType(tx.type);

  editingId = tx.id;
  document.getElementById('form-title-text').textContent = 'Edit Transaction';
  document.getElementById('submit-btn').textContent = 'Save Changes';
  document.getElementById('cancel-btn').classList.remove('hidden');

  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateForm(title, amount) {
  let valid = true;

  if (!title.trim()) {
    document.getElementById('title').classList.add('invalid');
    document.getElementById('title-error').classList.add('visible');
    valid = false;
  } else {
    document.getElementById('title').classList.remove('invalid');
    document.getElementById('title-error').classList.remove('visible');
  }

  if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
    document.getElementById('amount').classList.add('invalid');
    document.getElementById('amount-error').classList.add('visible');
    valid = false;
  } else {
    document.getElementById('amount').classList.remove('invalid');
    document.getElementById('amount-error').classList.remove('visible');
  }

  return valid;
}

document.getElementById('transaction-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const title = document.getElementById('title').value;
  const amount = document.getElementById('amount').value;
  const type = document.getElementById('type').value;

  if (!validateForm(title, amount)) return;

  if (editingId) {
    const index = transactions.findIndex(t => t.id === editingId);
    if (index !== -1) {
      transactions[index].title = title.trim();
      transactions[index].amount = parseFloat(amount);
      transactions[index].type = type;
    }
  } else {
    transactions.push({
      id: generateId(),
      title: title.trim(),
      amount: parseFloat(amount),
      type: type,
      createdAt: new Date().toISOString()
    });
  }

  saveToStorage();
  updateUI();
  resetForm();
});

document.getElementById('cancel-btn').addEventListener('click', function() {
  resetForm();
});

document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    setActiveType(this.dataset.type);
  });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    currentFilter = this.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    renderTransactions();
  });
});

document.getElementById('transaction-list').addEventListener('click', function(e) {
  const btn = e.target.closest('.tx-btn');
  if (!btn) return;

  const id = btn.dataset.id;

  if (btn.classList.contains('delete')) {
    transactions = transactions.filter(t => t.id !== id);
    if (editingId === id) resetForm();
    saveToStorage();
    updateUI();
  }

  if (btn.classList.contains('edit')) {
    const tx = transactions.find(t => t.id === id);
    if (tx) populateEditForm(tx);
  }
});

loadFromStorage();
updateUI();