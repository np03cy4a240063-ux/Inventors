document.addEventListener('DOMContentLoaded', () => {
    // Inventory Data (10 products)
    let products = JSON.parse(localStorage.getItem('reinvent_products'));
    if (!products) {
        products = [
            { id: 1, name: 'Round Hair Brush', sku: 'SKU-001', category: 'Beauty', stock: 45, min: 20, movement: 87, icon: 'fa-magic', lastSold: 'Today' },
            { id: 2, name: 'Hair Serum', sku: 'SKU-002', category: 'Beauty', stock: 30, min: 15, movement: 66, icon: 'fa-pump-medical', lastSold: 'Today' },
            { id: 3, name: 'Disposable Gloves', sku: 'SKU-003', category: 'General Purpose', stock: 200, min: 100, movement: 65, icon: 'fa-hands-wash', lastSold: 'Yesterday' },
            { id: 4, name: 'Detangling Comb', sku: 'SKU-004', category: 'Beauty', stock: 65, min: 25, movement: 81, icon: 'fa-stream', lastSold: 'Today' },
            { id: 5, name: 'Towels', sku: 'SKU-005', category: 'General Purpose', stock: 120, min: 50, movement: 92, icon: 'fa-bath', lastSold: '2 days ago' },
            { id: 6, name: 'Flat Hair Brush', sku: 'SKU-0285', category: 'Beauty', stock: 5, min: 20, movement: 45, icon: 'fa-paint-brush', lastSold: 'Yesterday' },
            { id: 7, name: 'Wet Wipes', sku: 'SKU-0314', category: 'General Purpose', stock: 0, min: 15, movement: 30, icon: 'fa-box', lastSold: '3 days ago' },
            { id: 8, name: 'Pomade', sku: 'SKU-1121', category: 'Beauty', stock: 12, min: 8, movement: 55, icon: 'fa-spray-can', lastSold: 'Today' },
            { id: 9, name: 'Hair clips', sku: 'SKU-6721', category: 'Accessories', stock: 9, min: 20, movement: 60, icon: 'fa-paperclip', lastSold: '2 days ago' },
            { id: 10, name: 'Shaving Gel', sku: 'SKU-8921', category: 'Beauty', stock: 4, min: 10, movement: 40, icon: 'fa-spray-can', lastSold: 'Yesterday' }
        ];
        localStorage.setItem('reinvent_products', JSON.stringify(products));
    }

    // Identify problem stock
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.min);
    const outOfStock = products.filter(p => p.stock === 0);

    // 1. Render Product Movement
    const fastMoving = [...products].sort((a,b) => b.movement - a.movement).slice(0, 4);
    const productListEl = document.getElementById('fastMovingProducts');
    
    fastMoving.forEach(p => {
        let barClass = 'low';
        if(p.movement > 80) barClass = 'high';
        else if (p.movement > 60) barClass = 'med';

        const row = document.createElement('div');
        row.className = 'product-row';
        row.innerHTML = `
            <div class="product-icon"><i class="fas ${p.icon}"></i></div>
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-cat">${p.category}</div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill ${barClass}" style="width: ${p.movement}%"></div>
                </div>
            </div>
            <div class="product-stat">
                <div class="stat-percent">${p.movement}%</div>
                <div class="stat-label">sold this mth</div>
            </div>
        `;
        productListEl.appendChild(row);
    });

    // 2. Render Stock Alerts
    const alertsTable = document.querySelector('#stockAlertsTable tbody');
    const alertsList = [...lowStock, ...outOfStock].sort((a,b) => a.stock - b.stock);
    
    alertsList.forEach(p => {
        const row = document.createElement('tr');
        
        let stockClass = '';
        let badgeHTML = '';
        
        if (p.stock === 0) {
            stockClass = 'qty-danger';
            badgeHTML = '<span class="status-badge out-of-stock">OUT OF STOCK</span>';
        } else if (p.stock < p.min && p.stock < 10) {
             stockClass = 'qty-danger';
             badgeHTML = '<span class="status-badge buy-stock">BUY NEW STOCK</span>';
        } else {
            stockClass = 'qty-warning';
            badgeHTML = '<span class="status-badge low-stock">LOW STOCK</span>';
        }

        row.innerHTML = `
            <td>
                <strong>${p.name}</strong>
                <span class="sku-text">Last sold: ${p.lastSold}</span>
            </td>
            <td class="sku-text">${p.sku}</td>
            <td>${p.category}</td>
            <td class="${stockClass}">${p.stock} units</td>
            <td>${p.min} units</td>
            <td>${badgeHTML}</td>
        `;
        alertsTable.appendChild(row);
    });

    // 3. Render Revenue Bar Chart
    const revCtx = document.getElementById('revenueChart');
    if (revCtx) {
        new Chart(revCtx, {
            type: 'bar',
            data: {
                labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
                datasets: [
                    {
                        label: 'Revenue',
                        data: [45000, 60000, 58000, 75000, 62000, 84250],
                        backgroundColor: '#8da6ff',
                        borderRadius: 6,
                        barPercentage: 0.8
                    },
                    {
                        label: 'Target',
                        data: [50000, 50000, 60000, 65000, 70000, 75000],
                        backgroundColor: '#f6b976',
                        borderRadius: 6,
                        barPercentage: 0.8,
                        hidden: true // Just keep it in legend, UI looks mostly single blue bars but with legend
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'rectRounded' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        display: false
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 4. Render Stock Health Donut Chart
    const donutCtx = document.getElementById('stockHealthChart');
    if (donutCtx) {
        new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['In Stock', 'Low Stock', 'Out of Stock'],
                datasets: [{
                    data: [74, 15, 11], // Roughly matching 924, 186, 138
                    backgroundColor: ['#2ECC71', '#F1C40F', '#E74C3C'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }
});
