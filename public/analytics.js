document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : `http://${window.location.hostname}:5000`;

    // Chart instances — kept so we can destroy before re-render if needed
    let revProfitChartInst = null;
    let stockInOutChartInst = null;

    fetchAnalyticsData();

    async function fetchAnalyticsData() {
        try {
            const response = await fetch(`${API_BASE}/api/analytics`);
            if (!response.ok) throw new Error('API error ' + response.status);
            const data = await response.json();

            renderMetrics(data.metrics?.[0]);
            renderAgingBuckets(data.agingBuckets?.[0]);
            renderCategoryBreakdown(data.categoryBreakdown || []);
            renderTopSelling(data.topProducts || []);
            renderAgingTable(data.agingStock || []);
            renderBottomCards(data);
            renderCharts(data);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
    }

    // ── Top metrics row ──────────────────────────────────────────────────────
    function renderMetrics(metrics) {
        if (!metrics) return;
        const revenue    = parseFloat(metrics.revenue)     || 0;
        const profit     = parseFloat(metrics.gross_profit) || 0;
        const unitsSold  = parseInt(metrics.units_sold)    || 0;
        const margin     = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
        const aov        = unitsSold > 0 ? (revenue / unitsSold).toFixed(0) : 0;

        setText('anaRevenue', `Rs. ${revenue.toLocaleString()}`);
        setText('anaProfit',  `Rs. ${profit.toLocaleString()}`);
        setText('anaUnits',   unitsSold.toLocaleString());
        setText('anaMargin',  `${margin}%`);
        setText('anaAOV',     `Rs. ${parseInt(aov).toLocaleString()}`);
    }

    // ── Aging bucket summary boxes ───────────────────────────────────────────
    function renderAgingBuckets(buckets) {
        if (!buckets) return;
        const boxes = document.querySelectorAll('.aging-summary-row .age-box strong');
        if (boxes.length >= 4) {
            boxes[0].textContent = buckets.under30 ?? 0;
            boxes[1].textContent = buckets.d30_60  ?? 0;
            boxes[2].textContent = buckets.d60_90  ?? 0;
            boxes[3].textContent = buckets.over90  ?? 0;
        }
    }

    // ── Category breakdown progress bars ────────────────────────────────────
    function renderCategoryBreakdown(categories) {
        const container = document.getElementById('categoryProgressBars');
        if (!container) return;
        container.innerHTML = '';

        if (categories.length === 0) {
            container.innerHTML = '<p style="color:#94A3B8;font-size:13px;padding:10px 0;">No category data yet.</p>';
            return;
        }

        const totalValue = categories.reduce((sum, c) => sum + parseFloat(c.value || 0), 0);
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

        categories.forEach((cat, i) => {
            const pct = totalValue > 0 ? ((cat.value / totalValue) * 100).toFixed(1) : 0;
            const color = colors[i % colors.length];
            const item = document.createElement('div');
            item.className = 'cat-item';
            item.innerHTML = `
                <div class="cat-info">
                    <span>${cat.category || 'Uncategorized'}</span>
                    <span>Rs. ${parseFloat(cat.value).toLocaleString()} &mdash; ${pct}%</span>
                </div>
                <div class="cat-bar-bg">
                    <div class="cat-bar-fill" style="width:${pct}%;background:${color};"></div>
                </div>`;
            container.appendChild(item);
        });
    }

    // ── Top selling list ─────────────────────────────────────────────────────
    function renderTopSelling(products) {
        const list = document.getElementById('topSellingList');
        if (!list) return;
        list.innerHTML = '';

        if (products.length === 0) {
            list.innerHTML = '<li style="color:#94A3B8;font-size:13px;padding:10px 0;">No product data yet.</li>';
            return;
        }

        products.forEach((prod, i) => {
            const li = document.createElement('li');
            li.className = 'top-sell-item';
            li.innerHTML = `
                <div class="top-sell-info">
                    <span class="rank rank-${i + 1}">${i + 1}</span>
                    <span class="name">${prod.name}</span>
                </div>
                <span class="top-sell-qty">${prod.sold} units</span>`;
            list.appendChild(li);
        });
    }

    // ── Aging stock table ────────────────────────────────────────────────────
    function renderAgingTable(items) {
        const body = document.getElementById('agingTableBody');
        if (!body) return;
        body.innerHTML = '';

        if (items.length === 0) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#94A3B8;">No aging stock items (all products added within 30 days).</td></tr>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.sku}</td>
                <td class="red-text">${item.days} days</td>
                <td>${item.qty} units</td>
                <td>Rs. ${parseFloat(item.value || 0).toLocaleString()}</td>`;
            body.appendChild(row);
        });
    }

    // ── Bottom 4 metric cards ────────────────────────────────────────────────
    function renderBottomCards(data) {
        // 1. Dead Stock Value & count
        const dead = data.deadStock?.[0];
        const deadValue = parseFloat(dead?.dead_value || 0);
        const deadCount = parseInt(dead?.dead_count || 0);
        setText('deadStockValue', `Rs. ${deadValue.toLocaleString()}`);
        const deadSub = document.querySelector('#deadStockValue + .sub, [id="deadStockValue"] ~ .sub');
        // Find the sub element next to deadStockValue
        const deadCard = document.getElementById('deadStockValue');
        if (deadCard) {
            const subEl = deadCard.closest('.ana-mini-card')?.querySelector('.sub');
            if (subEl) subEl.textContent = `${deadCount} aging items`;
        }

        // 2. Inventory Turnover = COGS / current inventory value
        const turnRow = data.turnover?.[0];
        const cogs     = parseFloat(turnRow?.cogs || 0);
        const invValue = parseFloat(turnRow?.current_inventory_value || 1);
        const turnover = invValue > 0 ? (cogs / invValue).toFixed(1) : '0.0';
        setText('invTurnover', `${turnover}x`);
        const turnCard = document.getElementById('invTurnover');
        if (turnCard) {
            const subEl = turnCard.closest('.ana-mini-card')?.querySelector('.sub');
            if (subEl) {
                const t = parseFloat(turnover);
                subEl.className = `sub ${t >= 4 ? 'green-text' : t >= 2 ? '' : 'red-text'}`;
                subEl.innerHTML = t >= 4
                    ? '<i class="fas fa-caret-up"></i> Good rate'
                    : t >= 2
                        ? '<i class="fas fa-minus"></i> Average rate'
                        : '<i class="fas fa-caret-down"></i> Low rate';
            }
        }

        // 3. Avg Days to Sell — approximated from sales order history
        //    = total days between product creation and first sale / number of products sold
        //    We use a simpler proxy: if we have completed orders, estimate from order dates
        const monthlyRev = data.monthlyRevenue || [];
        const totalRevenue = parseFloat(data.metrics?.[0]?.revenue || 0);
        const unitsSold = parseInt(data.metrics?.[0]?.units_sold || 0);

        // Avg days to sell: use spread of sales dates if available
        let avgDays = 0;
        if (monthlyRev.length >= 2) {
            // Rough proxy: 180 days / number of months with sales
            const activeMonths = monthlyRev.filter(m => parseFloat(m.revenue) > 0).length;
            avgDays = activeMonths > 0 ? Math.round(180 / activeMonths) : 0;
        } else if (monthlyRev.length === 1) {
            avgDays = 30;
        }
        setText('avgDaysSell', avgDays > 0 ? `${avgDays} days` : '—');
        const avgCard = document.getElementById('avgDaysSell');
        if (avgCard) {
            const subEl = avgCard.closest('.ana-mini-card')?.querySelector('.sub');
            if (subEl) {
                if (avgDays > 0) {
                    subEl.className = `sub ${avgDays <= 21 ? 'green-text' : 'red-text'}`;
                    subEl.innerHTML = avgDays <= 21
                        ? '<i class="fas fa-caret-down"></i> Selling fast'
                        : '<i class="fas fa-caret-up"></i> Slow movement';
                } else {
                    subEl.className = 'sub';
                    subEl.textContent = 'No sales yet';
                }
            }
        }

        // 4. Stock Accuracy — ratio of in-stock products to total products
        const health = data.stockHealth?.[0];
        const totalProds = parseInt(health?.total_products || 0);
        const outOfStock = parseInt(health?.out_of_stock || 0);
        const accuracy = totalProds > 0
            ? (((totalProds - outOfStock) / totalProds) * 100).toFixed(1)
            : 100;
        setText('stockAccuracy', `${accuracy}%`);
        const accCard = document.getElementById('stockAccuracy');
        if (accCard) {
            const subEl = accCard.closest('.ana-mini-card')?.querySelector('.sub');
            if (subEl) {
                const today = new Date();
                subEl.textContent = `Last count: ${today.getDate()} ${today.toLocaleString('default', { month: 'short' })}`;
            }
        }
    }

    // ── Charts — Revenue vs Profit & Stock In vs Out ─────────────────────────
    function renderCharts(data) {
        // Build a 6-month label array ending at current month
        const labels = [];
        const monthMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            const label = d.toLocaleString('default', { month: 'short' });
            labels.push(label);
            monthMap[key] = { label, revenue: 0, profit: 0, stockIn: 0, stockOut: 0 };
        }

        // Fill revenue & profit from real data
        (data.monthlyRevenue || []).forEach(row => {
            const key = `${row.yr}-${row.mo}`;
            if (monthMap[key]) {
                monthMap[key].revenue = parseFloat(row.revenue) || 0;
                monthMap[key].profit  = parseFloat(row.profit)  || 0;
            }
        });

        // Fill stock-in from purchase orders
        (data.monthlyStockIn || []).forEach(row => {
            const key = `${row.yr}-${row.mo}`;
            if (monthMap[key]) {
                monthMap[key].stockIn = parseInt(row.qty_in) || 0;
            }
        });

        // Fill stock-out from completed sales orders
        (data.monthlyStockOut || []).forEach(row => {
            const key = `${row.yr}-${row.mo}`;
            if (monthMap[key]) {
                monthMap[key].stockOut = parseInt(row.qty_out) || 0;
            }
        });

        const months = Object.values(monthMap);
        const revenueData  = months.map(m => m.revenue);
        const profitData   = months.map(m => m.profit);
        const stockInData  = months.map(m => m.stockIn);
        const stockOutData = months.map(m => m.stockOut);

        // Revenue vs Profit chart
        const revCtx = document.getElementById('revProfitChart');
        if (revCtx) {
            if (revProfitChartInst) revProfitChartInst.destroy();
            revProfitChartInst = new Chart(revCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Revenue',
                            data: revenueData,
                            borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59,130,246,0.08)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#3B82F6'
                        },
                        {
                            label: 'Profit',
                            data: profitData,
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16,185,129,0.08)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#10B981'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.04)' },
                            ticks: {
                                callback: v => v >= 1000 ? `Rs.${(v/1000).toFixed(0)}k` : `Rs.${v}`
                            }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Stock In vs Out chart
        const stockCtx = document.getElementById('stockInOutChart');
        if (stockCtx) {
            if (stockInOutChartInst) stockInOutChartInst.destroy();
            stockInOutChartInst = new Chart(stockCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Stock In',
                            data: stockInData,
                            backgroundColor: '#93C5FD',
                            borderRadius: 4
                        },
                        {
                            label: 'Stock Out',
                            data: stockOutData,
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
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // ── Utility ──────────────────────────────────────────────────────────────
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
});
