const API_BASE = 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    alert('Please sign in first.');
    window.location.href = '../auth/signin/signin.html';
    return;
  }

  // Fetch user profile to populate sidebar and header
  try {
    const userResp = await fetch(`${API_BASE}/api/user/profile`, {
      headers: getAuthHeaders()
    });
    if (userResp.ok) {
      const user = await userResp.json();
      
      // Update sidebar name
      const nameEl = document.getElementById('sidebarUserName');
      if (nameEl && user.firstName) {
        nameEl.textContent = user.firstName + ' ' + user.lastName;
      }
      
      // Update welcome message
      const welcomeEl = document.getElementById('welcomeMessage');
      if (welcomeEl && user.firstName) {
        welcomeEl.textContent = `Welcome back, ${user.firstName}! Let's get started.`;
      }
    }
  } catch (e) {
    console.log('Could not load user profile for sidebar.', e);
  }

  // Fetch dashboard data
  let products = [];
  let lowStock = [];
  let outOfStock = [];
  let inStock = [];
  let stats = { totalProducts: 0, stockValue: 0, totalUnits: 0 };
  let pendingSales = [];
  let pendingPurchases = [];

  try {
    const resp = await fetch(`${API_BASE}/api/dashboard`, {
      headers: getAuthHeaders()
    });
    if (resp.ok) {
      const data = await resp.json();
      products = data.products || [];
      lowStock = data.lowStock || [];
      outOfStock = data.outOfStock || [];
      stats = data.stats || stats;
      pendingSales = data.pendingSales || [];
      pendingPurchases = data.pendingPurchases || [];
      inStock = products.filter(p => Number(p.quantity) > Number(p.reorder_level));
    } else {
      throw new Error('API Error');
    }
  } catch (err) {
    console.log('Dashboard API error, using empty data.', err);
  }

  // Calculations
  const totalStockValue = stats.stockValue || 0;
  const totalRevenue = products.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.unit_price)), 0);
  const grossProfit = Math.round(totalRevenue * 0.3); // Estimate 30% margin

  // Update Top Summary Cards
  const statValues = document.querySelectorAll('.stat-value');
  if (statValues.length >= 4) {
    statValues[0].textContent = 'Rs. ' + totalRevenue.toLocaleString();
    statValues[1].textContent = 'Rs. ' + totalStockValue.toLocaleString();
    statValues[2].textContent = 'Rs. ' + grossProfit.toLocaleString();
    statValues[3].textContent = products.length.toLocaleString();
  }

  // Update Alert Box
  const alertEl = document.getElementById('dashboardAlert');
  if (alertEl) {
    alertEl.innerHTML = `${lowStock.length} products are below minimum stock threshold and ${outOfStock.length} items are out of stock. <a href="#">View inventory</a>.`;
    if (lowStock.length === 0 && outOfStock.length === 0) {
      document.querySelector('.alert-box').style.display = 'none';
    } else {
      document.querySelector('.alert-box').style.display = 'flex';
    }
  }

  // Render Product Movement (Top 4)
  const productListEl = document.getElementById('fastMovingProducts');
  if (productListEl) {
    productListEl.innerHTML = products.length === 0 ? '<p style="padding:20px; color:#94A3B8; font-weight:600;">No product data available yet.</p>' : '';
    const sorted = [...products].sort((a, b) => Number(b.quantity) - Number(a.quantity)).slice(0, 4);

    sorted.forEach(p => {
      const maxQty = sorted[0] ? Number(sorted[0].quantity) : 1;
      const mv = maxQty > 0 ? Math.round((Number(p.quantity) / maxQty) * 100) : 0;
      let barClass = 'low';
      if (mv > 80) barClass = 'high';
      else if (mv > 60) barClass = 'med';

      const row = document.createElement('div');
      row.className = 'product-row';
      row.innerHTML = `
        <div class="product-icon"><i class="fas fa-box"></i></div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-cat">${p.category_name || 'General'}</div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill ${barClass}" style="width: ${mv}%"></div>
          </div>
        </div>
        <div class="product-stat">
          <div class="stat-percent">${p.quantity}</div>
          <div class="stat-label">in stock</div>
        </div>
      `;
      productListEl.appendChild(row);
    });
  }

  // Render Stock Alerts Table
  const alertsTable = document.querySelector('#stockAlertsTable tbody');
  const warningBadge = document.querySelector('.warning-badge');
  const dangerBadge = document.querySelector('.danger-badge');

  if (warningBadge) warningBadge.textContent = `${lowStock.length} LOW STOCK`;
  if (dangerBadge) dangerBadge.textContent = `${outOfStock.length} OUT OF STOCK`;

  if (alertsTable) {
    alertsTable.innerHTML = '';
    const alertsList = [...outOfStock, ...lowStock].slice(0, 5);

    if (alertsList.length === 0) {
      alertsTable.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px; color:#94A3B8; font-weight:600;">No critical stock alerts. Your inventory is healthy!</td></tr>';
    }

    alertsList.forEach(p => {
      const row = document.createElement('tr');
      let badgeHTML = '';
      let stockClass = '';
      const sVal = Number(p.quantity);
      const mVal = Number(p.reorder_level);

      if (sVal === 0) {
        stockClass = 'qty-danger';
        badgeHTML = '<span class="status-badge out-of-stock">OUT OF STOCK</span>';
      } else {
        stockClass = 'qty-warning';
        badgeHTML = '<span class="status-badge low-stock">LOW STOCK</span>';
      }

      row.innerHTML = `
        <td>
          <strong>${p.name}</strong>
          <span class="sku-text">SKU: ${p.sku}</span>
        </td>
        <td class="sku-text">${p.sku}</td>
        <td>${p.category_name || 'General'}</td>
        <td class="${stockClass}">${sVal} units</td>
        <td>${mVal} units</td>
        <td>${badgeHTML}</td>
      `;
      alertsTable.appendChild(row);
    });
  }

  // Update Stock Health Donut Chart
  const ctxHealth = document.getElementById('stockHealthChart');
  if (ctxHealth) {
    const total = products.length || 1;
    const healthyPercent = Math.round((inStock.length / total) * 100);
    const donutPercent = document.querySelector('.donut-percent');
    if (donutPercent) donutPercent.textContent = healthyPercent + '%';

    // Update Legend
    const legendVals = document.querySelectorAll('.donut-legend .val');
    if (legendVals.length >= 3) {
      legendVals[0].textContent = inStock.length;
      legendVals[1].textContent = lowStock.length;
      legendVals[2].textContent = outOfStock.length;
    }

    new Chart(ctxHealth, {
      type: 'doughnut',
      data: {
        labels: ['In Stock', 'Low Stock', 'Out of Stock'],
        datasets: [{
          data: [inStock.length, lowStock.length, outOfStock.length],
          backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        cutout: '80%',
        plugins: { legend: { display: false } }
      }
    });
  }

  // Revenue Chart
  const ctxRevenue = document.getElementById('revenueChart');
  if (ctxRevenue) {
    new Chart(ctxRevenue, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [totalRevenue * 0.6, totalRevenue * 0.8, totalRevenue * 0.7, totalRevenue * 0.9, totalRevenue * 0.85, totalRevenue],
          backgroundColor: '#5D7B9D',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => 'Rs.' + v.toLocaleString() } }
        }
      }
    });
  }
});
