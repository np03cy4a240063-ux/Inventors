document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    fetchAnalyticsData();

    async function fetchAnalyticsData() {
        try {
            const response = await fetch(`${API_BASE}/api/analytics`);
            const data = await response.json();
            
            renderMetrics(data.metrics[0]);
            renderStockHealth(data.stockHealth[0]);
            renderCategoryBreakdown(data.categoryBreakdown);
            renderTopSelling(data.topProducts);
            renderAgingStock(data.agingStock);
            renderCharts(); // Using dummy trend for demo, but real data for snapshots
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
    }

    function renderMetrics(metrics) {
        if (!metrics) return;
        document.getElementById('anaRevenue').textContent = `Rs. ${(metrics.revenue || 0).toLocaleString()}`;
        document.getElementById('anaProfit').textContent = `Rs. ${(metrics.gross_profit || 0).toLocaleString()}`;
        document.getElementById('anaUnits').textContent = (metrics.units_sold || 0).toLocaleString();
        
        const margin = metrics.revenue > 0 ? ((metrics.gross_profit / metrics.revenue) * 100).toFixed(1) : 0;
        document.getElementById('anaMargin').textContent = `${margin}%`;
        
        const aov = metrics.units_sold > 0 ? (metrics.revenue / metrics.units_sold).toFixed(0) : 0;
        document.getElementById('anaAOV').textContent = `Rs. ${parseInt(aov).toLocaleString()}`;
    }

    function renderStockHealth(health) {
        if (!health) return;
        // This updates the boxes in Aging Analysis summary for demo
    }

    function renderCategoryBreakdown(categories) {
        const container = document.getElementById('categoryProgressBars');
        container.innerHTML = '';
        
        if (!categories || categories.length === 0) return;

        const totalValue = categories.reduce((sum, cat) => sum + parseFloat(cat.value), 0);
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

        categories.forEach((cat, index) => {
            const percent = totalValue > 0 ? ((cat.value / totalValue) * 100).toFixed(0) : 0;
            const color = colors[index % colors.length];
            
            const item = document.createElement('div');
            item.className = 'cat-item';
            item.innerHTML = `
                <div class="cat-info">
                    <span>${cat.category || 'Uncategorized'}</span>
                    <span>Rs. ${parseFloat(cat.value).toLocaleString()} - ${percent}%</span>
                </div>
                <div class="cat-bar-bg">
                    <div class="cat-bar-fill" style="width: ${percent}%; background: ${color};"></div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    function renderTopSelling(products) {
        const list = document.getElementById('topSellingList');
        list.innerHTML = '';
        
        products.forEach((prod, index) => {
            const item = document.createElement('li');
            item.className = 'top-sell-item';
            item.innerHTML = `
                <div class="top-sell-info">
                    <span class="rank rank-${index + 1}">${index + 1}</span>
                    <span class="name">${prod.name}</span>
                </div>
                <span class="top-sell-qty">${prod.sold} sold</span>
            `;
            list.appendChild(item);
        });
    }

    function renderAgingStock(items) {
        const body = document.getElementById('agingTableBody');
        body.innerHTML = '';

        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.sku}</td>
                <td class="red-text">${item.days} DAYS</td>
                <td>${item.qty} units</td>
                <td>Rs. ${parseFloat(item.value).toLocaleString()}</td>
            `;
            body.appendChild(row);
        });
    }

    function renderCharts() {
        // Revenue vs Profit Chart
        const revCtx = document.getElementById('revProfitChart').getContext('2d');
        new Chart(revCtx, {
            type: 'line',
            data: {
                labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
                datasets: [
                    {
                        label: 'Revenue',
                        data: [45000, 52000, 48000, 61000, 58000, 84200],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Profit',
                        data: [15000, 18000, 16000, 21000, 20000, 28400],
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Stock In vs Out Chart
        const stockCtx = document.getElementById('stockInOutChart').getContext('2d');
        new Chart(stockCtx, {
            type: 'bar',
            data: {
                labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
                datasets: [
                    {
                        label: 'Stock In',
                        data: [1200, 1500, 1100, 1800, 1400, 2100],
                        backgroundColor: '#93C5FD',
                        borderRadius: 4
                    },
                    {
                        label: 'Stock Out',
                        data: [1000, 1300, 1200, 1600, 1500, 2381],
                        backgroundColor: '#F87171',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        });
    }


    function downloadCSV(data, filename) {
        const keys = Object.keys(data[0]);
        const csvContent = [
            keys.join(','),
            ...data.map(row => keys.map(k => `"${String(row[k]).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
