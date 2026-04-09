console.log('REINVENT_V2_DASHBOARD_V4_ACTIVE');
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    
    // Inventory Data
    let products = [];
    try {
        const resp = await fetch(`${API_BASE}/api/products`);
        if (resp.ok) {
            products = await resp.json();
        } else {
            throw new Error('API Error');
        }
    } catch(err) {
        console.log('Falling back to local storage.');
        const localData = JSON.parse(localStorage.getItem('reinvent_adv_products'));
        if(localData) products = localData;
    }

    // Calculations
    const lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.min));
    const outOfStock = products.filter(p => Number(p.stock) === 0);
    const inStock = products.filter(p => Number(p.stock) > Number(p.min));

    const totalStockValue = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.cost)), 0);
    const totalRevenue = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.sell)), 0);
    const grossProfit = products.reduce((sum, p) => sum + (Number(p.stock) * (Number(p.sell) - Number(p.cost))), 0);

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
        alertEl.innerHTML = `${lowStock.length} products are below minimum stock threshold and ${outOfStock.length} items are out of stock. <a href="inventory.html">View inventory</a>.`;
        if (lowStock.length === 0 && outOfStock.length === 0) {
            document.querySelector('.alert-box').style.display = 'none';
        } else {
            document.querySelector('.alert-box').style.display = 'flex';
        }
    }

    // 1. Render Product Movement (Top 4)
    const productListEl = document.getElementById('fastMovingProducts');
    if (productListEl) {
        productListEl.innerHTML = products.length === 0 ? '<p style="padding:20px; color:#94A3B8; font-weight:600;">No product data available yet.</p>' : '';
        const sorted = [...products].sort((a,b) => (b.movement||0) - (a.movement||0)).slice(0, 4);
        
        sorted.forEach(p => {
            const mv = p.movement || 0;
            let barClass = 'low';
            if(mv > 80) barClass = 'high';
            else if (mv > 60) barClass = 'med';

            const row = document.createElement('div');
            row.className = 'product-row';
            row.innerHTML = `
                <div class="product-icon"><i class="fas ${p.icon || 'fa-box'}"></i></div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-cat">${p.category || 'General'}</div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill ${barClass}" style="width: ${mv}%"></div>
                    </div>
                </div>
                <div class="product-stat">
                    <div class="stat-percent">${mv}%</div>
                    <div class="stat-label">sold this mth</div>
                </div>
            `;
            productListEl.appendChild(row);
        });
    }

    // 2. Render Stock Alerts Table
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
            const sVal = Number(p.stock);
            const mVal = Number(p.min);

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
                <td>${p.category || 'General'}</td>
                <td class="${stockClass}">${sVal} units</td>
                <td>${mVal} units</td>
                <td>${badgeHTML}</td>
            `;
            alertsTable.appendChild(row);
        });
    }

    // 3. Update Stock Health Donut Chart
    const ctxHealth = document.getElementById('stockHealthChart');
    if (ctxHealth) {
        const total = products.length || 1;
        const healthyPercent = Math.round((inStock.length / total) * 100);
        document.querySelector('.donut-percent').textContent = healthyPercent + '%';
        
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
});
