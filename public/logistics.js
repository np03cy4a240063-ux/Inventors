document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
    const tabs = document.querySelectorAll('.table-tab');
    const tableBody = document.getElementById('logisticsTableBody');
    const searchInput = document.querySelector('.table-search input');

    let orders = [];

    async function fetchAllOrders() {
        try {
            const [respSales, respPurchase] = await Promise.all([
                fetch(`${API_BASE}/api/sales_orders`),
                fetch(`${API_BASE}/api/purchase_orders`)
            ]);
            
            const sales = await respSales.json();
            const purchase = await respPurchase.json();

            orders = [
                ...sales.map(o => ({ ...o, type: 'Sales Order', category: 'sales', amount: `Rs. ${Number(o.total).toLocaleString()}`, id: o.order_id, email: 'customer@reinvent.io', items: o.items_count })),
                ...purchase.map(o => ({ ...o, type: 'Purchase Order', category: 'purchase', amount: `Rs. ${Number(o.total).toLocaleString()}`, id: o.order_id, email: 'supplier@reinvent.io', items: o.items_count }))
            ];
            
            updateMetrics(sales, purchase);
            renderTable('sales');
            renderCalendar(orders);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }

    function updateMetrics(sales, purchase) {
        const pendingSales = sales.filter(o => o.status === 'PENDING');
        const pendingPurchases = purchase.filter(o => o.status === 'PENDING');
        const transitOrders = [...sales, ...purchase].filter(o => o.status === 'SHIPPED' || o.status === 'IN_TRANSIT');
        const completedOrders = [...sales, ...purchase].filter(o => o.status === 'COMPLETED');

        const salesVal = pendingSales.reduce((sum, o) => sum + Number(o.total), 0);
        const purchaseVal = pendingPurchases.reduce((sum, o) => sum + Number(o.total), 0);

        document.getElementById('pendingSalesCount').textContent = pendingSales.length;
        document.getElementById('pendingSalesValue').textContent = `- Rs. ${salesVal.toLocaleString()} total`;
        
        document.getElementById('pendingPurchaseCount').textContent = pendingPurchases.length;
        document.getElementById('pendingPurchaseValue').textContent = `- Rs. ${purchaseVal.toLocaleString()} total`;
        
        document.getElementById('transitCount').textContent = transitOrders.length;
        document.getElementById('completedCount').textContent = completedOrders.length;
    }

    fetchAllOrders();

    function renderTable(filterCategory = 'all', searchTerm = '') {
        tableBody.innerHTML = '';
        
        const filteredOrders = orders.filter(order => {
            const matchesCategory = filterCategory === 'all' || 
                                    (filterCategory === 'sales' && order.category === 'sales') ||
                                    (filterCategory === 'purchase' && order.category === 'purchase') ||
                                    (filterCategory === 'completed' && order.status === 'Completed');
            
            const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                order.customer.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesCategory && matchesSearch;
        });

        if (filteredOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94A3B8;">No orders found</td></tr>';
            return;
        }

        filteredOrders.forEach(order => {
            const statusClass = order.status.toLowerCase().replace(' ', '-');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <span class="order-id-cell">${order.id}</span>
                    <span class="order-type-label">${order.type}</span>
                </td>
                <td>
                    <span class="customer-name">${order.customer}</span>
                    <span class="customer-email">${order.email}</span>
                </td>
                <td>${order.items} items</td>
                <td>${order.date}</td>
                <td class="amount-cell">${order.amount}</td>
                <td><span class="status-badge ${statusClass}">${order.status}</span></td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderTable(tab.dataset.tab, searchInput.value);
        });
    });

    // Search Functionality
    searchInput.addEventListener('input', (e) => {
        const activeTab = document.querySelector('.table-tab.active').dataset.tab;
        renderTable(activeTab, e.target.value);
    });

    // Button Handlers
    const btnNewSales = document.querySelector('.btn-new-order.primary');
    const btnNewPurchase = document.querySelector('.btn-new-order.secondary');

    if (btnNewSales) {
        btnNewSales.addEventListener('click', () => {
            window.location.href = 'sales_orders.html';
        });
    }

    if (btnNewPurchase) {
        btnNewPurchase.addEventListener('click', () => {
            window.location.href = 'purchase_orders.html';
        });
    }

    // Calendar State
    let calendarDate = new Date();
    let selectedDate = new Date();
    let allOrdersData = [];

    // Calendar Generation Logic
    function renderCalendar(initialOrders) {
        if (initialOrders) allOrdersData = initialOrders;

        const calendarGrid = document.getElementById('calendarGrid');
        const scheduleTitle = document.getElementById('scheduleTitle');
        const scheduleList = document.getElementById('scheduleList');
        const upcomingList = document.getElementById('upcomingList');
        const calendarTitle = document.getElementById('calendarTitle');

        if (!calendarGrid || !scheduleList || !upcomingList) return;

        const today = new Date();
        const displayMonth = calendarDate.getMonth();
        const displayYear = calendarDate.getFullYear();

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        calendarTitle.innerHTML = `${monthNames[displayMonth]} ${displayYear} <div style="display: flex; gap: 10px; font-size: 0.8rem; color: #999; cursor:pointer;"><i class="fas fa-chevron-left" id="calPrevBtn"></i> <i class="fas fa-chevron-right" id="calNextBtn"></i></div>`;

        document.getElementById('calPrevBtn').onclick = () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendar();
        };

        document.getElementById('calNextBtn').onclick = () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendar();
        };

        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const selDay = selectedDate.getDate();
        const selMonth = selectedDate.getMonth();
        const selYear = selectedDate.getFullYear();

        const isToday = (selDay === today.getDate() && selMonth === today.getMonth() && selYear === today.getFullYear());
        scheduleTitle.textContent = isToday ? `Today, ${selDay} ${shortMonths[selMonth]}` : `${selDay} ${shortMonths[selMonth]} ${selYear}`;

        const labelsHTML = `
            <div class="calendar-day-label">SU</div>
            <div class="calendar-day-label">MO</div>
            <div class="calendar-day-label">TU</div>
            <div class="calendar-day-label">WE</div>
            <div class="calendar-day-label">TH</div>
            <div class="calendar-day-label">FR</div>
            <div class="calendar-day-label">SA</div>
        `;
        calendarGrid.innerHTML = labelsHTML;

        const firstDay = new Date(displayYear, displayMonth, 1).getDay();
        const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
        const prevDays = new Date(displayYear, displayMonth, 0).getDate();

        const ordersByDate = {};
        allOrdersData.forEach(o => {
            const dateObj = new Date(o.date);
            if(!isNaN(dateObj.getTime())) {
                const dateStr = dateObj.toISOString().split('T')[0];
                if (!ordersByDate[dateStr]) ordersByDate[dateStr] = [];
                ordersByDate[dateStr].push(o);
            }
        });

        // Prev month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const div = document.createElement('div');
            div.className = 'calendar-day';
            div.style.color = '#ccc';
            div.textContent = prevDays - i;
            div.style.cursor = 'pointer';
            div.onclick = () => {
                calendarDate.setMonth(calendarDate.getMonth() - 1);
                selectedDate = new Date(displayYear, displayMonth - 1, prevDays - i);
                renderCalendar();
            };
            calendarGrid.appendChild(div);
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day';
            
            if (i === selDay && displayMonth === selMonth && displayYear === selYear) {
                div.classList.add('active');
            }

            // Mark today with a distinct visual if it's not the selected date?
            // In the design, active is blue bg. Let's stick with that.
            
            div.textContent = i;
            div.style.cursor = 'pointer';
            
            const cellDateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            if (ordersByDate[cellDateStr] && ordersByDate[cellDateStr].length > 0) {
                const dot = document.createElement('span');
                dot.style.display = 'block';
                dot.style.width = '6px';
                dot.style.height = '6px';
                dot.style.borderRadius = '50%';
                dot.style.background = '#F59E0B';
                dot.style.margin = '2px auto 0';
                div.appendChild(dot);
            }
            
            div.onclick = () => {
                selectedDate = new Date(displayYear, displayMonth, i);
                renderCalendar();
            };

            calendarGrid.appendChild(div);
        }

        // Next month days
        const totalCells = firstDay + daysInMonth;
        const remainingCells = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= remainingCells; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day';
            div.style.color = '#ccc';
            div.textContent = i;
            div.style.cursor = 'pointer';
            div.onclick = () => {
                calendarDate.setMonth(calendarDate.getMonth() + 1);
                selectedDate = new Date(displayYear, displayMonth + 1, i);
                renderCalendar();
            };
            calendarGrid.appendChild(div);
        }

        // Populate Selected Date Schedule
        scheduleList.innerHTML = '';
        const selectedDateStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const scheduledOrders = ordersByDate[selectedDateStr] || [];
        
        if (scheduledOrders.length === 0) {
            scheduleList.innerHTML = '<div style="color: #94A3B8; text-align: center; padding: 20px 0; font-size: 0.9rem;">No scheduled logistics for this date.</div>';
        } else {
            scheduledOrders.forEach(o => {
                const colorClass = o.category === 'sales' ? 'yellow' : 'blue';
                const div = document.createElement('div');
                div.className = `schedule-item ${colorClass}`;
                div.innerHTML = `
                    <div class="schedule-time">Anytime</div>
                    <div class="schedule-desc">${o.id} — ${o.customer || o.supplier}</div>
                `;
                scheduleList.appendChild(div);
            });
        }

        // Populate Upcoming (always from today onwards)
        upcomingList.innerHTML = '';
        const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const todayObj = new Date(todayStr);
        const upcomingOrders = allOrdersData.filter(o => {
            const dStr = o.date.split('T')[0];
            const d = new Date(dStr);
            return d > todayObj && (o.status !== 'COMPLETED');
        }).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

        if (upcomingOrders.length === 0) {
            upcomingList.innerHTML = '<div style="color: #94A3B8; text-align: center; padding: 20px 0; font-size: 0.9rem;">No upcoming tasks.</div>';
        } else {
            upcomingOrders.forEach(o => {
                const dotClass = o.category === 'sales' ? 'dot-orange' : 'dot-green';
                const dateObj = new Date(o.date);
                const dStr = `${dateObj.getDate()} ${shortMonths[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                const div = document.createElement('div');
                div.className = 'upcoming-item';
                div.innerHTML = `
                    <div class="dot-indicator ${dotClass}"></div>
                    <div class="upcoming-info">
                        <h5>${o.id} ${o.category === 'sales' ? 'dispatch' : 'delivery'}</h5>
                        <p>${dStr} • ${o.customer || o.supplier || 'N/A'}</p>
                    </div>
                `;
                upcomingList.appendChild(div);
            });
        }
    }

    // Initial Render
    renderTable('sales'); // Match the screenshot's initial state
});
